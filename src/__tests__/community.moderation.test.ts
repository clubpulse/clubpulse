const create = jest.fn();
jest.mock('@/lib/ai/client', () => ({
  MODEL_FAST: 'test',
  getAnthropic: () => ({ messages: { create } }),
  extractText: (m: { text: string }) => m.text,
  parseJsonObject: (t: string) => { try { return JSON.parse(t); } catch { return null; } },
}));

import { checkContent } from '@/lib/community/moderation';

const ctx = { place: 'public', authorJunior: false, readerJunior: true } as const;
const KEY = process.env.ANTHROPIC_API_KEY;
afterEach(() => { create.mockReset(); if (KEY === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = KEY; });

describe('checkContent fails closed', () => {
  it('holds text when ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const r = await checkContent('Great net session tonight', ctx);
    expect(r.status).toBe('held');
    expect(r.status === 'held' && r.held).toBe(true);
    expect(create).not.toHaveBeenCalled();
  });
  it('holds text when the AI call throws', async () => {
    process.env.ANTHROPIC_API_KEY = 'test';
    create.mockRejectedValue(new Error('down'));
    expect((await checkContent('Great net session tonight', ctx)).status).toBe('held');
  });
  it('holds text when the AI answer cannot be read', async () => {
    process.env.ANTHROPIC_API_KEY = 'test';
    create.mockResolvedValue({ text: 'not json' });
    expect((await checkContent('Great net session tonight', ctx)).status).toBe('held');
  });
  it('lets text through only when the AI explicitly allows it', async () => {
    process.env.ANTHROPIC_API_KEY = 'test';
    create.mockResolvedValue({ text: '{"allow": true}' });
    expect((await checkContent('Great net session tonight', ctx)).status).toBe('live');
  });
  it('holds text the AI refuses', async () => {
    process.env.ANTHROPIC_API_KEY = 'test';
    create.mockResolvedValue({ text: '{"allow": false, "reason": "No."}' });
    expect((await checkContent('Great net session tonight', ctx)).status).toBe('held');
  });
});
