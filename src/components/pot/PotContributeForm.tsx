'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { contributeToPot } from '@/lib/actions/community-pot';

export function PotContributeForm({ clubId }: { clubId: string }) {
  const [scores, setScores] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    const amount = parseInt(scores, 10);
    if (!amount || amount < 50) {
      setError('Minimum contribution is 50 Scores.');
      return;
    }
    startTransition(async () => {
      const result = await contributeToPot(clubId, amount);
      if (result.success) {
        setSuccess(`You added ${result.data.scores_contributed.toLocaleString()} Scores to the Community Pot!`);
        setScores('');
      } else {
        setError(result.error ?? 'Something went wrong.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        label="Scores to contribute"
        type="number"
        min={50}
        step={50}
        placeholder="e.g. 200"
        value={scores}
        onChange={(e) => setScores(e.target.value)}
        error={error}
      />
      {success && (
        <p className="rounded-lg bg-emerald-900/30 border border-emerald-800 px-3 py-2 text-sm text-emerald-300">
          🎉 {success}
        </p>
      )}
      <Button type="submit" loading={isPending} className="w-full">
        Add to Pot
      </Button>
      <p className="text-xs text-neutral-500 text-center">Minimum 50 Scores · Contributions are permanent</p>
    </form>
  );
}
