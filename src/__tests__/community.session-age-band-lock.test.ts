import fs from 'fs';
import path from 'path';

const sql = fs.readFileSync(path.join(__dirname, '../../supabase/migrations/20261122000024_lock_session_age_band.sql'), 'utf8');
const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');

describe('lock session age band migration', () => {
  it('is a BEFORE UPDATE row trigger on community_sessions', () => {
    expect(code).toMatch(/CREATE TRIGGER community_sessions_lock_age_band\s+BEFORE UPDATE ON public\.community_sessions\s+FOR EACH ROW/);
  });

  it('raises only when the band changes and a signup exists for the session', () => {
    expect(code).toContain('NEW.age_band IS DISTINCT FROM OLD.age_band');
    expect(code).toMatch(/EXISTS \(SELECT 1 FROM public\.community_session_signups s WHERE s\.session_id = OLD\.id\)/);
    expect(code).toContain('RAISE EXCEPTION');
    expect(code).toContain('RETURN NEW');
  });

  it('pins search_path and takes execute away from client roles', () => {
    expect(code).toContain("SET search_path TO 'public'");
    expect(code).toMatch(/REVOKE ALL ON FUNCTION public\.community_lock_session_age_band\(\) FROM PUBLIC, anon, authenticated/);
  });

  it('is idempotent', () => {
    expect(code).toContain('CREATE OR REPLACE FUNCTION');
    expect(code).toContain('DROP TRIGGER IF EXISTS community_sessions_lock_age_band ON public.community_sessions');
  });

  it('is the only thing the app relies on: no app code updates age_band', () => {
    const root = path.join(__dirname, '..');
    const hits: string[] = [];
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) { if (e.name !== '__tests__') walk(p); }
        else if (/\.(ts|tsx)$/.test(e.name) && /\.update\(\s*\{[^}]*age_band/.test(fs.readFileSync(p, 'utf8'))) hits.push(p);
      }
    };
    walk(root);
    expect(hits).toEqual([]);
  });
});
