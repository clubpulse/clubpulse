import type { AlignEvent, PoseFrame, TechniqueHand, TechniqueMode } from './types';

function series(frames: PoseFrame[], index: number): number[] {
  return frames.map((frame) => frame[index]?.[1] ?? 0);
}

function valleys(values: number[]): number[] {
  const found: number[] = [];
  for (let i = 1; i < values.length - 1; i++) {
    if (values[i] <= values[i - 1] && values[i] <= values[i + 1] && values[i - 1] - values[i] >= 0.002) found.push(i);
  }
  return found;
}

function lowest(values: number[], from = 0, to = values.length): number {
  let at = from;
  for (let i = from; i < to; i++) if (values[i] < values[at]) at = i;
  return at;
}

function highest(values: number[], from = 0): number {
  let at = from;
  for (let i = from; i < values.length; i++) if (values[i] > values[at]) at = i;
  return at;
}

function feet(hand: TechniqueHand): { back: number; front: number; wrist: number } {
  // A right-hander leads with the left leg and, when bowling, releases with the right hand.
  return hand === 'right' ? { back: 28, front: 27, wrist: 16 } : { back: 27, front: 28, wrist: 15 };
}

export type ClipEvents = Partial<Record<AlignEvent, number>>;

/** Key moments from a hip-centred clip. These are estimates from the skeleton, not measured contacts. */
export function detectEvents(frames: PoseFrame[], mode: TechniqueMode, hand: TechniqueHand): ClipEvents {
  if (frames.length < 3) return {};
  const { back, front, wrist } = feet(hand);
  const backY = series(frames, back);
  const frontY = series(frames, front);
  const backFoot = valleys(backY)[0] ?? lowest(backY, 0, Math.max(2, Math.floor(frames.length * 0.7)));
  const frontCandidates = valleys(frontY).filter((index) => index > backFoot);
  const frontFoot = frontCandidates[0] ?? lowest(frontY, Math.min(frames.length - 1, backFoot));
  if (mode === 'bowling') {
    const wristY = series(frames, wrist);
    return { back_foot_contact: backFoot, front_foot_contact: frontFoot, release: highest(wristY, frontFoot) };
  }
  const speeds: number[] = [0];
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1][wrist];
    const b = frames[i][wrist];
    speeds.push(a && b ? Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) : 0);
  }
  let contact = 1;
  for (let i = 1; i < speeds.length; i++) if (speeds[i] > speeds[contact]) contact = i;
  return { back_foot_contact: backFoot, front_foot_contact: frontFoot, bat_ball_contact: contact };
}
