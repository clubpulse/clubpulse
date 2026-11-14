'use client';

import { useState } from 'react';
import { NominationCard } from './NominationCard';
import { NominateModal } from './NominateModal';
import type { InfamyCategory, InfamyNomination, InfamyWinner } from '@/lib/types/infamy';

interface ClubMember {
  user_id: string;
  full_name: string;
  avatar_url?: string;
}

interface InfamyPageClientProps {
  currentUserId: string;
  clubId: string;
  season: number;
  categories: InfamyCategory[];
  nominationsByCategory: Record<string, InfamyNomination[]>;
  pastWinners: InfamyWinner[];
  members: ClubMember[];
  myVotedIds: string[];
}

export function InfamyPageClient({
  currentUserId,
  clubId,
  season,
  categories,
  nominationsByCategory,
  pastWinners,
  members,
  myVotedIds,
}: InfamyPageClientProps) {
  const [showModal, setShowModal] = useState(false);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set(myVotedIds));
  const [refreshKey, setRefreshKey] = useState(0);

  function handleVoted(nominationId: string) {
    setVotedIds((prev) => new Set([...prev, nominationId]));
  }

  // Group past winners by season
  const winnersBySeason = pastWinners.reduce<Record<number, InfamyWinner[]>>((acc, w) => {
    const s = w.season;
    if (!acc[s]) acc[s] = [];
    acc[s].push(w);
    return acc;
  }, {});
  const pastSeasons = Object.keys(winnersBySeason)
    .map(Number)
    .filter((s) => s < season)
    .sort((a, b) => b - a);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: '28px',
              color: '#fff',
              letterSpacing: '-0.4px',
            }}
          >
            🏆 Hall of Infamy
          </h1>
          <p
            style={{
              margin: '6px 0 0',
              fontFamily: "'Inter', sans-serif",
              fontSize: '14px',
              color: 'rgba(255,255,255,0.45)',
            }}
          >
            The anti-leaderboard. Immortalised in shame since the club was founded.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '10px 18px',
            borderRadius: '10px',
            border: '1px solid rgba(220,38,38,0.4)',
            cursor: 'pointer',
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: '14px',
            background: 'rgba(220,38,38,0.12)',
            color: 'rgba(220,38,38,0.9)',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          }}
        >
          ☠️ Nominate a Teammate
        </button>
      </div>

      {/* Current season */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: '18px',
              color: '#fff',
            }}
          >
            {season} Season
          </h2>
          <span
            style={{
              background: 'rgba(220,38,38,0.2)',
              color: 'rgba(220,38,38,0.9)',
              fontFamily: "'Inter', sans-serif",
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '20px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Voting open
          </span>
        </div>

        {categories.length === 0 ? (
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px dashed rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '32px',
              textAlign: 'center',
              color: 'rgba(255,255,255,0.3)',
              fontFamily: "'Inter', sans-serif",
              fontSize: '14px',
            }}
          >
            No categories yet. Ask a club admin to set up the Hall of Infamy categories.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {categories.map((cat) => {
              const nominations = nominationsByCategory[cat.id] ?? [];
              return (
                <div
                  key={cat.id}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '14px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  {/* Category header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>{cat.emoji}</span>
                    <div>
                      <div
                        style={{
                          fontFamily: "'Syne', sans-serif",
                          fontWeight: 700,
                          fontSize: '16px',
                          color: '#fff',
                        }}
                      >
                        {cat.name}
                      </div>
                      {cat.description && (
                        <div
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '12px',
                            color: 'rgba(255,255,255,0.4)',
                          }}
                        >
                          {cat.description}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Nominations */}
                  {nominations.length === 0 ? (
                    <p
                      style={{
                        margin: 0,
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.25)',
                        fontStyle: 'italic',
                      }}
                    >
                      No nominations yet — be the first to call someone out.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {nominations.map((nom) => (
                        <NominationCard
                          key={nom.id}
                          nomination={nom}
                          currentUserId={currentUserId}
                          clubId={clubId}
                          hasVoted={votedIds.has(nom.id)}
                          onVoted={handleVoted}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Past winners */}
      {pastSeasons.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2
            style={{
              margin: 0,
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: '18px',
              color: '#fff',
            }}
          >
            🏛️ Past Seasons
          </h2>

          {pastSeasons.map((s) => (
            <div key={s} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3
                style={{
                  margin: 0,
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 600,
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.5)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {s}
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '12px',
                }}
              >
                {(winnersBySeason[s] ?? []).map((winner) => (
                  <div
                    key={winner.id}
                    style={{
                      background: 'rgba(220,38,38,0.06)',
                      border: '1px solid rgba(220,38,38,0.2)',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '20px',
                      }}
                    >
                      {winner.category?.emoji ?? '🏆'}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Syne', sans-serif",
                        fontWeight: 700,
                        fontSize: '13px',
                        color: 'rgba(220,38,38,0.8)',
                      }}
                    >
                      {winner.category?.name ?? 'Award'}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 600,
                        fontSize: '15px',
                        color: '#fff',
                      }}
                    >
                      {winner.winner_profile?.full_name ?? 'Unknown'}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '11px',
                        color: 'rgba(255,255,255,0.3)',
                      }}
                    >
                      {winner.vote_count} {winner.vote_count === 1 ? 'vote' : 'votes'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Nominate modal */}
      {showModal && (
        <NominateModal
          clubId={clubId}
          categories={categories}
          members={members}
          onClose={() => setShowModal(false)}
          onSuccess={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
