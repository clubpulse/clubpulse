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
        setMessages((current) => current.slice(0, -1));   // drop the unanswered message
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
    <div className="flex h-[calc(100dvh-11rem)] flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 md:h-[calc(100dvh-8rem)]">
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <div>
          <h1 className="font-semibold text-white">Your ClubPulse Coach</h1>
          <p className="text-xs text-neutral-500">Personal cricket coaching based on your stats</p>
        </div>
        {messages.length > 0 && <Button variant="ghost" size="sm" onClick={newChat} disabled={sending}>New chat</Button>}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="mt-6 space-y-3 text-center">
            <p className="text-sm text-neutral-400">Ask anything about your game, fitness or Scores.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => send(starter)}
                  className="rounded-full border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800"
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
          <div className="flex items-center gap-2 text-sm text-neutral-500"><Spinner /> Coach is thinking…</div>
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={send} disabled={sending} />
    </div>
  );
}
