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
      const { mode, hand, shotType, metrics, overall } = body as {
        mode:      string;
        hand:      string;
        shotType?: string;
        metrics:   Array<{ key: string; label: string; value: number; score: number }>;
        overall:   number;
      };
      const discipline = mode === 'bowling' ? 'bowling' : 'batting';
      // Only known values reach the prompt
      const cameraView = (body as { view?: unknown }).view === 'front' ? 'front-on (looking down the pitch)' : 'side-on';
      const UNIQUE_NOTES: Record<string, string> = {
        'round-arm': 'a round-arm, slinging action',
        'bent-front-knee': 'bowling on a bent front knee',
        'wrong-footed': 'bowling off the wrong foot',
        'big-side-bend': 'a very large side bend at release, which is linked with lower back injury',
      };
      const uniqueRaw = (body as { unique?: unknown }).unique;
      const uniqueNotes = (Array.isArray(uniqueRaw) ? uniqueRaw : []).map((key) => UNIQUE_NOTES[String(key)]).filter(Boolean);
      const uniqueLine = uniqueNotes.length > 0
        ? `\nThis player has a unique action: ${uniqueNotes.join('; ')}. Treat it as their natural style. Do not tell them to change it or coach it out; say that a coach should look at it as its own action. If it carries an injury risk, say so plainly.\n`
        : '';
      const handedness = hand === 'left' ? 'left-handed' : 'right-handed';

      // Sort: worst first so the AI reasons about the most urgent issues
      const sorted = [...metrics].sort((a, b) => a.score - b.score);
      const worst  = sorted.slice(0, 3);
      const best   = sorted[sorted.length - 1];

      const metricLines = metrics
        .map((m) => `- ${m.label}: ${m.score}/100  (measured ${typeof m.value === 'number' ? m.value.toFixed(2) : m.value})`)
        .join('\n');

      if (discipline === 'batting') {
        const shotLabel = shotType
          ? { drive: 'drive', pull: 'pull/hook', cut: 'cut', sweep: 'sweep', defence: 'defensive push', leave: 'leave' }[shotType] ?? shotType
          : 'batting shot';

        // Identify meaningful combinations the AI should reason about
        const combos: string[] = [];
        const low  = (key: string) => (metrics.find(m => m.key === key)?.score ?? 100) < 55;
        const high = (key: string) => (metrics.find(m => m.key === key)?.score ?? 0)   > 70;

        if (low('frontElbow') && low('headStability'))
          combos.push('low front elbow paired with head movement — the bat face opens AND the eyes lose the ball');
        if (low('hipRotation') && low('weightTransfer'))
          combos.push('insufficient hip rotation combined with weight staying back — this drains power from the shot and tends to push balls to the wrong side');
        if (low('wristCock') && low('batSwingPlane'))
          combos.push('collapsed wrist cock alongside a flattening swing plane — the bat is arriving late and from the wrong angle');
        if (low('kneeFlex') && low('headOverKnee'))
          combos.push('stiff knees and the head drifting behind the front knee — the player is reaching rather than getting to the pitch of the ball');
        if (high('frontElbow') && low('hipRotation'))
          combos.push('the front elbow is high but the hips are not following through — arm strength is doing the work instead of body rotation');

        prompt = `You are an elite cricket batting coach. A ${handedness} batter just recorded a ${shotLabel} in pose analysis, filmed ${cameraView}.

Overall technique score: ${overall}/100

Metric breakdown (score/100 — lower = needs work):
${metricLines}

Three weakest areas this session: ${worst.map(m => `${m.label} (${m.score}/100)`).join(', ')}
Strongest area: ${best.label} (${best.score}/100)
${combos.length > 0 ? `\nMechanical combinations to reason about:\n${combos.map(c => `- ${c}`).join('\n')}` : ''}

Write ONE coaching paragraph (4–6 sentences) for this player. You must:
1. Acknowledge their best point briefly (one phrase, not a full sentence)
2. Focus the rest on the TWO most damaging weaknesses, explaining the mechanical chain (why each flaw produces the outcome it does for a ${shotLabel})
3. If a combination above is relevant, name it — a specific combined diagnosis is more useful than two separate observations
4. End with ONE concrete, phase-specific drill or mental cue for their very next session, tailored to the ${shotLabel}

Tone: direct, knowledgeable, British. Use proper cricket terms (bat face, loading position, follow-through, trigger movement, etc.).
No bullet points, no headings, no markdown. Speak directly to the player as "you". Under 120 words.`;

      } else {
        // Bowling prompt — improved but still concise
        prompt = `You are a professional cricket coaching assistant. A ${handedness} bowler just recorded a pose-analysis session, filmed ${cameraView}.
${uniqueLine}
Overall score: ${overall}/100

Metric breakdown:
${metricLines}

Weakest: ${worst[0].label} (${worst[0].score}/100)
Strongest: ${best.label} (${best.score}/100)

Write ONE coaching paragraph (3–5 sentences) that:
- Praises the strongest metric in one phrase
- Explains why the weakest metric matters mechanically for bowling (not just that it's low)
- Ends with one specific drill or bowling cue

Tone: warm, British, specific. No headings, no bullets, no markdown. Speak to the player directly. Under 100 words.`;
      }

    } else {
      // ── Ball-track branch ────────────────────────────────────────────────────
      const {
        speed_kph,
        swing_px,
        bounce_frame,
        detections,
        frames,
        white_ball,
        ball_colour,
      } = body as {
        speed_kph:    number | null;
        swing_px:     number;
        bounce_frame: number | null;
        detections:   number;
        frames:       number;
        white_ball:   boolean;
        ball_colour?: unknown;
      };

      const speedStr    = speed_kph != null ? `${speed_kph} kph` : 'unknown (video angle may need adjustment)';
      const swingAbs    = Math.abs(swing_px);
      const swingDir    = swingAbs < 5 ? 'straight (no measurable swing)' : swing_px > 0 ? `${swingAbs.toFixed(0)} px of away swing` : `${swingAbs.toFixed(0)} px of in-swing`;
      const bounceStr   = bounce_frame != null ? `at frame ${bounce_frame}` : 'not detected';
      const coveragePct = frames > 0 ? Math.round((detections / frames) * 100) : 0;
      // Only known colours reach the prompt
      const ballType    = ['red', 'white', 'pink', 'yellow'].includes(ball_colour as string) ? (ball_colour as string) : white_ball ? 'white' : 'red';

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
