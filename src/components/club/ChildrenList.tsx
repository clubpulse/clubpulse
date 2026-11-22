'use client';

import { useState } from 'react';
import type { ChildWithConsents, ConsentType } from '@/lib/types/parent';
import { CONSENT_LABELS, computeAge } from '@/lib/types/parent';
import { card, cardTitle, muted, primaryBtn } from '@/components/play/ui';
import { linkChildAccountAction, unlinkChildAccountAction } from '@/lib/actions/child-link';

interface Props {
  initialChildren: ChildWithConsents[];
}

const ALL_CONSENT_TYPES: ConsentType[] = [
  'general_participation', 'photo_video', 'data_processing',
  'medical_treatment', 'travel', 'social_media', 'coaching_observation',
];

export default function ChildrenList({ initialChildren }: Props) {
  const [children] = useState(initialChildren);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Record<string, string>>({});

  const runLink = async (childId: string, run: () => Promise<{ success: boolean; error?: string; message?: string }>) => {
    setBusy(childId);
    try {
      const r = await run();
      setNotice((n) => ({ ...n, [childId]: r.success ? (r.message ?? 'Done.') : (r.error ?? 'Could not do that.') }));
      if (r.success) window.location.reload();
    } finally { setBusy(null); }
  };

  const handleVerifyLink = async (linkId: string) => {
    setVerifying(linkId);
    try {
      await fetch('/api/club/children', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId }),
      });
      window.location.reload();
    } finally {
      setVerifying(null);
    }
  };

  return (
    <div>
      <h3 style={cardTitle}>Registered Children ({children.length})</h3>
      {children.length === 0 && <p style={muted}>No children registered yet.</p>}

      {children.map(child => {
        const age = computeAge(child.date_of_birth);
        const consentMap = new Map(child.consents.map(c => [c.consent_type, c.action]));
        const grantedCount = child.consents.filter(c => c.action === 'granted').length;
        const isExpanded = expanded === child.id;

        return (
          <div key={child.id} style={{ ...card, marginBottom: '0.5rem' }}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setExpanded(isExpanded ? null : child.id)}
            >
              <div>
                <div style={{ fontWeight: 600, color: '#fff' }}>
                  {child.first_name} {child.last_name}
                  <span style={{ ...muted, marginLeft: '0.5rem', fontWeight: 400 }}>Age {age}</span>
                </div>
                <div style={muted}>
                  {child.links.length} parent/guardian · {grantedCount}/{ALL_CONSENT_TYPES.length} consents
                </div>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>{isExpanded ? '▲' : '▼'}</span>
            </div>

            {isExpanded && (
              <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem' }}>
                {/* Parent/Guardian links */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ ...muted, fontWeight: 600, marginBottom: '0.25rem' }}>Parents / Guardians</div>
                  {child.links.map(link => (
                    <div key={link.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}>
                      <div>
                        <span style={{ color: '#fff' }}>{link.parent_name}</span>
                        <span style={muted}> · {link.relationship}</span>
                        {link.is_primary && <span style={{ color: '#00C853', marginLeft: '0.5rem', fontSize: '0.8rem' }}>Primary</span>}
                      </div>
                      <div>
                        {link.verified_at ? (
                          <span style={{ color: '#00C853', fontSize: '0.8rem' }}>✓ Verified</span>
                        ) : (
                          <button
                            style={{ ...smallBtn, background: 'rgba(0,200,83,0.15)', color: '#00C853' }}
                            disabled={verifying === link.id}
                            onClick={(e) => { e.stopPropagation(); handleVerifyLink(link.id); }}
                          >Verify</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* The child's own account, which makes them a junior in the Community */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ ...muted, fontWeight: 600, marginBottom: '0.25rem' }}>Community account</div>
                  {child.linked_account ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#fff' }}>{child.linked_account.name}<span style={muted}> · {child.linked_account.email}</span></span>
                      <button style={{ ...smallBtn, background: 'rgba(255,82,82,0.15)', color: '#ff5252' }} disabled={busy === child.id}
                        onClick={(e) => { e.stopPropagation(); if (window.confirm('Unlink this account? Their parents will no longer be told about new connections.')) runLink(child.id, () => unlinkChildAccountAction(child.id)); }}>Unlink</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <input type="email" placeholder="Email the child signed up with" value={emails[child.id] ?? ''}
                        onChange={(e) => setEmails((m) => ({ ...m, [child.id]: e.target.value }))} onClick={(e) => e.stopPropagation()}
                        style={{ flex: 1, minWidth: 220, padding: '6px 10px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#fff' }} />
                      <button style={{ ...smallBtn, background: 'rgba(0,200,83,0.15)', color: '#00C853' }} disabled={busy === child.id || !(emails[child.id] ?? '').includes('@')}
                        onClick={(e) => { e.stopPropagation(); runLink(child.id, () => linkChildAccountAction(child.id, emails[child.id] ?? '')); }}>Link account</button>
                    </div>
                  )}
                  {notice[child.id] && <div style={{ ...muted, marginTop: '0.25rem' }}>{notice[child.id]}</div>}
                </div>

                {/* Consent status */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ ...muted, fontWeight: 600, marginBottom: '0.25rem' }}>Consent Status</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.25rem' }}>
                    {ALL_CONSENT_TYPES.map(ct => {
                      const state = consentMap.get(ct);
                      return (
                        <div key={ct} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: state === 'granted' ? '#00C853' : state === 'withdrawn' ? '#ff5252' : 'rgba(255,255,255,0.2)',
                            display: 'inline-block',
                          }} />
                          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                            {CONSENT_LABELS[ct]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Emergency contact */}
                {child.emergency_contact_name && (
                  <div style={muted}>
                    Emergency: {child.emergency_contact_name}
                    {child.emergency_contact_phone ? ` · ${child.emergency_contact_phone}` : ''}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const smallBtn: React.CSSProperties = {
  padding: '4px 10px', borderRadius: 4, border: 'none',
  cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
};
