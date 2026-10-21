'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ChatInput } from '@/components/companion/ChatInput';
import { ChatMessage } from '@/components/companion/ChatMessage';

export type DisplayMessage = { role: 'user' | 'assistant'; content: string };

const STARTERS = [
  'How can I score more runs this season?',
  'Give me a 20-minute net session for bowlers',
  'What should I eat before a match?',
];

export function ChatWindow({
  initialMessages,
  initialConversationId,
}: {
  initialMessages: DisplayMessage[];
  initialConversationId: string | null;
}) {
  const [messages, setMessages] = useState<DisplayMessage[]>(initialMessages);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  async function send(text: string) {
    setMessages((current) => [...current, { role: 'user', content: text }]);
    setSending(true);
    try {
      const res = await fetch('/api/ai/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationId: conversationId ?? undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? 'The coach is unavailable right now');
        setMessages((current) => current.slice(0, -1));
        return;
      }
      setConversationId(body.conversationId);
      setMessages((current) => [...current, { role: 'assistant', content: body.reply }]);
    } finally {
      setSending(false);
    }
  }

  function newChat() {
    setMessages([]);
    setConversationId(null);
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100dvh - 11rem)',
      overflow: 'hidden',
      borderRadius: '20px',
      border: '1px solid rgba(255,255,255,0.07)',
      background: '#0a0a0a',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '14px 18px',
      }}>
        <div>
          <p style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px', color: '#fff' }}>
            Your ClubPulse Coach
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
            Personal cricket coaching based on your stats
          </p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={newChat} disabled={sending}>New chat</Button>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.length === 0 && (
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: '0 0 16px' }}>
              Ask anything about your game, fitness or Scores.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => send(starter)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '999px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, color 0.15s',
                  }}
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <ChatMessage key={i} role={m.role} content={m.content} />
        ))}
        {sending && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
            <Spinner /> Coach is thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={send} disabled={sending} />
    </div>
  );
}
