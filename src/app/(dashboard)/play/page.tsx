import { getPlaySummary } from '@/lib/actions/scores-engine';
import { PlayPanel } from '@/components/play/PlayPanel';
import { h1, muted } from '@/components/play/ui';

export default async function PlayPage() {
  const result = await getPlaySummary();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{ ...h1, marginBottom: '4px' }}>💰 Earn Scores</h1>
        <p style={muted}>Check in, finish this week&apos;s challenges and help the club hit its goal</p>
      </div>
      {result.success
        ? <PlayPanel summary={result.data} />
        : <p style={{ fontSize: '14px', color: '#f87171', margin: 0 }}>{result.error}</p>}
    </div>
  );
}
