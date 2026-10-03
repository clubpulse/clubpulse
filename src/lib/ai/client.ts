import Anthropic from '@anthropic-ai/sdk';

export const MODEL_FAST = 'claude-haiku-4-5';
export const MODEL_CHAT = 'claude-sonnet-4-5';

let client: Anthropic | null = null;

// Created lazily so importing a module that uses it doesn't throw at build time when
// ANTHROPIC_API_KEY isn't set; the error surfaces on the first real call instead.
export function getAnthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  client ??= new Anthropic({ apiKey });
  return client;
}

export function extractText(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
}

// Models sometimes wrap JSON in ``` fences or add a sentence around it
export function parseJsonObject<T>(text: string): T | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
