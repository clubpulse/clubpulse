// Compares the migration files in supabase/migrations with the versions Supabase has recorded as applied, and prints the
// `supabase migration repair` commands for the ones you confirm were applied by hand. It only prints. It never connects
// to a database and never runs anything. See supabase/MIGRATIONS.md.
//
//   1. In the Supabase SQL editor, run:  select version from supabase_migrations.schema_migrations order by version;
//      and save the output (copy as text or CSV) to a file, e.g. recorded.txt
//   2. npx tsx scripts/migration-history.ts --recorded recorded.txt
//   3. Once you have checked which of the unrecorded ones are really in the database:
//      npx tsx scripts/migration-history.ts --recorded recorded.txt --applied-through 20261122000018 --not-applied 20261122000012

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type MigrationFile = { version: string; name: string; file: string };

const FILE = /^(\d{14})_(.+)\.sql$/;

export function parseMigrationFiles(names: string[]): MigrationFile[] {
  return names
    .map((file) => ({ file, m: FILE.exec(file) }))
    .filter((x): x is { file: string; m: RegExpExecArray } => x.m !== null)
    .map(({ file, m }) => ({ version: m[1], name: m[2], file }))
    .sort((a, b) => a.version.localeCompare(b.version));
}

/** Two files with the same version cannot both be recorded; the CLI keeps one and the other is silently skipped. */
export function duplicateVersions(files: MigrationFile[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const f of files) (seen.has(f.version) ? dup : seen).add(f.version);
  return [...dup].sort();
}

/** Every 14-digit version in pasted query output (a column, CSV, a table). Anything else is ignored. */
export function parseRecordedVersions(text: string): string[] {
  return [...new Set(text.match(/(?<!\d)\d{14}(?!\d)/g) ?? [])].sort();
}

export function unrecorded(files: MigrationFile[], recorded: string[]): MigrationFile[] {
  const have = new Set(recorded);
  return files.filter((f) => !have.has(f.version));
}

/** Recorded in the database but with no file in the repo: usually a migration that was run from somewhere else. */
export function recordedWithoutFile(files: MigrationFile[], recorded: string[]): string[] {
  const have = new Set(files.map((f) => f.version));
  return recorded.filter((v) => !have.has(v));
}

export type Plan = { markApplied: string[]; leave: MigrationFile[]; unknown: string[] };

/**
 * Which unrecorded migrations to mark as applied: those at or before `appliedThrough`, plus any in `alsoApplied`, minus any
 * in `notApplied`. Only unrecorded versions that have a file are ever included. Everything else is left alone.
 */
export function plan(files: MigrationFile[], recorded: string[], opts: { appliedThrough?: string | null; alsoApplied?: string[]; notApplied?: string[] }): Plan {
  const todo = unrecorded(files, recorded);
  const known = new Set(files.map((f) => f.version));
  const unknown = [...(opts.alsoApplied ?? []), ...(opts.notApplied ?? [])].filter((v) => !known.has(v));
  const not = new Set(opts.notApplied ?? []);
  const also = new Set(opts.alsoApplied ?? []);
  const through = opts.appliedThrough ?? null;
  const mark = todo.filter((f) => !not.has(f.version) && ((through !== null && f.version <= through) || also.has(f.version)));
  const marked = new Set(mark.map((f) => f.version));
  return { markApplied: mark.map((f) => f.version), leave: todo.filter((f) => !marked.has(f.version)), unknown };
}

export function repairCommands(versions: string[], perCommand = 20): string[] {
  const out: string[] = [];
  for (let i = 0; i < versions.length; i += perCommand) out.push(`supabase migration repair --status applied ${versions.slice(i, i + perCommand).join(' ')}`);
  return out;
}

function arg(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}
const list = (v: string | undefined) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);

export function main(argv: string[]): number {
  const dir = arg(argv, '--dir') ?? join(process.cwd(), 'supabase', 'migrations');
  const recordedPath = arg(argv, '--recorded');
  if (!recordedPath) {
    console.error('Usage: npx tsx scripts/migration-history.ts --recorded <file> [--applied-through <version>] [--applied v1,v2] [--not-applied v1,v2]');
    return 2;
  }
  const files = parseMigrationFiles(readdirSync(dir));
  const recorded = parseRecordedVersions(readFileSync(recordedPath, 'utf8'));
  if (recorded.length === 0) { console.error(`No 14-digit versions found in ${recordedPath}. Did the query return rows?`); return 2; }

  const dup = duplicateVersions(files);
  if (dup.length) console.log(`WARNING: more than one file has the version ${dup.join(', ')}. Only one can be recorded. Rename one first.\n`);
  const extra = recordedWithoutFile(files, recorded);
  if (extra.length) console.log(`Recorded as applied but there is no file in the repo: ${extra.join(', ')}\n`);

  const todo = unrecorded(files, recorded);
  console.log(`${files.length} migration files, ${recorded.length} versions recorded, ${todo.length} files not recorded.`);
  const p = plan(files, recorded, { appliedThrough: arg(argv, '--applied-through') ?? null, alsoApplied: list(arg(argv, '--applied')), notApplied: list(arg(argv, '--not-applied')) });
  if (p.unknown.length) { console.error(`\nNot migration versions in this repo: ${p.unknown.join(', ')}. Nothing printed.`); return 2; }

  if (p.markApplied.length === 0) {
    console.log('\nNot recorded (check each one against the database before marking it):');
    for (const f of todo) console.log(`  ${f.version}  ${f.name}`);
    console.log('\nNothing is marked yet. Re-run with --applied-through <version> once you have confirmed they are in the database.');
    return 0;
  }
  console.log('\nRun these against the project, only after you have confirmed each of those migrations is really in the database:\n');
  for (const c of repairCommands(p.markApplied)) console.log(c);
  if (p.leave.length) {
    console.log('\nLeft alone (not marked). Do NOT mark these unless they are in the database; `supabase db push` would apply them:');
    for (const f of p.leave) console.log(`  ${f.version}  ${f.name}`);
  }
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
