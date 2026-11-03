/**
 * Tests for POST /api/analysis/coaching-read
 *
 * The route: accepts ball-track data → calls Anthropic API server-side
 * → returns a plain-English coaching paragraph.
 *
 * We mock the Anthropic SDK so no real API calls are made.
 */

import { NextRequest } from 'next/server';

// ── Mock Anthropic SDK ────────────────────────────────────────────────────────

const mockCreate = jest.fn();

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: (...args: unknown[]) => mockCreate(...args) },
  }));
});

// ── Import AFTER mock ─────────────────────────────────────────────────────────

import { POST } from '@/app/api/analysis/coaching-read/route';

// ── Helpers ───────────────────────────────────────────────────────────────────

interface CoachingBody {
  speed_kph?:    number | null;
  swing_px?:     number;
  bounce_frame?: number | null;
  detections?:   number;
  frames?:       number;
  white_ball?:   boolean;
}

function makeRequest(body: CoachingBody): NextRequest {
  return new NextRequest('http://localhost/api/analysis/coaching-read', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
}

const SAMPLE_BODY: CoachingBody = {
  speed_kph:    128.4,
  swing_px:     18,
  bounce_frame: 55,
  detections:   90,
  frames:       120,
  white_ball:   false,
};

const MOCK_PARAGRAPH = 'A disciplined away-swinging delivery at good pace. Work on hitting a full length consistently to maximise the movement. Try the "corridor of uncertainty" drill — aim at off-stump with a full-length target marker.';

function mockAnthropicSuccess(text = MOCK_PARAGRAPH) {
  mockCreate.mockResolvedValue({
    content: [{ type: 'text', text }],
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/analysis/coaching-read', () => {
  it('returns 200 with a coaching paragraph on success', async () => {
    mockAnthropicSuccess();

    const res  = await POST(makeRequest(SAMPLE_BODY));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.paragraph).toBe(MOCK_PARAGRAPH);
  });

  it('calls the Anthropic messages.create with claude-haiku model', async () => {
    mockAnthropicSuccess();
    await POST(makeRequest(SAMPLE_BODY));

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-haiku-4-5-20251001' })
    );
  });

  it('includes speed, swing and bounce data in the prompt', async () => {
    mockAnthropicSuccess();
    await POST(makeRequest(SAMPLE_BODY));

    const call = mockCreate.mock.calls[0][0];
    const prompt: string = call.messages[0].content;

    expect(prompt).toContain('128.4 kph');
    expect(prompt).toContain('away swing');
    expect(prompt).toContain('frame 55');
  });

  it('handles null speed_kph gracefully in the prompt', async () => {
    mockAnthropicSuccess();
    await POST(makeRequest({ ...SAMPLE_BODY, speed_kph: null }));

    const prompt: string = mockCreate.mock.calls[0][0].messages[0].content;
    expect(prompt).toContain('unknown');
  });

  it('reports straight when |swing_px| < 5', async () => {
    mockAnthropicSuccess();
    await POST(makeRequest({ ...SAMPLE_BODY, swing_px: 2 }));

    const prompt: string = mockCreate.mock.calls[0][0].messages[0].content;
    expect(prompt).toContain('straight');
  });

  it('reports in-swing for negative swing_px', async () => {
    mockAnthropicSuccess();
    await POST(makeRequest({ ...SAMPLE_BODY, swing_px: -22 }));

    const prompt: string = mockCreate.mock.calls[0][0].messages[0].content;
    expect(prompt).toContain('in-swing');
  });

  it('notes white ball in the prompt when white_ball=true', async () => {
    mockAnthropicSuccess();
    await POST(makeRequest({ ...SAMPLE_BODY, white_ball: true }));

    const prompt: string = mockCreate.mock.calls[0][0].messages[0].content;
    expect(prompt).toContain('white');
  });

  it('calculates and includes detection coverage percentage', async () => {
    mockAnthropicSuccess();
    // 90 / 120 = 75%
    await POST(makeRequest({ ...SAMPLE_BODY, detections: 90, frames: 120 }));

    const prompt: string = mockCreate.mock.calls[0][0].messages[0].content;
    expect(prompt).toContain('75%');
  });

  it('returns 500 when the Anthropic SDK throws', async () => {
    mockCreate.mockRejectedValue(new Error('rate limit'));

    const res = await POST(makeRequest(SAMPLE_BODY));
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toMatch(/failed to generate/i);
  });

  it('limits the response to max_tokens: 300', async () => {
    mockAnthropicSuccess();
    await POST(makeRequest(SAMPLE_BODY));

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: 300 })
    );
  });
});
