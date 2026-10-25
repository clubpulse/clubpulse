'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  adminGetAllPackages,
  adminCreatePackage,
  adminTogglePackage,
  adminGetAllJuniorSlots,
  adminAddJuniorSlot,
  adminGetSponsorships,
  adminFulfillSponsorship,
} from '@/lib/actions/sponsor';
import { BENEFIT_TYPE_CONFIG, AGE_GROUP_LABELS } from '@/lib/types/sponsor';
import type { SponsorshipPackage, JuniorSlot, Sponsorship, BenefitType, AgeGroup } from '@/lib/types/sponsor';

function fetchAll(clubId: string) {
  return Promise.all([adminGetAllPackages(clubId), adminGetAllJuniorSlots(clubId), adminGetSponsorships(clubId)]);
}

export function AdminSponsorShell({ clubId }: { clubId: string }) {
  const [tab, setTab] = useState<'packages' | 'slots' | 'sponsorships'>('packages');
  const [packages, setPackages] = useState<SponsorshipPackage[]>([]);
  const [slots, setSlots] = useState<JuniorSlot[]>([]);
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [loading, setLoading] = useState(true);

  type Loaded = Awaited<ReturnType<typeof fetchAll>>;

  function apply([pkgs, slt, spns]: Loaded) {
    if (pkgs.success) setPackages(pkgs.data);
    if (slt.success) setSlots(slt.data);
    if (spns.success) setSponsorships(spns.data);
    setLoading(false);
  }

  async function reload() {
    setLoading(true);
    apply(await fetchAll(clubId));
  }

  // Initial load: state is only set once the fetch resolves, and ignored if the club changed meanwhile
  useEffect(() => {
    let cancelled = false;
    fetchAll(clubId).then((result) => {
      if (!cancelled) apply(result);
    });
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  const tabs = [
    { key: 'packages' as const, label: 'Packages' },
    { key: 'slots' as const, label: 'Junior slots' },
    { key: 'sponsorships' as const, label: 'Sponsorships' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: '#fff', margin: '0 0 4px' }}>
          💝 Sponsor a Kid — Admin
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
          Manage packages, add anonymous junior slots, and mark sponsorships as fulfilled.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: '#0f0f0f', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '6px 14px', borderRadius: '7px', border: 'none',
              background: tab === t.key ? 'rgba(155,28,28,0.7)' : 'transparent',
              color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.4)',
              fontFamily: "'Inter', sans-serif", fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Loading…</p>
      ) : (
        <>
          {tab === 'packages' && <PackagesTab clubId={clubId} packages={packages} onReload={reload} />}
          {tab === 'slots' && <SlotsTab clubId={clubId} slots={slots} onReload={reload} />}
          {tab === 'sponsorships' && <SponsorshipsTab sponsorships={sponsorships} onReload={reload} />}
        </>
      )}
    </div>
  );
}

/* ---- Packages tab ---- */
function PackagesTab({ clubId, packages, onReload }: { clubId: string; packages: SponsorshipPackage[]; onReload: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', benefit_type: 'kit' as BenefitType, scores_cost: '', slots_available: '' });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await adminCreatePackage(clubId, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        benefit_type: form.benefit_type,
        scores_cost: parseInt(form.scores_cost, 10),
        slots_available: form.slots_available ? parseInt(form.slots_available, 10) : undefined,
      });
      if (!result.success) { setError(result.error); return; }
      setShowForm(false);
      setForm({ title: '', description: '', benefit_type: 'kit', scores_cost: '', slots_available: '' });
      onReload();
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {!showForm && (
        <button onClick={() => setShowForm(true)} style={addBtnStyle}>+ Add package</button>
      )}
      {showForm && (
        <div style={formCardStyle}>
          <h3 style={{ fontWeight: 600, fontSize: '15px', color: '#fff', margin: '0 0 14px' }}>New sponsorship package</h3>
          <div style={{ display: 'grid', gap: '10px' }}>
            <input placeholder="Package title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} />
            <textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} />
            <select value={form.benefit_type} onChange={e => setForm(f => ({ ...f, benefit_type: e.target.value as BenefitType }))} style={inputStyle}>
              {(Object.keys(BENEFIT_TYPE_CONFIG) as BenefitType[]).map(k => (
                <option key={k} value={k}>{BENEFIT_TYPE_CONFIG[k].emoji} {BENEFIT_TYPE_CONFIG[k].label}</option>
              ))}
            </select>
            <input type="number" placeholder="Scores cost" value={form.scores_cost} onChange={e => setForm(f => ({ ...f, scores_cost: e.target.value }))} style={inputStyle} />
            <input type="number" placeholder="Slots available (blank = unlimited)" value={form.slots_available} onChange={e => setForm(f => ({ ...f, slots_available: e.target.value }))} style={inputStyle} />
          </div>
          {error && <p style={{ fontSize: '13px', color: '#f87171', marginTop: '8px' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button onClick={() => setShowForm(false)} style={cancelBtnStyle}>Cancel</button>
            <button onClick={handleCreate} disabled={isPending || !form.title || !form.scores_cost} style={confirmBtnStyle}>
              {isPending ? 'Saving…' : 'Create package'}
            </button>
          </div>
        </div>
      )}
      {packages.map(pkg => {
        const cfg = BENEFIT_TYPE_CONFIG[pkg.benefit_type];
        return (
          <div key={pkg.id} style={rowCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
              <span style={{ fontSize: '22px' }}>{cfg.emoji}</span>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>{pkg.title}</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>
                  {pkg.scores_cost.toLocaleString()} Scores · {pkg.slots_available != null ? `${pkg.slots_filled}/${pkg.slots_available} slots` : 'Unlimited'} · {cfg.label}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ActiveBadge active={pkg.is_active} />
              <ToggleButton id={pkg.id} active={pkg.is_active} onToggle={adminTogglePackage} onReload={onReload} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---- Junior slots tab ---- */
function SlotsTab({ clubId, slots, onReload }: { clubId: string; slots: JuniorSlot[]; onReload: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ anonymous_label: '', age_group: 'under_13' as AgeGroup, about: '' });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await adminAddJuniorSlot(clubId, {
        anonymous_label: form.anonymous_label.trim(),
        age_group: form.age_group,
        about: form.about.trim() || undefined,
      });
      if (!result.success) { setError(result.error); return; }
      setShowForm(false);
      setForm({ anonymous_label: '', age_group: 'under_13', about: '' });
      onReload();
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{
        background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)',
        borderRadius: '10px', padding: '12px 14px', fontSize: '12px', color: '#fde047', lineHeight: 1.5,
      }}>
        <strong>Privacy:</strong> Only add an anonymous label (e.g. &ldquo;Junior Cricketer A&rdquo;), age group, and a non-identifying blurb. The real player&apos;s identity is held by you offline — never entered here.
      </div>
      {!showForm && (
        <button onClick={() => setShowForm(true)} style={addBtnStyle}>+ Add junior slot</button>
      )}
      {showForm && (
        <div style={formCardStyle}>
          <h3 style={{ fontWeight: 600, fontSize: '15px', color: '#fff', margin: '0 0 14px' }}>Add anonymous junior slot</h3>
          <div style={{ display: 'grid', gap: '10px' }}>
            <input
              placeholder='Anonymous label — e.g. "Junior Cricketer A"'
              value={form.anonymous_label}
              onChange={e => setForm(f => ({ ...f, anonymous_label: e.target.value }))}
              style={inputStyle}
            />
            <select value={form.age_group} onChange={e => setForm(f => ({ ...f, age_group: e.target.value as AgeGroup }))} style={inputStyle}>
              {(Object.keys(AGE_GROUP_LABELS) as AgeGroup[]).map(k => (
                <option key={k} value={k}>{AGE_GROUP_LABELS[k]}</option>
              ))}
            </select>
            <textarea
              placeholder='Non-identifying blurb — e.g. "Loves batting, plays for school team"'
              value={form.about}
              onChange={e => setForm(f => ({ ...f, about: e.target.value }))}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' as const }}
            />
          </div>
          {error && <p style={{ fontSize: '13px', color: '#f87171', marginTop: '8px' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button onClick={() => setShowForm(false)} style={cancelBtnStyle}>Cancel</button>
            <button onClick={handleCreate} disabled={isPending || !form.anonymous_label} style={confirmBtnStyle}>
              {isPending ? 'Saving…' : 'Add slot'}
            </button>
          </div>
        </div>
      )}
      {slots.map(slot => (
        <div key={slot.id} style={rowCardStyle}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>{slot.anonymous_label}</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>
              {AGE_GROUP_LABELS[slot.age_group]}{slot.about ? ` · ${slot.about}` : ''}
            </p>
          </div>
          <span style={{
            fontSize: '11px', padding: '3px 8px', borderRadius: '6px',
            background: slot.is_available ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)',
            color: slot.is_available ? '#4ade80' : 'rgba(255,255,255,0.3)',
            border: `1px solid ${slot.is_available ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.08)'}`,
          }}>
            {slot.is_available ? 'Available' : 'Sponsored'}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---- Sponsorships tab ---- */
function SponsorshipsTab({ sponsorships, onReload }: { sponsorships: Sponsorship[]; onReload: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {sponsorships.length === 0 && (
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', padding: '20px 0' }}>No sponsorships yet.</p>
      )}
      {sponsorships.map(s => {
        const pkgCfg = s.package ? BENEFIT_TYPE_CONFIG[s.package.benefit_type] : null;
        const date = new Date(s.sponsored_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        return (
          <div key={s.id} style={rowCardStyle}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                {pkgCfg && <span style={{ fontSize: '16px' }}>{pkgCfg.emoji}</span>}
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>
                  {s.package?.title ?? 'Sponsorship'} — {s.scores_paid.toLocaleString()} Scores
                </p>
              </div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                {date}
                {s.junior_slot && ` · ${s.junior_slot.anonymous_label} (${AGE_GROUP_LABELS[s.junior_slot.age_group]})`}
              </p>
              {s.message && (
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0', fontStyle: 'italic' }}>
                  &ldquo;{s.message}&rdquo;
                </p>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <StatusBadge status={s.status} />
              {s.status === 'active' && <FulfillButton sponsorshipId={s.id} onReload={onReload} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---- Small reusable pieces ---- */
function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span style={{
      fontSize: '11px', padding: '3px 8px', borderRadius: '6px',
      background: active ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)',
      color: active ? '#4ade80' : 'rgba(255,255,255,0.3)',
      border: `1px solid ${active ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.08)'}`,
    }}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function StatusBadge({ status }: { status: Sponsorship['status'] }) {
  const cfg = {
    active: { label: 'Active', color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' },
    fulfilled: { label: 'Fulfilled', color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)' },
    cancelled: { label: 'Cancelled', color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' },
  }[status];
  return (
    <span style={{
      fontSize: '11px', padding: '3px 8px', borderRadius: '6px',
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>
      {cfg.label}
    </span>
  );
}

function ToggleButton({ id, active, onToggle, onReload }: {
  id: string; active: boolean;
  onToggle: (id: string, v: boolean) => Promise<{ success: boolean; error?: string }>;
  onReload: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(async () => { await onToggle(id, !active); onReload(); })}
      style={{ ...cancelBtnStyle, flex: 'unset', fontSize: '12px', padding: '4px 10px' }}
    >
      {active ? 'Deactivate' : 'Activate'}
    </button>
  );
}

function FulfillButton({ sponsorshipId, onReload }: { sponsorshipId: string; onReload: () => void }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(async () => { await adminFulfillSponsorship(sponsorshipId); onReload(); })}
      style={{ ...confirmBtnStyle, flex: 'unset', fontSize: '12px', padding: '5px 12px' }}
    >
      {isPending ? '…' : 'Mark fulfilled'}
    </button>
  );
}

/* ---- Shared micro styles ---- */
const inputStyle: React.CSSProperties = {
  width: '100%', background: '#1a1a1a',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
  color: '#fff', padding: '9px 12px', fontSize: '13px',
  fontFamily: "'Inter', sans-serif", boxSizing: 'border-box',
};
const formCardStyle: React.CSSProperties = {
  background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '14px', padding: '18px',
};
const rowCardStyle: React.CSSProperties = {
  background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '12px', padding: '14px 16px',
  display: 'flex', alignItems: 'center', gap: '12px',
};
const addBtnStyle: React.CSSProperties = {
  width: 'fit-content', padding: '8px 16px', borderRadius: '10px',
  border: '1px dashed rgba(255,255,255,0.2)', background: 'transparent',
  color: 'rgba(255,255,255,0.6)', fontFamily: "'Inter', sans-serif",
  fontSize: '13px', fontWeight: 500, cursor: 'pointer',
};
const cancelBtnStyle: React.CSSProperties = {
  flex: 1, padding: '8px', borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
  color: 'rgba(255,255,255,0.5)', fontFamily: "'Inter', sans-serif",
  fontSize: '13px', cursor: 'pointer',
};
const confirmBtnStyle: React.CSSProperties = {
  flex: 2, padding: '8px', borderRadius: '8px', border: 'none',
  background: 'rgba(155,28,28,0.85)', color: '#fff',
  fontFamily: "'Inter', sans-serif", fontWeight: 600,
  fontSize: '13px', cursor: 'pointer',
};
