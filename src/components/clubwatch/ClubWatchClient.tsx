'use client';

import { useState } from 'react';

// ── Types ──
type Category = { key: string; label: string; description: string; icon: string; scores: number };
type Report = {
  id: string;
  category: string;
  note: string;
  photo_url: string | null;
  status: 'pending' | 'verified' | 'rejected';
  scores_awarded: number;
  review_note: string | null;
  created_at: string;
};
type LeaderboardEntry = {
  user_id: string;
  display_name: string;
  total_reports: number;
  verified_reports: number;
  total_scores: number;
};

type Props = {
  categories: Category[];
  myReports: Report[];
  leaderboard: LeaderboardEntry[];
  currentUserId: string;
};

const tabs = [
  { key: 'report', label: '📸 Report' },
  { key: 'my_reports', label: '📋 My Reports' },
  { key: 'leaderboard', label: '🏆 Leaderboard' },
];

const statusStyles: Record<string, { bg: string; color: string; label: string }> = {
  verified: { bg: 'rgba(52,211,153,0.12)', color: '#34D399', label: '✅ Verified' },
  pending:  { bg: 'rgba(201,168,76,0.12)', color: '#C9A84C', label: '⏳ Pending' },
  rejected: { bg: 'rgba(248,113,113,0.12)', color: '#F87171', label: '❌ Rejected' },
};

export function ClubWatchClient({ categories, myReports, leaderboard, currentUserId }: Props) {
  const [activeTab, setActiveTab] = useState('report');
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!selected) return;
    if (note.trim().length < 5) { setError('Please describe the issue in at least 5 characters.'); return; }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/clubwatch/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: selected, note: note.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      setSuccess(true);
      setNote('');
      setSelected(null);
      setTimeout(() => setSuccess(false), 5000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalEarned = myReports.filter(r => r.status === 'verified').reduce((s, r) => s + r.scores_awarded, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', padding: '4px' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              background: activeTab === t.key ? '#fff' : 'transparent',
              color: activeTab === t.key ? '#0B0B0B' : 'rgba(255,255,255,0.4)',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Report tab ── */}
      {activeTab === 'report' && (
        <>
          {/* Hero */}
          <div style={{
            background: 'rgba(201,168,76,0.06)',
            border: '1px solid rgba(201,168,76,0.18)',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>📸</div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: '#fff', margin: '0 0 6px' }}>
              Snap. Report. Earn.
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
              Spot an issue at the ground? Pick a category, describe it, and earn Scores when your club verifies it.
            </p>
          </div>

          {/* How it works */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px', color: '#fff', margin: 0 }}>How it works</h3>
            {[
              { n: '1', title: 'Spot something', desc: 'See a problem or something noteworthy at the ground' },
              { n: '2', title: 'Report it', desc: 'Pick a category, describe the issue, and optionally add a photo' },
              { n: '3', title: 'Earn Scores', desc: 'Your club committee reviews it — verified reports earn Scores' },
            ].map(s => (
              <div key={s.n} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '14px', flexShrink: 0,
                  background: 'rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: 700, color: '#C9A84C',
                }}>{s.n}</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{s.title}</div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Category grid */}
          <div>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px', color: '#fff', margin: '0 0 12px' }}>
              What are you reporting?
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
              {categories.map(c => {
                const isSelected = selected === c.key;
                return (
                  <button
                    key={c.key}
                    onClick={() => setSelected(c.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 16px',
                      borderRadius: '14px',
                      border: isSelected ? '2px solid #C9A84C' : '1px solid rgba(255,255,255,0.07)',
                      background: isSelected ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    <span style={{
                      width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                      background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '20px',
                    }}>{c.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{c.label}</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.description}</div>
                    </div>
                    <span style={{
                      background: 'rgba(201,168,76,0.12)', padding: '4px 10px', borderRadius: '8px',
                      fontSize: '12px', fontWeight: 700, color: '#C9A84C', flexShrink: 0,
                    }}>+{c.scores}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note input */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>
              Describe the issue
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Loose paving slab near the pavilion entrance — someone could trip on it"
              rows={3}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)',
                color: '#fff',
                fontSize: '14px',
                fontFamily: "'Inter', sans-serif",
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!selected || submitting}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: selected ? '#C9A84C' : 'rgba(201,168,76,0.2)',
              color: selected ? '#0B0B0B' : 'rgba(201,168,76,0.5)',
              fontSize: '15px',
              fontWeight: 800,
              fontFamily: "'Syne', sans-serif",
              cursor: selected ? 'pointer' : 'default',
              opacity: submitting ? 0.6 : 1,
              transition: 'all 0.15s',
            }}
          >
            {submitting ? 'Submitting…' : `Submit Report${selected ? ` (+${categories.find(c => c.key === selected)?.scores ?? 0} Scores)` : ''}`}
          </button>

          {error && (
            <div style={{
              background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
              borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#F87171',
            }}>{error}</div>
          )}

          {success && (
            <div style={{
              background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)',
              borderRadius: '14px', padding: '20px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>✅</div>
              <div style={{ fontWeight: 700, color: '#34D399', fontSize: '15px' }}>Report submitted!</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                Your club committee will review it and you'll earn Scores when verified.
              </div>
            </div>
          )}

          {/* GPS note */}
          <div style={{
            fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '0 16px',
          }}>
            📍 On the mobile app, reports are GPS-tagged to confirm you're at or near the ground.
          </div>
        </>
      )}

      {/* ── My Reports tab ── */}
      {activeTab === 'my_reports' && (
        <>
          {/* Summary */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
          }}>
            {[
              { label: 'Reports', value: myReports.length, color: '#C9A84C' },
              { label: 'Verified', value: myReports.filter(r => r.status === 'verified').length, color: '#34D399' },
              { label: 'Scores earned', value: totalEarned, color: '#C9A84C' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '14px', padding: '16px', textAlign: 'center',
              }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {myReports.length === 0 ? (
            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '14px', padding: '32px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>No reports yet</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                Head to the Report tab and start earning Scores by helping your club.
              </div>
            </div>
          ) : (
            myReports.map(r => {
              const cat = categories.find(c => c.key === r.category);
              const st = statusStyles[r.status] ?? statusStyles.pending;
              return (
                <div key={r.id} style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>{cat?.icon ?? '📝'}</span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{cat?.label ?? 'Report'}</span>
                    </div>
                    <span style={{
                      background: st.bg, color: st.color, fontSize: '12px', fontWeight: 600,
                      padding: '3px 10px', borderRadius: '8px',
                    }}>{st.label}</span>
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>{r.note}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
                    <span>{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                    {r.scores_awarded > 0 && (
                      <span style={{ color: '#C9A84C', fontWeight: 700 }}>+{r.scores_awarded} Scores</span>
                    )}
                  </div>
                  {r.review_note && (
                    <div style={{
                      background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '8px 10px',
                      fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontStyle: 'italic',
                    }}>
                      Committee: {r.review_note}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </>
      )}

      {/* ── Leaderboard tab ── */}
      {activeTab === 'leaderboard' && (
        <>
          <div style={{
            background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)',
            borderRadius: '16px', padding: '20px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '28px', marginBottom: '6px' }}>🏆</div>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#fff', margin: '0 0 4px' }}>
              {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
              ClubWatch Champions — top reporters earn bonus Scores at month end
            </p>
          </div>

          {/* Podium for top 3 */}
          {leaderboard.length >= 3 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '10px', padding: '8px 0' }}>
              {[leaderboard[1], leaderboard[0], leaderboard[2]].map((l, i) => {
                const heights = [110, 140, 90];
                const badges = ['🥈', '🥇', '🥉'];
                const isMe = l.user_id === currentUserId;
                return (
                  <div key={l.user_id} style={{ textAlign: 'center', width: '90px' }}>
                    <div style={{ fontSize: i === 1 ? '28px' : '22px', marginBottom: '4px' }}>{badges[i]}</div>
                    <div style={{
                      fontSize: '12px', fontWeight: isMe ? 700 : 500,
                      color: isMe ? '#C9A84C' : 'rgba(255,255,255,0.5)',
                      marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{l.display_name}{isMe ? ' (You)' : ''}</div>
                    <div style={{
                      height: `${heights[i]}px`,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: '2px',
                    }}>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: '#C9A84C' }}>
                        {l.total_scores}
                      </div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>
                        {l.verified_reports} verified
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Rest of leaderboard */}
          {leaderboard.slice(3).map((l, i) => {
            const isMe = l.user_id === currentUserId;
            return (
              <div key={l.user_id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                background: isMe ? 'rgba(201,168,76,0.06)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isMe ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: '12px', padding: '12px 16px',
              }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '14px',
                  background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.4)',
                }}>{i + 4}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: isMe ? 700 : 500, color: isMe ? '#C9A84C' : '#fff' }}>
                    {l.display_name}{isMe ? ' (You)' : ''}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{l.total_reports} reports</div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#C9A84C' }}>{l.total_scores}</div>
              </div>
            );
          })}

          {leaderboard.length === 0 && (
            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '14px', padding: '32px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>No reports this month yet</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                Be the first to report — submit a ClubWatch report to top the leaderboard!
              </div>
            </div>
          )}

          {/* Reward tiers */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px',
          }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px', color: '#fff', margin: 0 }}>
              Monthly bonus rewards
            </h3>
            {[
              { badge: '🥇', place: '1st place', bonus: '+500' },
              { badge: '🥈', place: '2nd place', bonus: '+250' },
              { badge: '🥉', place: '3rd place', bonus: '+100' },
            ].map(r => (
              <div key={r.place} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>{r.badge} {r.place}</span>
                <span style={{ color: '#C9A84C', fontWeight: 700 }}>{r.bonus} bonus Scores</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
