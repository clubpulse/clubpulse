'use client';

import { useState, useTransition } from 'react';
import type { EcbCourseType, CourseCategory } from '@/lib/types/ecb-courses';
import { CATEGORY_CONFIG } from '@/lib/types/ecb-courses';
import { logQualification } from '@/lib/actions/ecb-courses';

interface Props {
  clubId: string;
  coursesByCategory: Record<CourseCategory, EcbCourseType[]>;
  onSuccess?: () => void;
}

export function LogQualificationForm({ clubId, coursesByCategory, onSuccess }: Props) {
  const [activeCategory, setActiveCategory] = useState<CourseCategory | 'all'>('all');
  const [courseTypeId, setCourseTypeId] = useState('');
  const [completedDate, setCompletedDate] = useState('');
  const [certNumber, setCertNumber] = useState('');
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const categories = Object.keys(coursesByCategory) as CourseCategory[];
  const allCourses = categories.flatMap(c => coursesByCategory[c] ?? []);
  const filteredCourses = activeCategory === 'all' ? allCourses : (coursesByCategory[activeCategory] ?? []);
  const selectedCourse = allCourses.find(c => c.id === courseTypeId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!courseTypeId || !completedDate) return;

    startTransition(async () => {
      const result = await logQualification(clubId, courseTypeId, completedDate, certNumber || undefined);
      if (result.success) {
        setFlash({ type: 'success', message: `Qualification logged! You earned ${result.data.creds_awarded} Scores.` });
        setCourseTypeId('');
        setCompletedDate('');
        setCertNumber('');
        onSuccess?.();
      } else {
        setFlash({ type: 'error', message: result.error });
      }
    });
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10,
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {flash && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 10,
          background: flash.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${flash.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: flash.type === 'success' ? '#86efac' : '#fca5a5',
          fontSize: 14,
        }}>
          {flash.message}
        </div>
      )}

      {/* Category filter pills */}
      <div>
        <label style={labelStyle}>Category</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button
            type="button"
            onClick={() => { setActiveCategory('all'); setCourseTypeId(''); }}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.12)',
              background: activeCategory === 'all' ? 'rgba(155,28,28,0.4)' : 'rgba(255,255,255,0.05)',
              color: activeCategory === 'all' ? '#fff' : 'rgba(255,255,255,0.5)',
              fontSize: 13,
              cursor: 'pointer',
              fontWeight: activeCategory === 'all' ? 600 : 400,
            }}
          >
            All
          </button>
          {categories.map(cat => {
            const cfg = CATEGORY_CONFIG[cat];
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => { setActiveCategory(cat); setCourseTypeId(''); }}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: active ? 'rgba(155,28,28,0.4)' : 'rgba(255,255,255,0.05)',
                  color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontWeight: active ? 600 : 400,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>{cfg.emoji}</span>
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Course select */}
      <div>
        <label style={labelStyle} htmlFor="course-select">Course / Qualification</label>
        <select
          id="course-select"
          value={courseTypeId}
          onChange={e => setCourseTypeId(e.target.value)}
          required
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="">Select a course…</option>
          {filteredCourses.map(c => (
            <option key={c.id} value={c.id}>{CATEGORY_CONFIG[c.category].emoji} {c.name}</option>
          ))}
        </select>
      </div>

      {/* Scores preview */}
      {selectedCourse && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(155,28,28,0.15)',
          border: '1px solid rgba(155,28,28,0.3)',
          borderRadius: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
            {selectedCourse.description}
          </span>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#f87171', whiteSpace: 'nowrap', marginLeft: 12 }}>
            +{selectedCourse.creds_reward} Scores
          </span>
        </div>
      )}

      {/* Date completed */}
      <div>
        <label style={labelStyle} htmlFor="completed-date">Date Completed</label>
        <input
          id="completed-date"
          type="date"
          value={completedDate}
          onChange={e => setCompletedDate(e.target.value)}
          max={new Date().toISOString().split('T')[0]}
          required
          style={inputStyle}
        />
      </div>

      {/* Certificate number */}
      <div>
        <label style={labelStyle} htmlFor="cert-number">Certificate Number (optional)</label>
        <input
          id="cert-number"
          type="text"
          value={certNumber}
          onChange={e => setCertNumber(e.target.value)}
          placeholder="e.g. ECB-2024-123456"
          style={inputStyle}
        />
      </div>

      <button
        type="submit"
        disabled={isPending || !courseTypeId || !completedDate}
        style={{
          padding: '12px',
          borderRadius: 10,
          background: isPending || !courseTypeId || !completedDate ? 'rgba(155,28,28,0.3)' : '#9b1c1c',
          color: '#fff',
          fontWeight: 600,
          fontSize: 15,
          border: 'none',
          cursor: isPending || !courseTypeId || !completedDate ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s',
        }}
      >
        {isPending ? 'Logging…' : 'Log Qualification'}
      </button>
    </form>
  );
}
