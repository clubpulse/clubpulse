'use client';

import { useState, useTransition } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { voteOnProposal } from '@/lib/actions/community-pot';
import type { PotProposal, ProposalStatus } from '@/lib/types/community-pot';

function StatusBadge({ status }: { status: ProposalStatus }) {
  const map: Record<ProposalStatus, { tone: 'green' | 'red' | 'gold' | 'neutral'; label: string }> = {
    voting:    { tone: 'gold',    label: '🗳️ Voting open' },
    approved:  { tone: 'green',   label: '✅ Approved' },
    rejected:  { tone: 'red',     label: '❌ Rejected' },
    funded:    { tone: 'green',   label: '💸 Funded' },
    cancelled: { tone: 'neutral', label: 'Cancelled' },
  };
  const { tone, label } = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}

function VotesBar({ votesFor, votesAgainst }: { votesFor: number; votesAgainst: number }) {
  const total = votesFor + votesAgainst;
  const pctFor = total > 0 ? Math.round((votesFor / total) * 100) : 50;
  const pctAgainst = 100 - pctFor;

  return (
    <div className="space-y-1">
      <div className="flex h-2 overflow-hidden rounded-full bg-neutral-800">
        {total > 0 && (
          <>
            <div className="bg-emerald-500 transition-all" style={{ width: `${pctFor}%` }} />
            <div className="bg-red-600 transition-all" style={{ width: `${pctAgainst}%` }} />
          </>
        )}
        {total === 0 && <div className="w-full bg-neutral-700" />}
      </div>
      <div className="flex justify-between text-xs text-neutral-500">
        <span className="text-emerald-400">{votesFor} for</span>
        <span className="text-red-400">{votesAgainst} against</span>
      </div>
    </div>
  );
}

function Countdown({ endsAt }: { endsAt: string }) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return <span className="text-xs text-neutral-500">Voting ended</span>;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  return (
    <span className="text-xs text-neutral-400">
      {days > 0 ? `${days}d ` : ''}{hours}h left to vote
    </span>
  );
}

export function ProposalCard({ proposal }: { proposal: PotProposal }) {
  const [myVote, setMyVote] = useState<'for' | 'against' | null>(proposal.my_vote ?? null);
  const [votesFor, setVotesFor] = useState(proposal.votes_for);
  const [votesAgainst, setVotesAgainst] = useState(proposal.votes_against);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const isOpen = proposal.status === 'voting' && new Date(proposal.voting_ends_at) > new Date();

  function handleVote(vote: 'for' | 'against') {
    setError('');
    startTransition(async () => {
      const result = await voteOnProposal(proposal.id, vote);
      if (result.success) {
        const prev = myVote;
        setMyVote(vote);
        // Optimistic update to vote counts
        if (prev === 'for') setVotesFor((v) => v - 1);
        if (prev === 'against') setVotesAgainst((v) => v - 1);
        if (vote === 'for') setVotesFor((v) => v + 1);
        if (vote === 'against') setVotesAgainst((v) => v + 1);
      } else {
        setError(result.error ?? 'Could not record vote.');
      }
    });
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">{proposal.title}</h3>
          <p className="mt-1 text-sm text-neutral-400 leading-relaxed">{proposal.description}</p>
        </div>
        <StatusBadge status={proposal.status} />
      </div>

      <div className="flex items-center gap-3 text-sm">
        <span className="rounded-lg bg-neutral-800 px-2.5 py-1 text-neutral-300 font-medium">
          {proposal.scores_requested.toLocaleString()} Scores requested
        </span>
        <Countdown endsAt={proposal.voting_ends_at} />
      </div>

      <VotesBar votesFor={votesFor} votesAgainst={votesAgainst} />

      {error && <p className="text-xs text-red-400">{error}</p>}

      {isOpen && (
        <div className="flex gap-2">
          <Button
            variant={myVote === 'for' ? 'primary' : 'secondary'}
            size="sm"
            disabled={isPending}
            onClick={() => handleVote('for')}
          >
            👍 Vote For
          </Button>
          <Button
            variant={myVote === 'against' ? 'danger' : 'secondary'}
            size="sm"
            disabled={isPending}
            onClick={() => handleVote('against')}
          >
            👎 Vote Against
          </Button>
          {myVote && (
            <span className="ml-auto text-xs text-neutral-500 self-center">
              You voted {myVote}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
