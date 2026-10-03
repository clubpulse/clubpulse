'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { EarningCategory, EarningRules, SportConfig } from '@/lib/types/sport';

const CATEGORIES: EarningCategory[] = ['performance', 'participation', 'volunteering', 'organisation'];

export function SportConfigForm({ config, canEdit }: { config: SportConfig; canEdit: boolean }) {
  const router = useRouter();
  const [rules, setRules] = useState<EarningRules>(config.earning_rules);
  const [isActive, setIsActive] = useState(config.is_active);
  const [newMetric, setNewMetric] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function setValue(category: EarningCategory, metric: string, value: number) {
    setRules((current) => ({ ...current, [category]: { ...current[category], [metric]: value } }));
  }

  function removeMetric(category: EarningCategory, metric: string) {
    setRules((current) => {
      const { [metric]: _removed, ...rest } = current[category];
      void _removed;
      return { ...current, [category]: rest };
    });
  }

  function addMetric(category: EarningCategory) {
    const metric = (newMetric[category] ?? '').trim().toLowerCase().replace(/\s+/g, '_');
    if (!/^[a-z0-9_]{1,40}$/.test(metric)) {
      toast.error('Metric names use lowercase letters, numbers and underscores');
      return;
    }
    setValue(category, metric, 0);
    setNewMetric((current) => ({ ...current, [category]: '' }));
  }

  async function save() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/sport-configs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: config.id, earning_rules: rules, is_active: isActive }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? 'Could not save');
        return;
      }
      toast.success(`${config.display_name} rules saved`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      title={`${config.icon_emoji} ${config.display_name}`}
      action={<Badge tone={isActive ? 'green' : 'neutral'}>{isActive ? 'Active' : 'Inactive'}</Badge>}
    >
      <div className="grid gap-6 md:grid-cols-2">
        {CATEGORIES.map((category) => (
          <fieldset key={category} disabled={!canEdit} className="min-w-0">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-gold">{category}</legend>
            <ul className="space-y-1.5">
              {Object.entries(rules[category] ?? {}).map(([metric, value]) => (
                <li key={metric} className="flex items-center gap-2">
                  <span className="flex-1 truncate text-sm text-neutral-300">{metric.replace(/_/g, ' ')}</span>
                  <input
                    type="number" min={0} max={1000} step={1} value={value}
                    onChange={(e) => setValue(category, metric, Math.max(0, Math.min(1000, Math.round(Number(e.target.value) || 0))))}
                    aria-label={`${category} ${metric} Scores`}
                    className="w-20 rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-right text-sm text-white disabled:opacity-60"
                  />
                  {canEdit && (
                    <button type="button" onClick={() => removeMetric(category, metric)} aria-label={`Remove ${metric}`}
                      className="text-neutral-600 hover:text-red-400">×</button>
                  )}
                </li>
              ))}
            </ul>
            {canEdit && (
              <div className="mt-2 flex gap-2">
                <input
                  value={newMetric[category] ?? ''} onChange={(e) => setNewMetric((c) => ({ ...c, [category]: e.target.value }))}
                  placeholder="new metric" maxLength={40}
                  className="min-w-0 flex-1 rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-sm text-white placeholder-neutral-600"
                />
                <Button size="sm" variant="secondary" onClick={() => addMetric(category)}>Add</Button>
              </div>
            )}
          </fieldset>
        ))}
      </div>

      {canEdit ? (
        <div className="mt-6 flex items-center justify-between border-t border-neutral-800 pt-4">
          <label className="flex items-center gap-2 text-sm text-neutral-300">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 accent-red-800" />
            Sport is active
          </label>
          <Button onClick={save} loading={loading}>Save rules</Button>
        </div>
      ) : (
        <p className="mt-4 text-xs text-neutral-500">Read-only: only platform admins can change earning rules.</p>
      )}
    </Card>
  );
}
