'use client';

import { useState } from 'react';
import type { ChildWithConsents, ConsentType } from '@/lib/types/parent';
import { CONSENT_LABELS, computeAge } from '@/lib/types/parent';
import { card, cardTitle, muted, primaryBtn } from '@/components/play/ui';

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
