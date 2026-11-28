// A small stateful stand-in for the Supabase admin client: updates and inserts really change the rows, and `.select()`
// after an update returns the rows that matched. Not Postgres: no joins, `select` columns are ignored.
/* eslint-disable @typescript-eslint/no-explicit-any */
export type Row = Record<string, any>;
export const statedb = {
  tables: {} as Record<string, Row[]>,
  reset(tables: Record<string, Row[]>) { this.tables = JSON.parse(JSON.stringify(tables)); },
  /** Set to a table name to make every query on it return an error, to test the failure paths */
  failOn: null as string | null,
};

export function statedbClient() {
  return {
    from: (table: string) => {
      const filters: Array<(r: Row) => boolean> = [];
      let op = 'select'; let payload: any; let single = false; let returning = false; let lim = Infinity;
      const run = () => {
        if (statedb.failOn === table) return { data: null, error: { message: 'boom' } };
        const rows = (statedb.tables[table] ??= []);
        if (op === 'insert') {
          const added: Row[] = [];
          for (const p of Array.isArray(payload) ? payload : [payload]) { const r = { id: `id-${Math.random().toString(36).slice(2)}`, ...p }; rows.push(r); added.push({ ...r }); }
          return { data: returning ? (single ? added[0] ?? null : added) : null, error: null };
        }
        if (op === 'upsert') {
          const p = payload as Row; const key = p.id !== undefined ? 'id' : 'user_id';
          const at = rows.findIndex((r) => r[key] === p[key]);
          if (at >= 0) Object.assign(rows[at], p); else rows.push({ ...p });
          return { data: null, error: null };
        }
        const hit = rows.filter((r) => filters.every((f) => f(r)));
        if (op === 'update') { for (const r of hit) Object.assign(r, payload); return { data: returning ? hit.map((r) => ({ ...r })) : null, error: null }; }
        const out = hit.slice(0, lim).map((r) => ({ ...r }));
        return { data: single ? out[0] ?? null : out, error: null };
      };
      const c: any = {
        select: () => { returning = true; return c; },
        eq: (k: string, v: unknown) => { filters.push((r) => r[k] === v); return c; },
        neq: (k: string, v: unknown) => { filters.push((r) => r[k] !== v); return c; },
        in: (k: string, vs: unknown[]) => { filters.push((r) => vs.includes(r[k])); return c; },
        is: (k: string, v: unknown) => { filters.push((r) => (v === null ? r[k] == null : r[k] === v)); return c; },
        contains: (k: string, vs: unknown[]) => { filters.push((r) => Array.isArray(r[k]) && vs.every((v) => r[k].includes(v))); return c; },
        gt: (k: string, v: unknown) => { filters.push((r) => r[k] != null && String(r[k]) > String(v)); return c; },
        lte: (k: string, v: unknown) => { filters.push((r) => r[k] != null && String(r[k]) <= String(v)); return c; },
        order: () => c,
        limit: (n: number) => { lim = n; return c; },
        maybeSingle: () => { single = true; return c; },
        single: () => { single = true; return c; },
        insert: (p: unknown) => { op = 'insert'; payload = p; return c; },
        update: (p: unknown) => { op = 'update'; payload = p; return c; },
        upsert: (p: unknown) => { op = 'upsert'; payload = p; return c; },
        then: (res: (v: unknown) => unknown) => res(run()),
      };
      return c;
    },
  };
}
