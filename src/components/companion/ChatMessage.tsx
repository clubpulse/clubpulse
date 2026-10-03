export function ChatMessage({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser ? 'rounded-br-md bg-brand-primary text-white' : 'rounded-bl-md border border-neutral-800 bg-neutral-900 text-neutral-100'
        }`}
      >
        {content}
      </div>
    </div>
  );
}
