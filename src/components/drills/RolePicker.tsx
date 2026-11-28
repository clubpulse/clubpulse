'use client';

import { setDrillRole } from '@/lib/actions/camera-drills';
import type { DrillRole } from '@/lib/camera-drills/plan';

export function RolePicker({ role }: { role: DrillRole }) {
  return (
    <form action={async (form) => { await setDrillRole(form.get('role')); }} className="flex items-center gap-2 text-sm">
      <label htmlFor="drill-role">Role</label>
      <select id="drill-role" name="role" defaultValue={role} className="rounded bg-neutral-900 px-2 py-1">
        <option value="either">Either</option>
        <option value="batter">Batter</option>
        <option value="bowler">Bowler</option>
      </select>
      <button type="submit" className="rounded-full border border-white/15 px-3 py-1">Save</button>
    </form>
  );
}
