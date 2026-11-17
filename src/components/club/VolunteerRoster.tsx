'use client';

import type { VolunteerWithHours } from '@/lib/types/volunteer-shifts';
import { card, cardTitle, muted } from '@/components/play/ui';

interface Props {
  volunteers: VolunteerWithHours[];
}

export default function VolunteerRoster({ volunteers }: Props) {
  if (volunteers.length === 0) {
    return (
      <div style={card}>
        <p style={muted}>No volunteers registered at this club yet.</p>
      </div>
    );
  }

  // Sort by total hours descending
  const sorted = [...volunteers].sort((a, b) => b.total_hours - a.total_hours);

  return (
    <div style={card}>
      <h3 style={cardTitle}>Volunteer Leaderboard</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <th style={th}>#</th>
            <th style={{ ...th, textAlign: 'left' }}>Name</th>
            <th style={th}>Hours</th>
            <th style={th}>Shifts</th>
            <th style={th}>Scores</th>
            <th style={th}>No Shows</th>
            <th style={{ ...th, textAlign: 'left' }}>Last Active</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((v, i) => (
            <tr key={v.user_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <td style={{ ...td, color: 'rgba(255,255,255,0.4)' }}>{i + 1}</td>
              <td style={{ ...td, textAlign: 'left', color: '#fff', fontWeight: 500 }}>{v.user_name}</td>
              <td style={td}>{v.total_hours}h</td>
              <td style={td}>{v.total_shifts}</td>
              <td style={{ ...td, color: '#EFC84A' }}>{v.total_scores} ⭐</td>
              <td style={{ ...td, color: v.no_show_count > 0 ? '#ff5252' : 'rgba(255,255,255,0.4)' }}>
                {v.no_show_count}
              </td>
              <td style={{ ...td, textAlign: 'left', color: 'rgba(255,255,255,0.5)' }}>
                {v.last_shift_date ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: 'right',
  padding: '0.5rem 0.5rem',
  color: 'rgba(255,255,255,0.5)',
  fontWeight: 500,
  fontSize: '0.8rem',
};

const td: React.CSSProperties = {
  textAlign: 'right',
  padding: '0.5rem 0.5rem',
  color: 'rgba(255,255,255,0.7)',
};
