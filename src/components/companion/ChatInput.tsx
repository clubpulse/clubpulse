'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { MAX_MESSAGE_LENGTH } from '@/lib/ai/companion-limits';

export function ChatInput({ onSend, disabled }: { onSend: (text: string) => void; disabled: boolean }) {
  const [text, setText] = useState('');

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form
      onSubmit={submit}
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '8px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        padding: '12px 14px',
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        maxLength={MAX_MESSAGE_LENGTH}
        placeholder="Ask your coach anything…"
        aria-label="Message your coach"
        style={{
          flex: 1,
          resize: 'none',
          minHeight: '42px',
          maxHeight: '128px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)',
          background: '#161616',
          padding: '10px 12px',
          fontSize: '13px',
          color: '#fff',
          fontFamily: "'Inter', sans-serif",
          outline: 'none',
        }}
      />
      <Button type="submit" disabled={disabled || !text.trim()}>Send</Button>
    </form>
  );
}
