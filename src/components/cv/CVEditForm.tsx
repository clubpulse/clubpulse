'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import {
  upsertCVProfile,
  addSeasonStats,
  deleteSeasonStats,
  togglePublic,
  getCVShareUrl,
} from '@/lib/actions/cricket-cv';
import type { FullCricketCV, CVSeasonStats } from '@/lib/types/cricket-cv';
import {
  BATTING_STYLE_LABELS,
  BOWLING_STYLE_LABELS,
  PRIMARY_ROLE_LABELS,
} from '@/lib/types/cricket-cv';

interface Props {
  cv: FullCricketCV;
  onSaved?: () => void;
}

const emptyStats: Omit<CVSeasonStats, 'id' | 'user_id'> = {
  season: new Date().getFullYear(),
  club_name: '',
  matches_played: 0,
  runs_scored: 0,
  wickets_taken: 0,
  catches: 0,
  stumpings: 0,
  batting_average: undefined,
  bowling_average: undefined,
  highest_score: undefined,
  best_bowling: '',
};

export function CVEditForm({ cv, onSaved }: Props) {
  const [profile, setProfile] = useState(cv.profile);
  const [seasonStats, setSeasonStats] = useState<CVSeasonStats[]>(cv.seasonStats);
  const [newRow, setNewRow] = useState<Omit<CVSeasonStats, 'id' | 'user_id'>>(emptyStats);
  const [showNewRow, setShowNewRow] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shareUrl = profile.share_slug ? getCVShareUrl(profile.share_slug) : null;

  function handleProfileChange(key: string, value: string | boolean | number | undefined) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  function handleSaveProfile() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const { is_public: _ip, share_slug: _ss, id: _id, user_id: _uid, updated_at: _ua, ...rest } = profile;
      const result = await upsertCVProfile(rest);
      if (!result.success) {
        setError(result.error ?? 'Failed to save');
      } else {
        setProfile(result.data);
        setSuccess('Profile saved!');
        onSaved?.();
      }
    });
  }

  function handleTogglePublic() {
    startTransition(async () => {
      const result = await togglePublic(!profile.is_public);
      if (!result.success) {
        setError(result.error ?? 'Failed to update');
      } else {
        setProfile(result.data);
      }
    });
  }

  function handleAddSeason() {
    if (!newRow.club_name.trim()) return;
    startTransition(async () => {
      const result = await addSeasonStats(newRow);
      if (!result.success) {
        setError(result.error ?? 'Failed to add season');
      } else {
        setSeasonStats((prev) => [result.data, ...prev]);
        setNewRow(emptyStats);
        setShowNewRow(false);
      }
    });
  }

  function handleDeleteSeason(id: string) {
    startTransition(async () => {
      const result = await deleteSeasonStats(id);
      if (!result.success) {
        setError(result.error ?? 'Failed to delete');
      } else {
        setSeasonStats((prev) => prev.filter((s) => s.id !== id));
      }
    });
  }

  function handleCopyLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {error && (
        <div style={{ padding: '10px 14px', background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '8px', color: '#fca5a5', fontSize: '13px' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '10px 14px', background: '#052e16', border: '1px solid #14532d', borderRadius: '8px', color: '#86efac', fontSize: '13px' }}>
          {success}
        </div>
      )}

      {/* Sharing panel */}
      <Card title="Public sharing">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, fontSize: '13px', color: '#d1d5db' }}>
              {profile.is_public
                ? 'Your CV is public. Anyone with the link can view it.'
                : 'Your CV is private. Toggle to make it shareable.'}
            </p>
            {shareUrl && (
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9ca3af', wordBreak: 'break-all' }}>
                {shareUrl}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            {shareUrl && (
              <Button variant="secondary" size="sm" onClick={handleCopyLink}>
                {copied ? '✓ Copied' : '📋 Copy link'}
              </Button>
            )}
            <Button
              variant={profile.is_public ? 'danger' : 'primary'}
              size="sm"
              loading={isPending}
              onClick={handleTogglePublic}
            >
              {profile.is_public ? 'Make Private' : '🌐 Make Public'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Profile details */}
      <Card title="Player profile">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
          <Field label="Display name">
            <Input
              value={profile.display_name ?? ''}
              onChange={(e) => handleProfileChange('display_name', e.target.value)}
              placeholder="Ishwar Suresh"
            />
          </Field>
          <Field label="Tagline">
            <Input
              value={profile.tagline ?? ''}
              onChange={(e) => handleProfileChange('tagline', e.target.value)}
              placeholder="Opening batsman | ECB Level 2 Coach"
            />
          </Field>
          <Field label="Primary role">
            <Select
              value={profile.primary_role ?? ''}
              onChange={(v) => handleProfileChange('primary_role', v || undefined)}
              options={[
                { value: '', label: '— Select role —' },
                ...Object.entries(PRIMARY_ROLE_LABELS).map(([k, v]) => ({ value: k, label: v })),
              ]}
            />
          </Field>
          <Field label="Batting style">
            <Select
              value={profile.batting_style ?? ''}
              onChange={(v) => handleProfileChange('batting_style', v || undefined)}
              options={[
                { value: '', label: '— Select —' },
                ...Object.entries(BATTING_STYLE_LABELS).map(([k, v]) => ({ value: k, label: v })),
              ]}
            />
          </Field>
          <Field label="Bowling style">
            <Select
              value={profile.bowling_style ?? ''}
              onChange={(v) => handleProfileChange('bowling_style', v || undefined)}
              options={[
                { value: '', label: '— Select —' },
                ...Object.entries(BOWLING_STYLE_LABELS).map(([k, v]) => ({ value: k, label: v })),
              ]}
            />
          </Field>
          <Field label="Highest level played">
            <Input
              value={profile.highest_level ?? ''}
              onChange={(e) => handleProfileChange('highest_level', e.target.value)}
              placeholder="e.g. Premier League, County 2nd XI"
            />
          </Field>
          <Field label="Years playing">
            <Input
              type="number"
              value={profile.years_playing ?? ''}
              onChange={(e) => handleProfileChange('years_playing', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="e.g. 12"
              min={0}
            />
          </Field>
          <Field label="Birth year (optional)">
            <Input
              type="number"
              value={profile.date_of_birth_year ?? ''}
              onChange={(e) => handleProfileChange('date_of_birth_year', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="e.g. 1998"
              min={1940}
              max={new Date().getFullYear()}
            />
          </Field>
        </div>
        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Field label="Clubs played for (list them)">
            <Input
              value={profile.clubs_played_for ?? ''}
              onChange={(e) => handleProfileChange('clubs_played_for', e.target.value)}
              placeholder="Slough CC, Windsor CC, Staines CC…"
            />
          </Field>
          <Field label={`Personal statement (${(profile.personal_statement ?? '').length}/500)`}>
            <textarea
              value={profile.personal_statement ?? ''}
              onChange={(e) => handleProfileChange('personal_statement', e.target.value.slice(0, 500))}
              placeholder="A short intro about you as a cricketer…"
              rows={4}
              style={{
                width: '100%',
                background: '#0a0a0a',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#f9fafb',
                fontSize: '13px',
                padding: '9px 12px',
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </Field>
        </div>
      </Card>

      {/* Visibility toggles */}
      <Card title="Visibility settings">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Toggle
            label="Show badges on public CV"
            checked={profile.show_badges}
            onChange={(v) => handleProfileChange('show_badges', v)}
          />
          <Toggle
            label="Show ECB qualifications on public CV"
            checked={profile.show_qualifications}
            onChange={(v) => handleProfileChange('show_qualifications', v)}
          />
          <Toggle
            label="Show Scores balance on public CV"
            checked={profile.show_scores_balance}
            onChange={(v) => handleProfileChange('show_scores_balance', v)}
          />
        </div>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button loading={isPending} onClick={handleSaveProfile}>
          Save profile
        </Button>
      </div>

      {/* Season stats */}
      <Card
        title="Season stats"
        action={
          <Button size="sm" variant="secondary" onClick={() => setShowNewRow((v) => !v)}>
            {showNewRow ? 'Cancel' : '+ Add season'}
          </Button>
        }
      >
        {showNewRow && (
          <div
            style={{
              marginBottom: '16px',
              padding: '14px',
              background: '#0a0a0a',
              border: '1px solid #374151',
              borderRadius: '10px',
            }}
          >
            <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              New season
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
              <Field label="Season (year)">
                <Input
                  type="number"
                  value={newRow.season}
                  onChange={(e) => setNewRow((r) => ({ ...r, season: Number(e.target.value) }))}
                  min={1990}
                  max={2100}
                />
              </Field>
              <Field label="Club name">
                <Input
                  value={newRow.club_name}
                  onChange={(e) => setNewRow((r) => ({ ...r, club_name: e.target.value }))}
                  placeholder="Slough CC"
                />
              </Field>
              <Field label="Matches">
                <Input type="number" value={newRow.matches_played} onChange={(e) => setNewRow((r) => ({ ...r, matches_played: Number(e.target.value) }))} min={0} />
              </Field>
              <Field label="Runs">
                <Input type="number" value={newRow.runs_scored} onChange={(e) => setNewRow((r) => ({ ...r, runs_scored: Number(e.target.value) }))} min={0} />
              </Field>
              <Field label="Wickets">
                <Input type="number" value={newRow.wickets_taken} onChange={(e) => setNewRow((r) => ({ ...r, wickets_taken: Number(e.target.value) }))} min={0} />
              </Field>
              <Field label="Highest score">
                <Input type="number" value={newRow.highest_score ?? ''} onChange={(e) => setNewRow((r) => ({ ...r, highest_score: e.target.value ? Number(e.target.value) : undefined }))} min={0} placeholder="—" />
              </Field>
              <Field label="Batting avg">
                <Input type="number" value={newRow.batting_average ?? ''} onChange={(e) => setNewRow((r) => ({ ...r, batting_average: e.target.value ? Number(e.target.value) : undefined }))} min={0} step="0.01" placeholder="—" />
              </Field>
              <Field label="Best bowling">
                <Input value={newRow.best_bowling ?? ''} onChange={(e) => setNewRow((r) => ({ ...r, best_bowling: e.target.value }))} placeholder="5/23" />
              </Field>
              <Field label="Catches">
                <Input type="number" value={newRow.catches} onChange={(e) => setNewRow((r) => ({ ...r, catches: Number(e.target.value) }))} min={0} />
              </Field>
              <Field label="Stumpings">
                <Input type="number" value={newRow.stumpings} onChange={(e) => setNewRow((r) => ({ ...r, stumpings: Number(e.target.value) }))} min={0} />
              </Field>
            </div>
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
              <Button size="sm" loading={isPending} onClick={handleAddSeason}>
                Add season
              </Button>
            </div>
          </div>
        )}

        {seasonStats.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center', padding: '24px 0' }}>
            No seasons added yet. Add your first season above.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  {['Season', 'Club', 'M', 'Runs', 'HS', 'Bat Avg', 'Wkts', 'BB', ''].map((h, i) => (
                    <th
                      key={i}
                      style={{
                        textAlign: i <= 1 ? 'left' : 'right',
                        padding: '6px 8px',
                        color: '#6b7280',
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
                  <tr key={s.id} style={{ borderBottom: '1px solid #0f172a' }}>
                    <td style={{ padding: '8px 8px', color: '#f3f4f6', fontWeight: 600 }}>{s.season}</td>
                    <td style={{ padding: '8px 8px', color: '#d1d5db' }}>{s.club_name}</td>
                    <td style={{ padding: '8px 8px', color: '#d1d5db', textAlign: 'right' }}>{s.matches_played}</td>
                    <td style={{ padding: '8px 8px', color: '#d1d5db', textAlign: 'right' }}>{s.runs_scored}</td>
                    <td style={{ padding: '8px 8px', color: '#d1d5db', textAlign: 'right' }}>{s.highest_score ?? '—'}</td>
                    <td style={{ padding: '8px 8px', color: '#d1d5db', textAlign: 'right' }}>{s.batting_average ?? '—'}</td>
                    <td style={{ padding: '8px 8px', color: '#d1d5db', textAlign: 'right' }}>{s.wickets_taken}</td>
                    <td style={{ padding: '8px 8px', color: '#d1d5db', textAlign: 'right' }}>{s.best_bowling ?? '—'}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDeleteSeason(s.id)}
                        disabled={isPending}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#6b7280',
                          fontSize: '14px',
                          padding: '2px 4px',
                          borderRadius: '4px',
                        }}
                        title="Remove season"
                        aria-label="Remove season"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// Small helpers
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        background: '#0a0a0a',
        border: '1px solid #374151',
        borderRadius: '8px',
        color: value ? '#f9fafb' : '#6b7280',
        fontSize: '13px',
        padding: '9px 12px',
        fontFamily: 'inherit',
        appearance: 'none',
        cursor: 'pointer',
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} style={{ background: '#111827' }}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        padding: '10px 12px',
        background: '#0a0a0a',
        border: '1px solid #1f2937',
        borderRadius: '8px',
      }}
    >
      <span style={{ fontSize: '13px', color: '#d1d5db' }}>{label}</span>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: '40px',
          height: '22px',
          borderRadius: '11px',
          background: checked ? '#991b1b' : '#374151',
          position: 'relative',
          transition: 'background 0.2s',
          flexShrink: 0,
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '3px',
            left: checked ? '20px' : '3px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
          }}
        />
      </div>
    </label>
  );
}
