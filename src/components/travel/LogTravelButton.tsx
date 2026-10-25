'use client';

import { useState } from 'react';
import { LogTravelForm } from './LogTravelForm';

interface Props {
  clubId: string;
}

export function LogTravelButton({ clubId }: Props) {
  const [open, setOpen] = useState(false);
  const [successCreds, setSuccessCreds] = useState<number | null>(null);

  function handleSuccess(creds: number) {
    setSuccessCreds(creds);
    setOpen(false);
    setTimeout(() => setSuccessCreds(null), 4000);
  }

  return (
    <>
      {successCreds !== null && (
        <div style={{
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '14px',
          color: '#4ade80',
          marginBottom: '4px',
        }}>
          Trip logged! You earned <strong>{successCreds} Scores</strong>. 🎉
        </div>
      )}

      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 18px',
          borderRadius: '10px',
          border: 'none',
          background: '#9b1c1c',
          color: '#fff',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <span>✈️</span> Log a trip
      </button>

      {open && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: '16px',
        }}>
          <div style={{
            background: '#111',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: '18px',
            padding: '24px',
            width: '100%',
            maxWidth: '460px',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <h2 style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800, fontSize: '18px',
              color: '#fff', margin: '0 0 20px',
            }}>
              Log a trip ✈️
            </h2>
            <LogTravelForm
              clubId={clubId}
              onSuccess={handleSuccess}
              onCancel={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
