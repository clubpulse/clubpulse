'use client';

import type { CSSProperties, FormEvent, ChangeEvent } from 'react';
import { useState, useTransition } from 'react';
import { addMilestone } from '@/lib/actions/club-bible';
import { MILESTONE_CATEGORY_CONFIG } from '@/lib/types/club-bible';
import type { MilestoneCategory } from '@/lib/types/club-bible';

interface Props {
  clubId: string;
}

const CATEGORIES = Object.entries(MILESTONE_CATEGORY_CONFIG) as [MilestoneCategory, { emoji: string; label: string }][];

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  color: 'rgba(255,255,255,0.35)',
  marginBottom: '6px',
  fontFamily: "'Inter', sans-serif",
};

const inputStyle: CSSProperties = {
  width: '100%',
  background: '#0f0f0f',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  padding: '9px 12px',
  fontSize: '13px',
  color: '#fff',
  fontFamily: "'Inter', sans-serif",
  outline: 'none',
  boxSizing: 'border-box',
};

export function AddMilestoneForm({ clubId }: Props) {
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MilestoneCategory>('victory');
  const [isFeatured, setIsFeatured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum) || yearNum < 1800 || yearNum > 2100) {
      setError('Please enter a valid year.');
      return;
    }
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!description.trim()) { setError('Description is required.'); return; }

    startTransition(async () => {
      const result = await addMilestone({
        club_id: clubId,
        year: yearNum,
        title: title.trim(),
        description: description.trim(),
        category,
        is_featured: isFeatured,
      });

      if (result.success) {
        setTitle('');
        setDescription('');
        setCategory('victory');
        setIsFeatured(false);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Year + Category row */}
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px' }}>
        <div>
          <label style={labelStyle}>Year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            min={1800}
            max={2100}
            required
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as MilestoneCategory)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {CATEGORIES.map(([key, cfg]) => (
              <option key={key} value={key} style={{ background: '#0f0f0f' }}>
                {cfg.emoji} {cfg.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Title */}
      <div>
        <label style={labelStyle}>Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. First League Title"
          required
          style={inputStyle}
        />
      </div>

      {/* Description */}
      <div>
        <label style={labelStyle}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of this milestone..."
          required
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
      </div>

      {/* Featured toggle */}
      <label style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '13px',
        color: 'rgba(255,255,255,0.6)',
        cursor: 'pointer',
        fontFamily: "'Inter', sans-serif",
        userSelect: 'none',
      }}>
        <input
          type="checkbox"
          checked={isFeatured}
          onChange={(e) => setIsFeatured(e.target.checked)}
          style={{ width: '16px', height: '16px', accentColor: '#9b1c1c', cursor: 'pointer' }}
        />
        Pin as featured milestone
      </label>

      {error && (
        <p style={{ fontSize: '12px', color: '#f87171', margin: 0, fontFamily: "'Inter', sans-serif" }}>{error}</p>
      )}
      {success && (
        <p style={{ fontSize: '12px', color: '#4ade80', margin: 0, fontFamily: "'Inter', sans-serif" }}>Milestone added successfully.</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        style={{
          background: isPending ? 'rgba(155,28,28,0.4)' : '#9b1c1c',
          color: '#fff',
          border: 'none',
          borderRadius: '10px',
          padding: '10px 20px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: isPending ? 'not-allowed' : 'pointer',
          fontFamily: "'Inter', sans-serif",
          transition: 'background 0.15s',
          alignSelf: 'flex-start',
        }}
      >
        {isPending ? 'Adding…' : 'Add Milestone'}
      </button>
    </form>
  );
}
