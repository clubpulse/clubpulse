import { duplicateVersions, parseMigrationFiles, parseRecordedVersions, plan, recordedWithoutFile, repairCommands, unrecorded } from '../../scripts/migration-history';

const files = parseMigrationFiles([
  '20261101000001_coaching_insights.sql', '20261103000001_analysis_results.sql', '20261122000011_profile_trigger.sql',
  '20261122000017_date_of_birth.sql', '20261122000018_junior_parent_approval.sql', 'README.md', 'notes.txt', '2026110_bad.sql',
]);

describe('migration history', () => {
  it('reads versions from real file names only, in order', () => {
    expect(files.map((f) => f.version)).toEqual(['20261101000001', '20261103000001', '20261122000011', '20261122000017', '20261122000018']);
    expect(files[0]).toEqual({ version: '20261101000001', name: 'coaching_insights', file: '20261101000001_coaching_insights.sql' });
  });
  it('finds versions in pasted query output of any shape, once each', () => {
    const pasted = 'version\n20261101000001\n20261101000001\n"20261103000001",\n| 20261122000011 |\n123456\n2026110100000123456';
    expect(parseRecordedVersions(pasted)).toEqual(['20261101000001', '20261103000001', '20261122000011']);
  });
  it('lists what is not recorded, and what is recorded with no file', () => {
    expect(unrecorded(files, ['20261101000001']).map((f) => f.version)).toEqual(['20261103000001', '20261122000011', '20261122000017', '20261122000018']);
    expect(recordedWithoutFile(files, ['20261101000001', '20250101000000'])).toEqual(['20250101000000']);
  });
  it('flags two files that share a version', () => {
    const dup = parseMigrationFiles(['20261122000020_a.sql', '20261122000020_b.sql', '20261122000021_c.sql']);
    expect(duplicateVersions(dup)).toEqual(['20261122000020']);
    expect(duplicateVersions(files)).toEqual([]);
  });

  const recorded = ['20261101000001'];
  it('marks nothing unless told what is applied', () => {
    expect(plan(files, recorded, {}).markApplied).toEqual([]);
    expect(plan(files, recorded, {}).leave).toHaveLength(4);
  });
  it('marks unrecorded versions up to --applied-through, minus --not-applied', () => {
    const p = plan(files, recorded, { appliedThrough: '20261122000018', notApplied: ['20261122000017'] });
    expect(p.markApplied).toEqual(['20261103000001', '20261122000011', '20261122000018']);
    expect(p.leave.map((f) => f.version)).toEqual(['20261122000017']);
  });
  it('never marks a version that is already recorded, or one beyond the cut-off, unless named', () => {
    const p = plan(files, ['20261101000001', '20261103000001'], { appliedThrough: '20261122000011' });
    expect(p.markApplied).toEqual(['20261122000011']);
    expect(plan(files, recorded, { appliedThrough: '20261103000001', alsoApplied: ['20261122000018'] }).markApplied).toEqual(['20261103000001', '20261122000018']);
  });
  it('reports versions that are not in the repo instead of guessing', () => {
    expect(plan(files, recorded, { alsoApplied: ['20990101000000'] }).unknown).toEqual(['20990101000000']);
  });
  it('prints repair commands in batches', () => {
    const v = Array.from({ length: 45 }, (_, i) => `2026112200${String(i).padStart(4, '0')}`);
    const cmds = repairCommands(v);
    expect(cmds).toHaveLength(3);
    expect(cmds[0]).toMatch(/^supabase migration repair --status applied (\d{14} ?){20}$/);
    expect(cmds[2].split(' ').slice(5)).toHaveLength(5);
  });
});
