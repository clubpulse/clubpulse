export type Vec3 = [number, number, number];
/** 33 MediaPipe pose landmarks, metres, hip-centred, y up. */
export type PoseFrame = Vec3[];

export type TechniqueMode = 'bowling' | 'batting';
export type TechniqueHand = 'right' | 'left';
export type AlignEvent = 'back_foot_contact' | 'front_foot_contact' | 'release' | 'bat_ball_contact';

export type PhaseMarker = { id: AlignEvent | 'gather' | 'stance' | 'backlift' | 'follow_through' | 'hold'; label: string; frame: number };

export type TechniqueReference = {
  id: string;
  title: string;
  mode: TechniqueMode;
  hand: TechniqueHand;
  summary: string;
  keyEvent: AlignEvent;
  keyEventFrame: number;
  alignEvents: PhaseMarker[];
  fps: number;
  frames: PoseFrame[];
};

export type TechniquePose = {
  mode: TechniqueMode;
  hand: TechniqueHand;
  keyEvent: AlignEvent;
  keyEventFrame: number;
  times: number[];
  frames: PoseFrame[];
  analysisId: string | null;
};

export const ESTIMATE_NOTE = 'Estimate from one phone video, not a lab measurement.';

export const POSE_LANDMARKS = 33;
