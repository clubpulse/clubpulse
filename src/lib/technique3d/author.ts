// Hand-authored reference shapes. Joint angles are keyframed here and turned into a 33-point
// skeleton. Nothing in this file is traced from a person's footage.

import { add, rotY, roundVec, scale } from './math';
import type { PhaseMarker, PoseFrame, TechniqueReference, Vec3 } from './types';

type Side = { shoulderFlex: number; elbowFlex: number; hipFlex: number; kneeFlex: number };
type BodyPose = { hipYaw: number; shoulderYaw: number; torsoLean: number; left: Side; right: Side };

const HIP = 0.11;
const SHOULDER = 0.19;
const TORSO = 0.5;
const UPPER = 0.28;
const FORE = 0.25;
const THIGH = 0.42;
const SHIN = 0.4;

function rotX(v: Vec3, degrees: number): Vec3 {
  const a = (degrees * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c];
}

function unit(v: Vec3): Vec3 {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return scale(v, 1 / n);
}

function limbDir(yaw: number, flexFromDown: number): Vec3 {
  return unit(rotY(rotX([0, -1, 0], -flexFromDown), yaw));
}

function bend(direction: Vec3, flex: number, yaw: number): Vec3 {
  return unit(rotY(rotX(rotY(direction, -yaw), flex), yaw));
}

export function poseFrame(pose: BodyPose): PoseFrame {
  const up = unit(rotY(rotX([0, 1, 0], pose.torsoLean), pose.hipYaw));
  const hipAcross = unit(rotY([1, 0, 0], pose.hipYaw));
  const shoulderAcross = unit(rotY(rotX([1, 0, 0], pose.torsoLean), pose.shoulderYaw));
  const shoulderCenter = scale(up, TORSO);
  const hipL = scale(hipAcross, -HIP);
  const hipR = scale(hipAcross, HIP);
  const shL = add(shoulderCenter, scale(shoulderAcross, -SHOULDER));
  const shR = add(shoulderCenter, scale(shoulderAcross, SHOULDER));

  const arm = (shoulder: Vec3, side: Side) => {
    const upper = limbDir(pose.shoulderYaw, side.shoulderFlex);
    const elbow = add(shoulder, scale(upper, UPPER));
    const wrist = add(elbow, scale(bend(upper, side.elbowFlex, pose.shoulderYaw), FORE));
    return { elbow, wrist };
  };
  const leg = (hip: Vec3, side: Side) => {
    const thigh = limbDir(pose.hipYaw, side.hipFlex);
    const knee = add(hip, scale(thigh, THIGH));
    const ankle = add(knee, scale(bend(thigh, side.kneeFlex, pose.hipYaw), SHIN));
    return { knee, ankle };
  };

  const leftArm = arm(shL, pose.left);
  const rightArm = arm(shR, pose.right);
  const leftLeg = leg(hipL, pose.left);
  const rightLeg = leg(hipR, pose.right);
  const nose = add(shoulderCenter, scale(up, 0.22));
  const forward = unit(rotY([0, 0, 1], pose.hipYaw));
  const blank = (): Vec3 => [0, 0, 0];
  const points: PoseFrame = Array.from({ length: 33 }, blank);

  const place = (index: number, point: Vec3) => { points[index] = roundVec(point); };
  place(0, nose);
  place(2, add(nose, add(scale(shoulderAcross, -0.03), scale(forward, 0.04))));
  place(5, add(nose, add(scale(shoulderAcross, 0.03), scale(forward, 0.04))));
  place(7, add(nose, scale(shoulderAcross, -0.08)));
  place(8, add(nose, scale(shoulderAcross, 0.08)));
  place(9, add(nose, add(scale(up, -0.04), scale(forward, 0.03))));
  place(10, add(nose, add(scale(up, -0.04), scale(forward, 0.03))));
  place(11, shL);
  place(12, shR);
  place(13, leftArm.elbow);
  place(14, rightArm.elbow);
  place(15, leftArm.wrist);
  place(16, rightArm.wrist);
  place(17, add(leftArm.wrist, scale(shoulderAcross, -0.03)));
  place(18, add(rightArm.wrist, scale(shoulderAcross, 0.03)));
  place(19, add(leftArm.wrist, scale(forward, 0.04)));
  place(20, add(rightArm.wrist, scale(forward, 0.04)));
  place(21, add(leftArm.wrist, scale(up, -0.02)));
  place(22, add(rightArm.wrist, scale(up, -0.02)));
  place(23, hipL);
  place(24, hipR);
  place(25, leftLeg.knee);
  place(26, rightLeg.knee);
  place(27, leftLeg.ankle);
  place(28, rightLeg.ankle);
  place(29, add(leftLeg.ankle, scale(forward, -0.04)));
  place(30, add(rightLeg.ankle, scale(forward, -0.04)));
  place(31, add(leftLeg.ankle, scale(forward, 0.1)));
  place(32, add(rightLeg.ankle, scale(forward, 0.1)));
  for (const index of [1, 3, 4, 6]) place(index, points[index === 1 || index === 3 ? 2 : 5]);
  return points;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpSide(a: Side, b: Side, t: number): Side {
  return {
    shoulderFlex: lerp(a.shoulderFlex, b.shoulderFlex, t),
    elbowFlex: lerp(a.elbowFlex, b.elbowFlex, t),
    hipFlex: lerp(a.hipFlex, b.hipFlex, t),
    kneeFlex: lerp(a.kneeFlex, b.kneeFlex, t),
  };
}

function lerpPose(a: BodyPose, b: BodyPose, t: number): BodyPose {
  const s = t * t * (3 - 2 * t);
  return {
    hipYaw: lerp(a.hipYaw, b.hipYaw, s),
    shoulderYaw: lerp(a.shoulderYaw, b.shoulderYaw, s),
    torsoLean: lerp(a.torsoLean, b.torsoLean, s),
    left: lerpSide(a.left, b.left, s),
    right: lerpSide(a.right, b.right, s),
  };
}

function clip(keys: Array<[number, BodyPose]>, frames = 48): PoseFrame[] {
  const out: PoseFrame[] = [];
  for (let i = 0; i < frames; i++) {
    let prev = keys[0];
    let next = keys[keys.length - 1];
    for (let k = 0; k < keys.length - 1; k++) {
      if (i >= keys[k][0] && i <= keys[k + 1][0]) { prev = keys[k]; next = keys[k + 1]; break; }
    }
    const span = next[0] - prev[0] || 1;
    out.push(poseFrame(lerpPose(prev[1], next[1], (i - prev[0]) / span)));
  }
  return out;
}

const side = (over: Partial<Side>): Side => ({ shoulderFlex: 20, elbowFlex: 15, hipFlex: 0, kneeFlex: 10, ...over });

const gather: BodyPose = {
  hipYaw: -25, shoulderYaw: -40, torsoLean: 12,
  left: side({ shoulderFlex: 90, elbowFlex: 20, hipFlex: 15, kneeFlex: 25 }),
  right: side({ shoulderFlex: 35, elbowFlex: 25, hipFlex: -15, kneeFlex: 35 }),
};
const backFoot: BodyPose = {
  hipYaw: -15, shoulderYaw: -45, torsoLean: 18,
  left: side({ shoulderFlex: 110, elbowFlex: 18, hipFlex: 30, kneeFlex: 55 }),
  right: side({ shoulderFlex: 55, elbowFlex: 20, hipFlex: -8, kneeFlex: 42 }),
};
const frontFoot: BodyPose = {
  hipYaw: 8, shoulderYaw: -18, torsoLean: 16,
  left: side({ shoulderFlex: 140, elbowFlex: 12, hipFlex: 38, kneeFlex: 8 }),
  right: side({ shoulderFlex: 120, elbowFlex: 15, hipFlex: -20, kneeFlex: 25 }),
};
const release: BodyPose = {
  hipYaw: 12, shoulderYaw: 28, torsoLean: 14,
  left: side({ shoulderFlex: 70, elbowFlex: 25, hipFlex: 36, kneeFlex: 10 }),
  right: side({ shoulderFlex: 172, elbowFlex: 8, hipFlex: -25, kneeFlex: 20 }),
};
const follow: BodyPose = {
  hipYaw: 30, shoulderYaw: 40, torsoLean: 32,
  left: side({ shoulderFlex: 30, elbowFlex: 40, hipFlex: 20, kneeFlex: 18 }),
  right: side({ shoulderFlex: 150, elbowFlex: 20, hipFlex: -10, kneeFlex: 30 }),
};

const yorkerRelease: BodyPose = {
  ...release,
  hipYaw: -8,
  shoulderYaw: -6,
  torsoLean: 22,
  right: side({ shoulderFlex: 150, elbowFlex: 14, hipFlex: -18, kneeFlex: 22 }),
  left: side({ shoulderFlex: 60, elbowFlex: 30, hipFlex: 40, kneeFlex: 6 }),
};

function bowling(keys: Array<[number, BodyPose]>, extra: Pick<TechniqueReference, 'id' | 'title' | 'summary' | 'keyEvent' | 'keyEventFrame'> & { alignEvents: PhaseMarker[] }): TechniqueReference {
  return { mode: 'bowling', hand: 'right', fps: 24, frames: clip(keys), ...extra };
}

const driveStance: BodyPose = {
  hipYaw: 0, shoulderYaw: -5, torsoLean: 8,
  left: side({ shoulderFlex: 40, elbowFlex: 35, hipFlex: 8, kneeFlex: 15 }),
  right: side({ shoulderFlex: 25, elbowFlex: 20, hipFlex: -5, kneeFlex: 12 }),
};
const backlift: BodyPose = {
  hipYaw: -8, shoulderYaw: -20, torsoLean: 6,
  left: side({ shoulderFlex: 115, elbowFlex: 45, hipFlex: 10, kneeFlex: 18 }),
  right: side({ shoulderFlex: 80, elbowFlex: 40, hipFlex: 0, kneeFlex: 16 }),
};
const driveContact: BodyPose = {
  hipYaw: 10, shoulderYaw: 18, torsoLean: 12,
  left: side({ shoulderFlex: 95, elbowFlex: 22, hipFlex: 42, kneeFlex: 16 }),
  right: side({ shoulderFlex: 70, elbowFlex: 30, hipFlex: -12, kneeFlex: 20 }),
};
const defenceContact: BodyPose = {
  hipYaw: -4, shoulderYaw: -8, torsoLean: 10,
  left: side({ shoulderFlex: 75, elbowFlex: 68, hipFlex: 8, kneeFlex: 22 }),
  right: side({ shoulderFlex: 55, elbowFlex: 50, hipFlex: -6, kneeFlex: 38 }),
};

export function authoredReferences(): TechniqueReference[] {
  return [
    bowling([
      [0, gather], [12, backFoot], [20, frontFoot], [26, release], [40, follow], [47, follow],
    ], {
      id: 'fast-bowling',
      title: 'Fast bowling action',
      summary: 'A drawn fast-bowling action, from gather through release. It is a SHIFTUP shape, not anyone\'s footage.',
      keyEvent: 'release',
      keyEventFrame: 26,
      alignEvents: [
        { id: 'gather', label: 'Gather', frame: 0 },
        { id: 'back_foot_contact', label: 'Back-foot contact', frame: 12 },
        { id: 'front_foot_contact', label: 'Front-foot contact', frame: 20 },
        { id: 'release', label: 'Release', frame: 26 },
        { id: 'follow_through', label: 'Follow-through', frame: 40 },
      ],
    }),
    bowling([
      [0, gather], [12, backFoot], [22, { ...frontFoot, torsoLean: 24, left: side({ shoulderFlex: 130, elbowFlex: 16, hipFlex: 44, kneeFlex: 5 }) }], [28, yorkerRelease], [42, follow], [47, follow],
    ], {
      id: 'inswinging-yorker',
      title: 'In-swinging yorker',
      summary: 'A drawn shape for an in-swinging yorker: the chest stays more side-on and the bowling arm is a little rounder at release. It does not measure swing.',
      keyEvent: 'release',
      keyEventFrame: 28,
      alignEvents: [
        { id: 'gather', label: 'Gather', frame: 0 },
        { id: 'back_foot_contact', label: 'Back-foot contact', frame: 12 },
        { id: 'front_foot_contact', label: 'Front-foot contact', frame: 22 },
        { id: 'release', label: 'Release', frame: 28 },
        { id: 'follow_through', label: 'Follow-through', frame: 42 },
      ],
    }),
    {
      id: 'front-foot-drive',
      title: 'Front-foot drive',
      mode: 'batting',
      hand: 'right',
      summary: 'A drawn front-foot drive. The hands and the front leg are a coaching shape, not a traced player.',
      keyEvent: 'bat_ball_contact',
      keyEventFrame: 24,
      fps: 24,
      alignEvents: [
        { id: 'stance', label: 'Stance', frame: 0 },
        { id: 'backlift', label: 'Backlift', frame: 10 },
        { id: 'front_foot_contact', label: 'Front-foot contact', frame: 18 },
        { id: 'bat_ball_contact', label: 'Bat-ball contact', frame: 24 },
        { id: 'follow_through', label: 'Follow-through', frame: 36 },
      ],
      frames: clip([[0, driveStance], [10, backlift], [18, { ...driveContact, left: { ...driveContact.left, hipFlex: 40, kneeFlex: 20 } }], [24, driveContact], [36, { ...driveContact, shoulderYaw: 30, left: side({ shoulderFlex: 120, elbowFlex: 18, hipFlex: 30, kneeFlex: 18 }) }], [47, driveContact]]),
    },
    {
      id: 'back-foot-defence',
      title: 'Back-foot defence',
      mode: 'batting',
      hand: 'right',
      summary: 'A drawn back-foot defence with a shorter backlift and a softer front elbow. It is not taken from a match.',
      keyEvent: 'bat_ball_contact',
      keyEventFrame: 22,
      fps: 24,
      alignEvents: [
        { id: 'stance', label: 'Stance', frame: 0 },
        { id: 'backlift', label: 'Backlift', frame: 8 },
        { id: 'back_foot_contact', label: 'Back-foot contact', frame: 16 },
        { id: 'bat_ball_contact', label: 'Bat-ball contact', frame: 22 },
        { id: 'hold', label: 'Hold', frame: 34 },
      ],
      frames: clip([[0, driveStance], [8, { ...backlift, left: side({ shoulderFlex: 80, elbowFlex: 55, hipFlex: 6, kneeFlex: 16 }) }], [16, defenceContact], [22, defenceContact], [34, defenceContact], [47, defenceContact]]),
    },
  ];
}
