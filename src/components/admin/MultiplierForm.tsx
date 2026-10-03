'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { setMultiplier } from '@/lib/actions/admin';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const CONDITIONS = [
  { value: 'manual',       label: 'Manual' },
  { value: 'weather',      label: 'Weather (e.g. cold, wet conditions)' },
  { value: 'scarcity',     label: 'Scarcity (e.g. short of volunteers)' },
  { value: 'season_phase', label: 'Season phase (e.g. pre-season)' },
] as const;

export function MultiplierForm({ clubId }: { clubId: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [multiplier, setMultiplierValue] = useState('1.5');
  const [condition, setCondition] = useState<(typeof CONDITIONS)[number]['value']>('manual');
  const [from, setFrom] = useState('');
  const [until, setUntil] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    const result = await setMultiplier(clubId, {
      name,
      multiplier: Number(multiplier),
      condition_type: condition,
      active_from: from ? new Date(from).toISOString() : undefined,
      active_until: until ? new Date(until).toISOString() : null,
    });
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success('Multiplier created');
    setName('');
    setFrom('');
    setUntil('');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Wet-weather volunteer bonus" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Multiplier (0.1 to 5)" type="number" required min={0.1} max={5} step={0.05} value={multiplier}
          onChange={(e) => setMultiplierValue(e.target.value)} />
        <div>
          <label htmlFor="condition" className="mb-1.5 block text-sm font-medium text-neutral-300">Type</label>
          <select id="condition" value={condition} onChange={(e) => setCondition(e.target.value as typeof condition)}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white">
            {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Starts (optional)" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="Ends (optional)" type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} />
      </div>
      <Button type="submit" loading={loading} className="w-full">Create multiplier</Button>
    </form>
  );
}
