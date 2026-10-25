import type { FullCricketCV } from '@/lib/types/cricket-cv';
import { BATTING_STYLE_LABELS, BOWLING_STYLE_LABELS, PRIMARY_ROLE_LABELS } from '@/lib/types/cricket-cv';

interface Props {
  cv: FullCricketCV;
  isPreview?: boolean;
}

const RARITY_COLOURS: Record<string, string> = {
  common: '#6b7280',
  uncommon: '#16a34a',
  rare: '#2563eb',
  epic: '#7c3aed',
  legendary: '#d97706',
};

export function CricketCVCard({ cv, isPreview = false }: Props) {
  const { profile, seasonStats, badges, qualifications, currentClub } = cv;

  const totalMatches = seasonStats.reduce((s, r) => s + (r.matches_played ?? 0), 0);
  const totalRuns = seasonStats.reduce((s, r) => s + (r.runs_scored ?? 0), 0);
  const totalWickets = seasonStats.reduce((s, r) => s + (r.wickets_taken ?? 0), 0);

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #111827 100%)',
        border: '1px solid #1f2937',
        borderRadius: '16px',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
        color: '#f9fafb',
      }}
    >
      {/* Header band */}
      <div
        style={{
          background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #7f1d1d 100%)',
          padding: '28px 28px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          {/* Avatar */}
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: '#ffffff20',
              border: '2px solid #ffffff40',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={profile.display_name ?? 'Player'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              '🏏'
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
              {profile.display_name ?? 'Cricket Player'}
            </h1>
            {profile.tagline && (
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#fca5a5', fontWeight: 500 }}>
                {profile.tagline}
              </p>
            )}
            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {profile.primary_role && (
                <span
                  style={{
                    background: '#ffffff20',
                    border: '1px solid #ffffff30',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#fff',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {PRIMARY_ROLE_LABELS[profile.primary_role]}
                </span>
              )}
              {currentClub && (
                <span
                  style={{
                    background: '#ffffff15',
                    border: '1px solid #ffffff25',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    color: '#fde68a',
                  }}
                >
                  📍 {currentClub}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Key info pills */}
        {(profile.batting_style || profile.bowling_style || profile.highest_level) && (
          <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {profile.batting_style && (
              <Pill label="Batting" value={BATTING_STYLE_LABELS[profile.batting_style]} />
            )}
            {profile.bowling_style && profile.bowling_style !== 'does_not_bowl' && (
              <Pill label="Bowling" value={BOWLING_STYLE_LABELS[profile.bowling_style]} />
            )}
            {profile.highest_level && (
              <Pill label="Level" value={profile.highest_level} />
            )}
            {profile.years_playing && (
              <Pill label="Experience" value={`${profile.years_playing} yr${profile.years_playing !== 1 ? 's' : ''}`} />
            )}
          </div>
        )}
      </div>

      <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Personal statement */}
        {profile.personal_statement && (
          <section>
            <SectionHeading>About</SectionHeading>
            <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#d1d5db', lineHeight: 1.6 }}>
              {profile.personal_statement}
            </p>
          </section>
        )}

        {/* Career at a glance */}
        {totalMatches > 0 && (
          <section>
            <SectionHeading>Career at a Glance</SectionHeading>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
                marginTop: '10px',
              }}
            >
              <StatTile label="Matches" value={totalMatches} />
              <StatTile label="Runs" value={totalRuns} />
              <StatTile label="Wickets" value={totalWickets} />
            </div>
          </section>
        )}

        {/* Season stats table */}
        {seasonStats.length > 0 && (
          <section>
            <SectionHeading>Season Stats</SectionHeading>
            <div style={{ overflowX: 'auto', marginTop: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    {['Season', 'Club', 'M', 'Runs', 'HS', 'Avg', 'Wkts', 'BB'].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: h === 'Season' || h === 'Club' ? 'left' : 'right',
                          padding: '6px 8px',
                          color: '#9ca3af',
                          fontWeight: 600,
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          borderBottom: '1px solid #1f2937',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {seasonStats.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #111827' }}>
                      <td style={{ padding: '8px 8px', color: '#f3f4f6', fontWeight: 600 }}>{s.season}</td>
                      <td style={{ padding: '8px 8px', color: '#d1d5db', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.club_name}</td>
                      <td style={{ padding: '8px 8px', color: '#d1d5db', textAlign: 'right' }}>{s.matches_played}</td>
                      <td style={{ padding: '8px 8px', color: '#d1d5db', textAlign: 'right' }}>{s.runs_scored}</td>
                      <td style={{ padding: '8px 8px', color: '#d1d5db', textAlign: 'right' }}>{s.highest_score ?? '—'}</td>
                      <td style={{ padding: '8px 8px', color: '#d1d5db', textAlign: 'right' }}>{s.batting_average ?? '—'}</td>
                      <td style={{ padding: '8px 8px', color: '#d1d5db', textAlign: 'right' }}>{s.wickets_taken}</td>
                      <td style={{ padding: '8px 8px', color: '#d1d5db', textAlign: 'right' }}>{s.best_bowling ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Clubs played for */}
        {profile.clubs_played_for && (
          <section>
            <SectionHeading>Clubs Played For</SectionHeading>
            <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#9ca3af' }}>{profile.clubs_played_for}</p>
          </section>
        )}

        {/* Badges */}
        {profile.show_badges && badges && badges.length > 0 && (
          <section>
            <SectionHeading>Badges</SectionHeading>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
              {badges.map((b, i) => (
                <span
                  key={i}
                  title={b.name}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: '#1f2937',
                    border: `1px solid ${RARITY_COLOURS[b.rarity] ?? '#374151'}`,
                    color: '#f3f4f6',
                  }}
                >
                  <span>{b.emoji}</span>
                  {b.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Qualifications */}
        {profile.show_qualifications && qualifications && qualifications.length > 0 && (
          <section>
            <SectionHeading>Qualifications</SectionHeading>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
              {qualifications.map((q, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: '#111827',
                    borderRadius: '8px',
                    border: '1px solid #1f2937',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '13px', color: '#f3f4f6', fontWeight: 500 }}>{q.name}</span>
                    <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '8px' }}>{q.category}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                      {new Date(q.completed_date).getFullYear()}
                    </span>
                    {q.is_verified && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#34d399',
                          background: '#064e3b30',
                          border: '1px solid #065f4630',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        ✓ Verified
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      {!isPreview && (
        <div
          style={{
            borderTop: '1px solid #1f2937',
            padding: '12px 28px',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <span style={{ fontSize: '11px', color: '#4b5563' }}>
            Built with{' '}
            <a
              href="https://clubpulse.app"
              style={{ color: '#9b1c1c', textDecoration: 'none', fontWeight: 600 }}
              target="_blank"
              rel="noopener noreferrer"
            >
              ClubPulse
            </a>
          </span>
        </div>
      )}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        margin: 0,
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#6b7280',
      }}
    >
      {children}
    </h2>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: '#00000030',
        border: '1px solid #ffffff20',
        borderRadius: '20px',
        padding: '3px 10px',
        fontSize: '12px',
        color: '#e5e7eb',
      }}
    >
      <span style={{ color: '#fca5a5', fontWeight: 600 }}>{label}:</span>
      {value}
    </span>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '10px',
        padding: '12px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '22px', fontWeight: 800, color: '#f3f4f6', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
    </div>
  );
}
