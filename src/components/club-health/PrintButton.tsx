'use client';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '10px',
        padding: '8px 14px',
        color: 'rgba(255,255,255,0.7)',
        fontSize: '13px',
        cursor: 'pointer',
      }}
    >
      Download Report
    </button>
  );
}
