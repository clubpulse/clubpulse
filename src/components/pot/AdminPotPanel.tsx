'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ProposalCard } from '@/components/pot/ProposalCard';
import { adminCreateProposal, adminFundProposal } from '@/lib/actions/community-pot';
import type { PotProposal } from '@/lib/types/community-pot';

function CreateProposalForm({ clubId, onCreated }: { clubId: string; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scores, setScores] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title.trim() || !description.trim() || !scores || !endsAt) {
      setError('All fields are required.');
      return;
    }
    const scoresNum = parseInt(scores, 10);
    if (!scoresNum || scoresNum < 1) {
      setError('Scores requested must be at least 1.');
      return;
    }

    startTransition(async () => {
      const result = await adminCreateProposal({
        club_id: clubId,
        title: title.trim(),
        description: description.trim(),
        scores_requested: scoresNum,
        voting_ends_at: new Date(endsAt).toISOString(),
      });

      if (result.success) {
        setSuccess('Proposal created! Members can now vote.');
        setTitle('');
        setDescription('');
        setScores('');
        setEndsAt('');
        onCreated();
      } else {
        setError(result.error ?? 'Failed to create proposal.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        label="Title"
        placeholder="e.g. New batting cage nets"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-300">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this for? Why does the club need it?"
          rows={3}
          style={{
            width: '100%',
            background: 'rgb(23,23,23)',
            border: '1px solid rgb(38,38,38)',
            borderRadius: '8px',
            padding: '8px 12px',
            color: '#fff',
            fontSize: '14px',
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <Input
        label="Scores requested"
        type="number"
        min={1}
        placeholder="e.g. 500"
        value={scores}
        onChange={(e) => setScores(e.target.value)}
      />
      <Input
        label="Voting deadline"
        type="datetime-local"
        value={endsAt}
        onChange={(e) => setEndsAt(e.target.value)}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {success && (
        <p className="rounded-lg bg-emerald-900/30 border border-emerald-800 px-3 py-2 text-sm text-emerald-300">
          ✅ {success}
        </p>
      )}
      <Button type="submit" loading={isPending} className="w-full">
        Create Proposal
      </Button>
    </form>
  );
}

function FundButton({ proposalId }: { proposalId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  function handleFund() {
    setResult(null);
    startTransition(async () => {
      const res = await adminFundProposal(proposalId);
      if (res.success) {
        setResult({ success: true, message: 'Proposal funded! Scores deducted from the pot.' });
      } else {
        setResult({ success: false, message: res.error ?? 'Failed to fund proposal.' });
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button variant="primary" size="sm" loading={isPending} onClick={handleFund}>
        💸 Fund This
      </Button>
      {result && (
        <p className={`text-xs ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}

export function AdminPotPanel({
  clubId,
  activeProposals,
}: {
  clubId: string;
  activeProposals: PotProposal[];
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      {/* Create proposal */}
      <Card
        title="Create a proposal"
        description="Members will vote on this initiative"
        action={
          <Button variant="secondary" size="sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : '+ New proposal'}
          </Button>
        }
      >
        {showForm && (
          <CreateProposalForm clubId={clubId} onCreated={() => setShowForm(false)} />
        )}
        {!showForm && (
          <p className="text-sm text-neutral-500">
            Click &ldquo;New proposal&rdquo; to create a spending proposal for the Community Pot.
          </p>
        )}
      </Card>

      {/* Active proposals with Fund button */}
      {activeProposals.length > 0 && (
        <section>
          <h2 style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: '17px',
            color: '#fff',
            margin: '0 0 14px',
          }}>
            Active proposals
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeProposals.map((p) => (
              <div key={p.id}>
                <ProposalCard proposal={p} />
                <div style={{ marginTop: '8px', paddingLeft: '4px' }}>
                  <FundButton proposalId={p.id} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
