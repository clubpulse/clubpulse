// A small in-memory stand-in for the Supabase admin client, for tests that need filters (eq, in, not) to matter.
// Not Postgres: embedded selects return the row as stored, and `.not('a.b', ...)` on an embedded column is ignored, so
// fixture rows for embedded tables should already be the rows the real query would keep.
export type Row = Record<string, unknown>;
export const memdb = {
  tables: {} as Record<string, Row[]>,
  writes: [] as Array<{ table: string; op: string; row: unknown }>,
  reset(tables: Record<string, Row[]>) { this.tables = tables; this.writes = []; },
};

export function client() {
  return {
    from: (table: string) => {
      const f: Array<(r: Row) => boolean> = [];
      let single = false;
      let op: string | null = null;
      const c: Record<string, unknown> = {};
      c.select = () => c;
      c.eq = (k: string, v: unknown) => { f.push((r) => r[k] === v); return c; };
      c.neq = (k: string, v: unknown) => { f.push((r) => r[k] !== v); return c; };
      c.in = (k: string, vs: unknown[]) => { f.push((r) => vs.includes(r[k])); return c; };
      c.gt = (k: string, v: unknown) => { f.push((r) => String(r[k]) > String(v)); return c; };
      c.not = (k: string) => { if (!k.includes('.')) f.push((r) => r[k] != null); return c; };
      c.or = () => c; // not evaluated: fixtures for queries that use it should simply be empty or already narrowed
      c.order = () => c;
      c.limit = () => c;
      c.maybeSingle = () => { single = true; return c; };
      c.single = () => { single = true; return c; };
      for (const o of ['insert', 'update', 'upsert', 'delete']) c[o] = (row?: unknown) => { memdb.writes.push({ table, op: o, row }); op = o; return c; };
      c.then = (res: (v: unknown) => unknown) => {
        if (op === 'insert') return res({ data: single ? { id: 'new1' } : null, error: null });
        if (op) return res({ data: null, error: null });
        const rows = (memdb.tables[table] ?? []).filter((r) => f.every((fn) => fn(r)));
        return res({ data: single ? rows[0] ?? null : rows, count: rows.length, error: null });
      };
      return c;
    },
  };
}
