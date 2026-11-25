/**
 * One framing prompt at a time, from the live pose or the key frame of an upload.
 * The size cuts are the same ones the score already uses: under 25% of the picture is too far
 * to read, and under 36% is still not a close enough net shot.
 */
import { detectView, playerSize, wholeBodyVisible, type Landmark, type View } from '@/lib/analysis/pose-metrics';

export const FRAMING_MIN = 0.25;
export const FRAMING_CLOSE = 0.36;

export function framingPrompt(lm: Landmark[] | null | undefined, chosen: View): string | null {
  if (!lm || !wholeBodyVisible(lm)) return 'Move so your whole body is in view';
  const size = playerSize(lm);
  if (size < FRAMING_CLOSE) return 'Step closer';
  // One live frame is enough. The clip check wants three so a single odd frame cannot switch the score.
  const detected = detectView([lm, lm, lm], 1000, 1000);
  if (detected.confident && detected.view !== chosen) {
    return chosen === 'side' ? 'Turn the phone sideways' : 'Face the camera';
  }
  return null;
}
