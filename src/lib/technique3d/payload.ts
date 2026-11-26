import { isPoseFrame } from './math';
import type { AlignEvent, TechniqueHand, TechniqueMode, TechniquePose, Vec3 } from './types';
import { POSE_LANDMARKS } from './types';

const MODES = new Set<TechniqueMode>(['bowling', 'batting']);
const HANDS = new Set<TechniqueHand>(['right', 'left']);
const EVENTS = new Set<AlignEvent>(['back_foot_contact', 'front_foot_contact', 'release', 'bat_ball_contact']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED = new Set(['mode', 'hand', 'keyEvent', 'keyEventFrame', 'times', 'frames', 'analysisId']);

export function parseTechniquePose(body: unknown): { ok: true; value: TechniquePose } | { ok: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'The 3D estimate could not be read.' };
  const record = body as Record<string, unknown>;
  if (Object.keys(record).some((key) => !ALLOWED.has(key))) return { ok: false, error: 'The 3D estimate could not be read.' };
  if (!MODES.has(record.mode as TechniqueMode) || !HANDS.has(record.hand as TechniqueHand)) return { ok: false, error: 'Choose bowling or batting.' };
  if (!EVENTS.has(record.keyEvent as AlignEvent)) return { ok: false, error: 'The 3D estimate could not be read.' };
  if (!Array.isArray(record.frames) || record.frames.length < 8 || record.frames.length > 200) return { ok: false, error: 'That clip did not produce a usable 3D estimate.' };
  if (!record.frames.every(isPoseFrame)) return { ok: false, error: 'That clip did not produce a usable 3D estimate.' };
  if (!Array.isArray(record.times) || record.times.length !== record.frames.length) return { ok: false, error: 'That clip did not produce a usable 3D estimate.' };
  const times = record.times as unknown[];
  if (!times.every((time, i) => typeof time === 'number' && Number.isFinite(time) && time >= 0 && time <= 20 && (i === 0 || time >= (times[i - 1] as number)))) {
    return { ok: false, error: 'That clip did not produce a usable 3D estimate.' };
  }
  const keyEventFrame = record.keyEventFrame;
  if (typeof keyEventFrame !== 'number' || !Number.isInteger(keyEventFrame) || keyEventFrame < 0 || keyEventFrame >= record.frames.length) {
    return { ok: false, error: 'The 3D estimate could not be read.' };
  }
  const analysisId = record.analysisId == null ? null : record.analysisId;
  if (analysisId !== null && (typeof analysisId !== 'string' || !UUID.test(analysisId))) return { ok: false, error: 'The 3D estimate could not be read.' };
  return {
    ok: true,
    value: {
      mode: record.mode as TechniqueMode,
      hand: record.hand as TechniqueHand,
      keyEvent: record.keyEvent as AlignEvent,
      keyEventFrame,
      times: times as number[],
      frames: record.frames as Vec3[][],
      analysisId,
    },
  };
}

export function landmarkCount(): number {
  return POSE_LANDMARKS;
}
