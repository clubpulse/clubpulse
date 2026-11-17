'use client';

import { useState, type CSSProperties } from 'react';
import { card, cardTitle, input, primaryBtn } from '@/components/play/ui';

type ClubProfileFormProps = {
  clubId: string;
  club: {
    id: string;
    name: string;
    sport: string;
    ground_lat: number | null;
    ground_lng: number | null;
    [k: string]: unknown;
  };
};

const label: CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.55)',
  marginBottom: '4px',
};

const fieldGroup: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

export function ClubProfileForm({ clubId, club }: ClubProfileFormProps) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const [form, setForm] = useState({
    name: (club.name as string) ?? '',
    short_name: (club.short_name as string) ?? '',
    sport: (club.sport as string) ?? '',
    location_address: (club.location_address as string) ?? '',
    location_city: (club.location_city as string) ?? '',
    location_postcode: (club.location_postcode as string) ?? '',
    ground_lat: club.ground_lat != null ? String(club.ground_lat) : '',
    ground_lng: club.ground_lng != null ? String(club.ground_lng) : '',
    primary_colour: (club.primary_colour as string) ?? '#00C853',
    secondary_colour: (club.secondary_colour as string) ?? '#0C1220',
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const body: Record<string, unknown> = { ...form };
      if (body.ground_lat) body.ground_lat = parseFloat(body.ground_lat as string);
      else delete body.ground_lat;
      if (body.ground_lng) body.ground_lng = parseFloat(body.ground_lng as string);
      else delete body.ground_lng;

      const res = await fetch(`/api/club/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ text: 'Profile saved', ok: true });
      } else {
        setMessage({ text: json.error ?? 'Save failed', ok: false });
      }
    } catch {
      setMessage({ text: 'Network error', ok: false });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={card}>
      <p style={cardTitle}>🏏 Club profile</p>
      <p
        style={{
          fontSize: '12px',
          color: 'rgba(255,255,255,0.4)',
          margin: '0 0 16px',
        }}
      >
        Basic info, location, and club colours
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
        }}
      >
        <div style={fieldGroup}>
          <span style={label}>Club name</span>
          <input
            style={input}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Hightown CC"
          />
        </div>

        <div style={fieldGroup}>
          <span style={label}>Short name</span>
          <input
            style={input}
            value={form.short_name}
            onChange={(e) => set('short_name', e.target.value)}
            placeholder="e.g. HCC"
            maxLength={20}
          />
        </div>

        <div style={fieldGroup}>
          <span style={label}>Sport</span>
          <input
            style={input}
            value={form.sport}
            onChange={(e) => set('sport', e.target.value)}
            placeholder="Cricket"
          />
        </div>

        <div style={fieldGroup}>
          <span style={label}>Address</span>
          <input
            style={input}
            value={form.location_address}
            onChange={(e) => set('location_address', e.target.value)}
            placeholder="123 Pitch Lane"
          />
        </div>

        <div style={fieldGroup}>
          <span style={label}>City</span>
          <input
            style={input}
            value={form.location_city}
            onChange={(e) => set('location_city', e.target.value)}
            placeholder="Manchester"
          />
        </div>

        <div style={fieldGroup}>
          <span style={label}>Postcode</span>
          <input
            style={input}
            value={form.location_postcode}
            onChange={(e) => set('location_postcode', e.target.value)}
            placeholder="M1 2AB"
            maxLength={10}
          />
        </div>

        <div style={fieldGroup}>
          <span style={label}>Ground latitude</span>
          <input
            style={input}
            value={form.ground_lat}
            onChange={(e) => set('ground_lat', e.target.value)}
            placeholder="53.4808"
            type="number"
            step="any"
          />
        </div>

        <div style={fieldGroup}>
          <span style={label}>Ground longitude</span>
          <input
            style={input}
            value={form.ground_lng}
            onChange={(e) => set('ground_lng', e.target.value)}
            placeholder="-2.2426"
            type="number"
            step="any"
          />
        </div>

        <div style={fieldGroup}>
          <span style={label}>Primary colour</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="color"
              value={form.primary_colour}
              onChange={(e) => set('primary_colour', e.target.value)}
              style={{
                width: '36px',
                height: '36px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                background: 'transparent',
              }}
            />
            <input
              style={{ ...input, flex: 1 }}
              value={form.primary_colour}
              onChange={(e) => set('primary_colour', e.target.value)}
              maxLength={7}
            />
          </div>
        </div>

        <div style={fieldGroup}>
          <span style={label}>Secondary colour</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="color"
              value={form.secondary_colour}
              onChange={(e) => set('secondary_colour', e.target.value)}
              style={{
                width: '36px',
                height: '36px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                background: 'transparent',
              }}
            />
            <input
              style={{ ...input, flex: 1 }}
              value={form.secondary_colour}
              onChange={(e) => set('secondary_colour', e.target.value)}
              maxLength={7}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginTop: '16px',
        }}
      >
        <button
          style={{
            ...primaryBtn,
            opacity: saving ? 0.6 : 1,
          }}
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>

        {message && (
          <span
            style={{
              fontSize: '12px',
              color: message.ok ? '#22C55E' : '#f87171',
            }}
          >
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}
