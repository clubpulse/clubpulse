export function ChatMessage({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const isUser = role === 'user';

  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: '85%',
        whiteSpace: 'pre-wrap',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        padding: '10px 14px',
        fontSize: '13px',
        lineHeight: 1.6,
        fontFamily: "'Inter', sans-serif",
        background: isUser ? '#9b1c1c' : '#161616',
        border: isUser ? 'none' : '1px solid rgba(255,255,255,0.07)',
        color: isUser ? '#fff' : 'rgba(255,255,255,0.85)',
      }}>
        {content}
      </div>
    </div>
  );
}
