/**
 * POST /api/analysis/coaching-read
 *
 * Accepts ball-track results and returns a plain-English AI coaching paragraph.
 * Uses the Anthropic API server-side only — the key never reaches the client.
 *
 * Body (JSON):
 *   {
 *     speed_kph:    number | null
 *     swing_px:     number          (positive = away swing, negative = in-swing)
 *     bounce_frame: number | null
 *     detections:   number          (ball_positions.length)
 *     frames:       number          (frames_processed)
 *     white_ball:   boolean
 *   }
 *
 * Response 200:
 *   { paragraph: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;

    let prompt: string;

    // ── Pose analysis branch ─────────────────────────────────────────────────
    if (body.pose === true) {
      const { mode, hand, metrics, overall } = body as {
        mode:    string;
        hand:    string;
        metrics: Array<{ key: string; label: string; value: number; score: number }>;
        overall: number;
      };
      const discipline = mode === 'bowling' ? 'bowling' : 'batting';
      const handedness = hand === 'left' ? 'left-handed' : 'right-handed';
      const metricLines = metrics
        .map((m) => `- ${m.label}: score ${m.score}/100 (value ${typeof m.value === 'number' ? m.value.toFixed(1) : m.value})`)
        .join('\n');

      prompt = `You are a professional cricket coaching assistant. Based on the following pose-analysis scores from a ${handedness} ${discipline} session, write ONE concise coaching paragraph (3–5 sentences) that:
- Praises the strongest metric
- Identifies the weakest metric and explains why it matters
- Ends with one specific drill or cue the player can use at their next practice

Overall score: ${overall}/100

Metric breakdown:
${metricLines}

Tone: warm, British, specific. No headings, no bullet points, no markdown. Speak directly to the player.`;

    } else {
      // ── Ball-track branch ────────────────────────────────────────────────────
      const {
        speed_kph,
        swing_px,
        bounce_frame,
        detections,
        frames,
        white_ball,
      } = body as {
        speed_kph:    number | null;
        swing_px:     number;
        bounce_frame: number | null;
        detections:   number;
        frames:       number;
        white_ball:   boolean;
      };

      const speedStr    = speed_kph != null ? `${speed_kph} kph` : 'unknown (video angle may need adjustment)';
      const swingAbs    = Math.abs(swing_px);
      const swingDir    = swingAbs < 5 ? 'straight (no measurable swing)' : swing_px > 0 ? `${swingAbs.toFixed(0)} px of away swing` : `${swingAbs.toFixed(0)} px of in-swing`;
      const bounceStr   = bounce_frame != null ? `at frame ${bounce_frame}` : 'not detected';
      const coveragePct = frames > 0 ? Math.round((detections / frames) * 100) : 0;
      const ballType    = white_ball ? 'white' : 'red';

      prompt = `You are a professional cricket coaching assistant. Based on the following ball-tracking data from a bowling delivery, write ONE concise coaching paragraph (3–5 sentences) that:
- States what this delivery shows about the bowler's current form
- Highlights the strongest aspect and one specific area to develop
- Ends with one actionable drill or adjustment the bowler can try at next practice

Keep the tone encouraging and specific. Use cricket terminology naturally. Do NOT start with "This delivery" or repeat the numbers back verbatim — synthesise them into plain coaching insight.

Data:
- Ball: ${ballType}
- Speed: ${speedStr}
- Shape/movement: ${swingDir}
- Bounce: ${bounceStr}
- Detection coverage: ${coveragePct}% (${detections} of ${frames} frames)

Write only the paragraph — no headings, no bullet points, no markdown.`;
    }

    const message = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages:   [{ role: 'user', content: prompt }],
    });

    const paragraph = (message.content[0] as { type: string; text: string }).text.trim();

    return NextResponse.json({ paragraph });
  } catch (err) {
    console.error('[coaching-read]', err);
    return NextResponse.json({ error: 'Failed to generate coaching read' }, { status: 500 });
  }
}
