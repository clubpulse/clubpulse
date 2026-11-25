import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '../..');
const db = 'shiftup_view_rls_test';
const migrations = path.join(root, 'supabase/migrations');
const bootstrap = path.join(__dirname, 'sql/view-rls-bootstrap.sql');
const assertions = path.join(__dirname, 'sql/view-rls.sql');
const followUp = '20261125000001_view_rls_followup.sql';

function psql(database: string, args: string[]) {
  execFileSync('sudo', ['-u', 'postgres', 'psql', '-d', database, '-v', 'ON_ERROR_STOP=1', '-q', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

describe('view RLS against local Postgres', () => {
  jest.setTimeout(180000);

  it('applies the repo migrations and checks cards, the leaderboard, and admin functions', () => {
    psql('postgres', ['-c', `DROP DATABASE IF EXISTS ${db} WITH (FORCE)`]);
    psql('postgres', ['-c', `CREATE DATABASE ${db}`]);
    psql(db, ['-f', bootstrap]);

    const files = fs.readdirSync(migrations).filter((name) => name.endsWith('.sql')).sort();
    expect(files.at(-1)).toBe(followUp);
    for (const name of files) psql(db, ['-f', path.join(migrations, name)]);

    // A later broad grant must not put anon back on these views. Applying the follow-up again restores it.
    psql(db, ['-c', 'GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role']);
    psql(db, ['-f', path.join(migrations, followUp)]);
    psql(db, ['-f', assertions]);
  });
});
