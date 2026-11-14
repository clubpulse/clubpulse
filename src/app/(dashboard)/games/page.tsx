import { getGamesState } from '@/lib/actions/games';
import { GamesPanel } from '@/components/games/GamesPanel';
import { h1, muted } from '@/components/play/ui';

export default async function GamesPage() {
  const result = await getGamesState();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{ ...h1, marginBottom: '4px' }}>🎮 Games</h1>
        <p style={muted}>Quick games you can play every day to earn Scores</p>
      </div>
      {result.success
        ? <GamesPanel state={result.data} />
        : <p style={{ fontSize: '14px', color: '#f87171', margin: 0 }}>{result.error}</p>}
    </div>
  );
}
