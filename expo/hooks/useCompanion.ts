import { useCallback, useState } from 'react';
import { api, ApiError, type CompanionResponse } from '../lib/api';

export type CompanionMessage = { id: string; role: 'user' | 'assistant'; content: string };

let counter = 0;
const nextId = () => `m${Date.now()}-${counter++}`;

export function useCompanion() {
  const [messages, setMessages] = useState<CompanionMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      setError(null);
      setMessages((current) => [...current, { id: nextId(), role: 'user', content: trimmed }]);
      setSending(true);
      try {
        const response = await api<CompanionResponse>('/api/ai/companion', {
          method: 'POST',
          body: { message: trimmed, conversationId: conversationId ?? undefined },
        });
        setConversationId(response.conversationId);
        setMessages((current) => [...current, { id: nextId(), role: 'assistant', content: response.reply }]);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'The coach is unavailable right now');
        setMessages((current) => current.slice(0, -1));   // drop the unanswered message
      } finally {
        setSending(false);
      }
    },
    [conversationId, sending]
  );

  const reset = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  }, []);

  return { messages, sending, error, send, reset };
}
