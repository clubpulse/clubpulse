// Technique scoring from body landmarks (MediaPipe Pose). Pure functions, no browser needed.
//
// Batting is measured in a short window around contact. Bowling is measured at release, after the
// front foot lands. Averaging a whole clip, including the run-up or the walk back, says nothing
// about the action itself.
//
// The ideal ranges are coaching rules of thumb, not validated biomechanics. Treat scores as a guide.

/** One body point: x and y as a share of the frame (0 to 1), and how sure the model is it can see it */
export type Landmark = { x: number; y: number; z?: number; visibility?: number };

export const MIN_FRAMES = 10;
export const MIN_VISIBILITY = 0.5;

// MediaPipe Pose landmark indices ("left" is the player's own left)
export const L = { nose: 0, lShoulder: 11, rShoulder: 12, lElbow: 13, rElbow: 14, lWrist: 15, rWrist: 16,
  lHip: 23, rHip: 24, lKnee: 25, rKnee: 26, lAnkle: 27, rAnkle: 28 };

export type Mode = 'bowling' | 'batting';
export type Hand = 'right' | 'left';
export type Point = { x: number; y: number };

// Shot types — each has different biomechanical targets
export type ShotType = 'drive' | 'pull' | 'cut' | 'sweep' | 'defence' | 'leave';

export const SHOT_TYPE_LABELS: Record<ShotType, string> = {
  drive:   '🏏 Drive',
  pull:    '💪 Pull / Hook',
  cut:     '✂️ Cut',
  sweep:   '🧹 Sweep',
  defence: '🛡️ Defence',
  leave:   '🚶 Leave',
};

export type MetricDef = {
  key: string; label: string; unit: string;
  /** The acceptable range. Inside it scores 85 or more. */
  ideal: [number, number];
  /** The value that scores 100. Defaults to the middle of the range, or to 0 for a range starting at 0. */
  best?: number;
  /** How far outside the range the score reaches 0 */
  tolerance: number;
  tip: string;
};
export type ScoreConfidence = 'high' | 'medium' | 'low';

/** Shown instead of a number when the picture is too unclear to trust a score. */
export const LOW_CONFIDENCE_MESSAGE = 'try again: film side-on with your whole body in frame';

/** Shown with the score when the clip was shot below about 20 frames a second. */
export const LOW_FPS_MESSAGE = 'film at normal speed for a better reading';

export type MetricResult = MetricDef & {
  value: number; score: number;
  /** Shown, but left out of the overall score, because it is part of a unique action */
  excused?: boolean;
  /** How much to trust this number, from the tracking and the event detection. */
  confidence?: ScoreConfidence;
};

/** Where the camera is: square of the wicket (side-on), or looking straight down the pitch (front-on) */
export type View = 'side' | 'front';

/** A measure at or above this is on target: it is inside its range */
export const ON_TARGET = 85;

// Shot-type-aware ideal ranges for batting metrics.
// Each entry overrides the default ideal for that shot.
// Keys match the metric keys in METRICS.batting.
const SHOT_OVERRIDES: Partial<Record<ShotType, Partial<Record<string, [number, number]>>>> = {
  pull: {
    batSwingPlane:  [25, 90],    // a cross-bat shot: the hands only approximate the bat, so level down to a diagonal still counts
    // Pull/hook: weight on back foot, front arm higher, big hip rotation, shoulder dips
    // A pull folds the front arm across the body. The 2D elbow angle collapses, so a wide
    // range keeps a real pull from scoring zero. The metric is also left out of the score.
    frontElbow:     [20, 150],
    headStability:  [0, 0.65],
    kneeFlex:       [120, 175],  // loaded, but a tall base at contact is still the shot
    shoulderLevel:  [5, 20],     // natural tilt playing a short ball
    hipRotation:    [30, 60],    // powerful rotation through the ball
    weightTransfer: [0.3, 0.6],  // weight stays back or only slightly transfers
  },
  cut: {
    batSwingPlane:  [50, 90],    // a cross-bat shot: the bat is meant to be near level
    frontElbow:     [80, 120],
    shoulderLevel:  [0, 15],
    hipRotation:    [15, 40],
    weightTransfer: [0.3, 0.65],
  },
  sweep: {
    batSwingPlane:  [50, 90],    // a cross-bat shot: the bat is meant to be near level
    // Sweep: deep knee bend, front knee to the pitch, shoulder rotates hard
    kneeFlex:       [110, 145],
    frontElbow:     [70, 115],
    hipRotation:    [25, 55],
    weightTransfer: [0.55, 0.85],
  },
  defence: {
    // Dead bat defence: minimal hip rotation, head right over the ball, high elbow
    frontElbow:     [95, 130],
    kneeFlex:       [145, 170],
    hipRotation:    [5, 20],
    weightTransfer: [0.6, 0.85],
    headOverKnee:   [0, 0.15],  // tighter — head must be right over it
  },
  drive: {
    // An extended front-foot drive straightens both elbows. 157° and 168° are still the shot.
    frontElbow:     [90, 175],
    backElbow:      [55, 175],
    // A braced front knee is bent, not locked. About 129° is a normal front-foot drive.
    kneeFlex:       [110, 170],
    hipRotation:    [25, 50],
    weightTransfer: [0.65, 0.9],
    // From the side the front shoulder drops as the chest opens through the ball.
    shoulderLevel:  [0, 45],
  },
  leave: {
    // Leave: balanced, minimal movement, head still, weight centred
    kneeFlex:       [150, 170],
    hipRotation:    [0, 10],
    weightTransfer: [0.4, 0.6],
    headStability:  [0, 0.08],  // extra still on a leave
  },
};

export // Worked out but not scored: from one side-on camera these two cannot be told apart from noise.
// Hip rotation happens around the spine, towards and away from the camera, and wrist cock needs
// the bat, which the body tracker cannot see. A textbook position scored near zero on both.
const NOT_SCORED = ['hipRotation', 'wristCock'];

// Measures that say nothing about a shot are left out of its score
/** Tips that replace the drive wording when the shot is not a drive. */
const SHOT_TIPS: Partial<Record<ShotType, Partial<Record<string, string>>>> = {
  pull: {
    frontElbow: 'For a pull, the front elbow stays lower while the shoulders tilt. Do not chase a high straight elbow.',
    batSwingPlane: 'A pull is played across the line. Let the bat come through level, not straight down.',
    shoulderLevel: 'A pull tilts the shoulders. Level shoulders are for a straight drive, not this shot.',
    headOverKnee: 'On a pull the head stays over the back foot, not the front knee.',
    weightTransfer: 'On a pull, move back and across. Keep the weight on the back foot.',
  },
  cut: {
    frontElbow: 'For a cut, the front elbow is lower and the bat is thrown at the ball. A high elbow is a drive shape.',
    batSwingPlane: 'A cut is a cross-bat shot. The bat is meant to be nearer level than vertical.',
  },
  sweep: {
    frontElbow: 'A sweep reaches out with a low front elbow as the front knee drops. A high elbow is not the shape.',
    kneeFlex: 'A sweep needs a deep bend in the front knee. Standing tall is a drive, not a sweep.',
  },
  defence: {
    batSwingPlane: 'In defence the bat stays straight and close to the pad. There is no full swing.',
    frontElbow: 'Defence uses a soft, high front elbow and a short push, not a full drive.',
  },
  drive: {
    kneeFlex: 'A flexed front knee is normal in a front-foot drive. Brace it as it lands, rather than locking it straight.',
  },
};

const SHOT_SKIPS: Partial<Record<ShotType, string[]>> = {
  // Back foot shots: the head is not meant to be over the front knee
  // The front elbow's 2D angle collapses as the shoulders turn, and the head is not over the front knee.
  pull: ['headOverKnee', 'headOverFront', 'frontElbow'],
  cut: ['headOverKnee', 'headOverFront'],
  // No shot is played, so there is nothing to measure in the arms or bat
  leave: ['frontElbow', 'backElbow', 'wristCock', 'batSwingPlane'],
};

const METRICS: Record<Mode, MetricDef[]> = {
  // Bowling is measured at the moment of release, not averaged over the run-up (see bowlingAnalysis)
  bowling: [
    // Portus et al. 2004: the front knee at release is about 150°, give or take 20°. A braced
    // leg can still be straighter than that, so the top of the range stays at straight.
    { key: 'frontKnee', label: 'Front knee brace', unit: '°', ideal: [130, 180], best: 150, tolerance: 25,
      tip: 'Land on a firm front leg, around 150° at the knee, to transfer momentum into the ball.' },
    // About 10° of what looks like a bend is pose-estimation error, so 159° is still a straight arm.
    { key: 'armStraightness', label: 'Bowling arm straightness', unit: '°', ideal: [150, 180], best: 170, tolerance: 20,
      tip: 'Keep the bowling arm as straight as possible from shoulder height to release.' },
    { key: 'armUpright', label: 'Arm position at release', unit: '°', ideal: [0, 20], best: 5, tolerance: 35,
      tip: 'Release with the arm at the top of its arc, close to vertical from the side. Letting go early or late costs bounce and accuracy.' },
    { key: 'trunkTilt', label: 'Forward lean at release', unit: '°', ideal: [5, 25], tolerance: 20,
      tip: 'Bowl over a braced front leg with a moderate forward lean of the trunk. Staying upright or collapsing forward both lose pace.' },
    { key: 'headStability', label: 'Head stability', unit: '', ideal: [0, 0.15], tolerance: 0.35,
      tip: 'Keep your eyes level and your head steady over your body through the delivery stride.' },
  ],
  batting: [
    // ── Existing metrics (now shot-type aware) ────────────────────────────
    { key: 'frontElbow', label: 'Front elbow height', unit: '°', ideal: [90, 130], tolerance: 40,
      tip: 'Lead with a high front elbow — it keeps the bat face straight and the shot controlled.' },
    { key: 'kneeFlex', label: 'Knee flex', unit: '°', ideal: [140, 165], tolerance: 30,
      tip: 'Maintain a slight bend at the knees so you can move powerfully in either direction.' },
    { key: 'headOverKnee', label: 'Head position', unit: '', ideal: [0, 0.3], tolerance: 0.6,
      tip: 'Get your head over the front knee to stay balanced and keep the ball down.' },
    { key: 'shoulderLevel', label: 'Shoulder alignment', unit: '°', ideal: [0, 10], tolerance: 20,
      tip: 'Level shoulders at the point of contact give you the most control over shot direction.' },
    { key: 'headStability', label: 'Head stability', unit: '', ideal: [0, 0.15], tolerance: 0.35,
      tip: 'A still head is the single biggest predictor of clean contact — keep your eyes locked on the ball.' },
    // ── New metrics ────────────────────────────────────────────────────────
    { key: 'hipRotation', label: 'Hip rotation', unit: '°', ideal: [20, 50], tolerance: 25,
      tip: 'The hips drive power — rotate them through the ball before your arms extend.' },
    { key: 'weightTransfer', label: 'Weight transfer', unit: '', ideal: [0.55, 0.85], tolerance: 0.35,
      tip: 'Shift weight from back to front foot as you play — it converts momentum into shot power.' },
    { key: 'batSwingPlane', label: 'Bat angle from vertical', unit: '°', ideal: [0, 30], tolerance: 35,
      tip: 'Play straight-bat shots with the bat close to vertical. It gives more margin for error than swinging across the line.' },
    { key: 'backElbow', label: 'Back elbow position', unit: '°', ideal: [60, 100], tolerance: 35,
      tip: 'A raised back elbow at the top of the backswing powers the downswing — don\'t let it collapse.' },
    { key: 'wristCock', label: 'Wrist cock', unit: '°', ideal: [100, 145], tolerance: 35,
      tip: 'Cocked wrists at the top of backswing store energy — release them through impact for timing.' },
  ],
};

// What a camera looking straight down the pitch can see. Side-on shows the knee, the arm coming
// over and the forward lean; front-on shows arm height, side bend, the head and alignment.
const FRONT_METRICS: Record<Mode, MetricDef[]> = {
  bowling: [
    { key: 'armHeight', label: 'Arm height at release', unit: '°', ideal: [0, 25], best: 10, tolerance: 30,
      tip: 'Release with a high arm, close to vertical and brushing past your ear. A low arm loses bounce.' },
    { key: 'sideBend', label: 'Side bend at release', unit: '°', ideal: [5, 30], best: 15, tolerance: 25,
      tip: 'Stay tall through release. A big sideways bend of the trunk is linked with lower back injury.' },
    { key: 'headLevel', label: 'Eyes level at release', unit: '°', ideal: [0, 12], tolerance: 25,
      tip: 'Keep your head upright and your eyes level on the target. A tilted head pulls the line off.' },
    { key: 'frontFootLine', label: 'Front foot under the hips', unit: '', ideal: [0, 0.3], tolerance: 0.5,
      tip: 'Land the front foot in line with your hips and the target. Landing across or outside twists the body.' },
    { key: 'frontArm', label: 'Front arm close to the body', unit: '', ideal: [0, 0.35], tolerance: 0.5,
      tip: 'Pull the front arm down hard and close to your side. An arm that flies out wide drags the action off line.' },
    { key: 'headStability', label: 'Head stability', unit: '', ideal: [0, 0.15], tolerance: 0.35,
      tip: 'Keep your eyes level and your head steady over your body through the delivery stride.' },
  ],
  batting: [
    { key: 'headLevel', label: 'Eyes level', unit: '°', ideal: [0, 8], tolerance: 20,
      tip: 'Keep your eyes level. A tilted head makes the line and length harder to judge.' },
    { key: 'headOverFront', label: 'Head over the front foot', unit: '', ideal: [0, 0.3], tolerance: 0.5,
      tip: 'Get your head over your front foot and in line with the ball. A head that falls away to the off side plays across the line.' },
    { key: 'batSwingPlane', label: 'Bat angle from vertical', unit: '°', ideal: [0, 20], tolerance: 35,
      tip: 'Bring the bat down straight, with the full face showing to the bowler.' },
    { key: 'shoulderLevel', label: 'Shoulder alignment', unit: '°', ideal: [0, 12], tolerance: 20,
      tip: 'Level shoulders at contact give you the most control over the direction of the shot.' },
    { key: 'balance', label: 'Balanced base', unit: '', ideal: [0, 0.25], tolerance: 0.4,
      tip: 'Keep your hips between your feet. Falling to one side takes your head and bat off line.' },
    { key: 'headStability', label: 'Head stability', unit: '', ideal: [0, 0.12], tolerance: 0.3,
      tip: 'A still head is the single biggest help to clean contact. Keep your eyes locked on the ball.' },
  ],
};

export const METRICS_BY_VIEW: Record<View, Record<Mode, MetricDef[]>> = { side: METRICS, front: FRONT_METRICS };

/**
 * The definition of one measure (its target range, unit and tip) for a discipline, view and shot.
 * A saved analysis keeps only each measure's key, value and mark, so this is how its targets are
 * looked up again later. Null for a measure that no longer exists.
 */
export function metricDefFor(key: string, mode: Mode, view: View = 'side', shotType?: ShotType): MetricDef | null {
  const def = METRICS_BY_VIEW[view]?.[mode]?.find((d) => d.key === key);
  if (!def) return null;
  const ideal = mode === 'batting' && shotType ? SHOT_OVERRIDES[shotType]?.[key] : undefined;
  const tip = mode === 'batting' && shotType ? SHOT_TIPS[shotType]?.[key] : undefined;
  return { ...def, ...(ideal ? { ideal } : {}), ...(tip ? { tip } : {}) };
}

export function angleAt(a: Point, b: Point, c: Point) {
  const ab = Math.atan2(a.y - b.y, a.x - b.x);
  const cb = Math.atan2(c.y - b.y, c.x - b.x);
  const deg = Math.abs(((ab - cb) * 180) / Math.PI);
  return deg > 180 ? 360 - deg : deg;
}

function mid(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function dist(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Strict scoring. 100 is only for the best value. Anywhere else inside the acceptable range
 * scores between 85 and 100, falling as it moves towards the edge. Outside the range it falls
 * from 85 to 0 across the tolerance.
 */
export function scoreFor(value: number, [lo, hi]: [number, number], tolerance: number, best?: number) {
  const fallback = lo === 0 ? 0 : (lo + hi) / 2;
  const target = best !== undefined && best >= lo && best <= hi ? best : fallback;
  if (value >= lo && value <= hi) {
    const room = value < target ? target - lo : hi - target;
    const off = Math.abs(value - target);
    return Math.round(100 - (100 - ON_TARGET) * (room > 0 ? off / room : 0));
  }
  const off = value < lo ? lo - value : value - hi;
  return Math.round(Math.max(0, ON_TARGET - (ON_TARGET * off) / tolerance));
}

export function mean(values: number[]) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// Per-frame metrics in pixel space (normalised coords would skew angles on non-square video).
// Returns null when the joints we need aren't confidently visible.
export function frameMetrics(lm: Landmark[], mode: Mode, hand: Hand, w: number, h: number) {
  const needed = [L.nose, L.lShoulder, L.rShoulder, L.lElbow, L.rElbow, L.lWrist, L.rWrist,
    L.lHip, L.rHip, L.lKnee, L.rKnee, L.lAnkle, L.rAnkle];
  if (needed.some((i) => (lm[i]?.visibility ?? 0) < MIN_VISIBILITY)) return null;

  const p = (i: number): Point => ({ x: lm[i].x * w, y: lm[i].y * h });
  // A right-hander bowls/bats with the right arm and leads with the left side; mirror for left-handers.
  const front = hand === 'right'
    ? { shoulder: L.lShoulder, elbow: L.lElbow, wrist: L.lWrist, hip: L.lHip, knee: L.lKnee, ankle: L.lAnkle }
    : { shoulder: L.rShoulder, elbow: L.rElbow, wrist: L.rWrist, hip: L.rHip, knee: L.rKnee, ankle: L.rAnkle };
  const back = hand === 'right'
    ? { shoulder: L.rShoulder, elbow: L.rElbow, wrist: L.rWrist, hip: L.rHip }
    : { shoulder: L.lShoulder, elbow: L.lElbow, wrist: L.lWrist, hip: L.lHip };

  const shoulderMid = mid(p(L.lShoulder), p(L.rShoulder));
  const hipMid = mid(p(L.lHip), p(L.rHip));
  const shoulderWidth = Math.max(dist(p(L.lShoulder), p(L.rShoulder)), 1);
  const noseX = p(L.nose).x / shoulderWidth;

  if (mode === 'bowling') {
    const trunk = Math.abs((Math.atan2(shoulderMid.x - hipMid.x, hipMid.y - shoulderMid.y) * 180) / Math.PI);
    return {
      noseX,
      wristY: null,
      values: {
        frontKnee: angleAt(p(front.hip), p(front.knee), p(front.ankle)),
        armStraightness: angleAt(p(back.shoulder), p(back.elbow), p(back.wrist)),
        trunkTilt: trunk,
      } as Record<string, number>,
    };
  }

  // ── Batting metrics ────────────────────────────────────────────────────────
  const shoulderSlope = Math.abs(
    (Math.atan2(p(L.rShoulder).y - p(L.lShoulder).y, p(L.rShoulder).x - p(L.lShoulder).x) * 180) / Math.PI
  );

  // Hip rotation: angle of hip line relative to shoulder line (larger = more rotation through the shot)
  const shoulderAngle = Math.atan2(p(L.rShoulder).y - p(L.lShoulder).y, p(L.rShoulder).x - p(L.lShoulder).x);
  const hipAngle = Math.atan2(p(L.rHip).y - p(L.lHip).y, p(L.rHip).x - p(L.lHip).x);
  // Compared as lines, not directions: a line at 5° and one at 185° are the same line
  const lineGap = Math.abs(((shoulderAngle - hipAngle) * 180) / Math.PI) % 180;
  const hipRotation = Math.min(lineGap, 180 - lineGap);

  // Weight transfer: horizontal position of centre of mass (hipMid) relative to foot positions
  // 0 = fully back foot, 1 = fully front foot
  const frontAnkle = p(front.ankle);
  const backAnkle = p(hand === 'right' ? L.rAnkle : L.lAnkle);
  const footSpan = Math.abs(frontAnkle.x - backAnkle.x);
  const weightTransfer = footSpan > 10
    ? Math.min(1, Math.max(0, Math.abs(hipMid.x - backAnkle.x) / footSpan))
    : 0.5;

  // Bat angle: the hands sit one above the other on the handle, so the line between the wrists
  // follows the bat. 0° = bat straight up and down, 90° = bat level (a cross-bat shot).
  const wristLine = Math.abs(
    (Math.atan2(p(back.wrist).x - p(front.wrist).x, p(back.wrist).y - p(front.wrist).y) * 180) / Math.PI
  );
  const batSwingPlane = Math.min(wristLine, 180 - wristLine);

  // Back elbow: angle at back elbow joint — raised = good, collapsed = tip to improve
  const backElbow = angleAt(p(back.shoulder), p(back.elbow), p(back.wrist));

  // Wrist cock: angle between back forearm and the line of the bat (approximated by wrist-to-wrist)
  const wristCock = angleAt(p(back.elbow), p(back.wrist), p(front.wrist));

  return {
    noseX,
    wristY: p(back.wrist).y / h,  // normalised — used for phase detection
    values: {
      frontElbow:    angleAt(p(front.shoulder), p(front.elbow), p(front.wrist)),
      kneeFlex:      mean([
        angleAt(p(L.lHip), p(L.lKnee), p(L.lAnkle)),
        angleAt(p(L.rHip), p(L.rKnee), p(L.rAnkle)),
      ]),
      headOverKnee:  Math.abs(p(L.nose).x - p(front.knee).x) / shoulderWidth,
      shoulderLevel: Math.min(shoulderSlope, 180 - shoulderSlope),
      hipRotation:   Math.min(hipRotation, 90),
      weightTransfer,
      batSwingPlane,
      backElbow,
      wristCock,
    } as Record<string, number>,
  };
}

const SG = [-3, 12, 17, 12, -3];

/** Fills landmark gaps of up to three frames so a blink does not drop the joint. */
export function interpolateGaps(frames: Landmark[][], maxGap = 3): Landmark[][] {
  const out = frames.map((frame) => frame.map((point) => ({ ...point })));
  const count = out[0]?.length ?? 0;
  for (let joint = 0; joint < count; joint++) {
    let i = 0;
    while (i < out.length) {
      if ((out[i][joint]?.visibility ?? 0) >= MIN_VISIBILITY) { i++; continue; }
      const before = i - 1;
      while (i < out.length && (out[i][joint]?.visibility ?? 0) < MIN_VISIBILITY) i++;
      const after = i;
      const gap = after - before - 1;
      if (before >= 0 && after < out.length && gap > 0 && gap <= maxGap) {
        const a = out[before][joint];
        const b = out[after][joint];
        for (let step = 1; step <= gap; step++) {
          const t = step / (gap + 1);
          out[before + step][joint] = {
            x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t,
            z: (a.z ?? 0) + ((b.z ?? 0) - (a.z ?? 0)) * t,
            visibility: Math.min(a.visibility ?? 0, b.visibility ?? 0),
          };
        }
      }
    }
  }
  return out;
}

/** Savitzky–Golay (window 5, quadratic) on x and y. A half-resolution clip jitters less after this. */
export function smoothKeypoints(frames: Landmark[][]): Landmark[][] {
  if (frames.length < 5) return frames.map((frame) => frame.map((point) => ({ ...point })));
  const out = frames.map((frame) => frame.map((point) => ({ ...point })));
  const joints = frames[0]?.length ?? 0;
  for (let joint = 0; joint < joints; joint++) {
    for (let i = 2; i < frames.length - 2; i++) {
      if ([-2, -1, 0, 1, 2].some((k) => (frames[i + k][joint]?.visibility ?? 0) < MIN_VISIBILITY)) continue;
      let x = 0, y = 0;
      for (let k = -2; k <= 2; k++) {
        x += SG[k + 2] * frames[i + k][joint].x;
        y += SG[k + 2] * frames[i + k][joint].y;
      }
      out[i][joint] = { ...out[i][joint], x: x / 35, y: y / 35 };
    }
  }
  return out;
}

/** Gap-fill then smooth. Both the page and the clip script score this, not the raw points. */
export function prepareFrames(frames: Landmark[][]): Landmark[][] {
  return smoothKeypoints(interpolateGaps(frames));
}

/** Shoulder width divided by trunk length. Front-on is wide; side-on the shoulders overlap. */
export function detectView(frames: Landmark[][], w: number, h: number): { view: View; confident: boolean; ratio: number } {
  const ratios: number[] = [];
  for (const lm of frames) {
    if (!coreVisible(lm)) continue;
    const px = (i: number): Point => ({ x: lm[i].x * w, y: lm[i].y * h });
    const torso = Math.max(1, dist(mid(px(L.lShoulder), px(L.rShoulder)), mid(px(L.lHip), px(L.rHip))));
    ratios.push(dist(px(L.lShoulder), px(L.rShoulder)) / torso);
  }
  if (ratios.length < 3) return { view: 'side', confident: false, ratio: 0 };
  const ratio = median(ratios);
  // A front-on chest is often only about 0.7 of the trunk. Side-on shoulders almost overlap.
  // Only those extremes contradict a chosen view. 0.68 and 0.94 do not.
  const view: View = ratio >= 1.15 ? 'front' : 'side';
  const confident = ratio >= 1.45 || ratio <= 0.28;
  return { view, confident, ratio };
}

/**
 * The chosen view is always what gets scored. A hint is only added when the shoulders clearly
 * contradict that choice, and the hint says which way. A clear picture never switches in silence.
 */
export function resolveView(chosen: View, detected: { view: View; confident: boolean }): { view: View; hint: string | null } {
  if (!detected.confident || detected.view === chosen) return { view: chosen, hint: null };
  return {
    view: chosen,
    hint: detected.view === 'front' ? 'This looks front-on. Switch?' : 'This looks side-on. Switch?',
  };
}

const torsoOf = (lm: Landmark[], w: number, h: number) => {
  if (!coreVisible(lm)) return null;
  const px = (i: number): Point => ({ x: lm[i].x * w, y: lm[i].y * h });
  return Math.max(1, dist(mid(px(L.lShoulder), px(L.rShoulder)), mid(px(L.lHip), px(L.rHip))));
};

export type FramePick = { frame: number; confidence: ScoreConfidence };

/**
 * Release is the first high, near-vertical peak of the bowling wrist.
 * A later peak 0.2s or more after that is the follow-through. A collapsed
 * trunk is ignored. If the arm is too short in the picture to pass the
 * straight-arm test, the highest wrist after the run-up is used instead.
 */
export function findRelease(frames: Landmark[][], hand: Hand, w: number, h: number, times?: number[]): FramePick | null {
  const arm = hand === 'right'
    ? { shoulder: L.rShoulder, elbow: L.rElbow, wrist: L.rWrist }
    : { shoulder: L.lShoulder, elbow: L.lElbow, wrist: L.lWrist };
  const px = (lm: Landmark[], i: number): Point => ({ x: lm[i].x * w, y: lm[i].y * h });
  const clock = times && times.length === frames.length ? times : frames.map((_, i) => i / 30);
  const duration = clock.length >= 2 ? Math.max(0, (clock[clock.length - 1] ?? 0) - (clock[0] ?? 0)) : 0;
  const at = (i: number) => (clock[i] ?? 0) - (clock[0] ?? 0);
  const early = (i: number) => duration >= 1 && at(i) < 0.35;
  const torsoPx = (lm: Landmark[]) => {
    if (!visible(lm, L.lShoulder, L.rShoulder, L.lHip, L.rHip)) return null;
    return Math.hypot(
      ((lm[L.lShoulder].x + lm[L.rShoulder].x) / 2 - (lm[L.lHip].x + lm[L.rHip].x) / 2) * w,
      ((lm[L.lShoulder].y + lm[L.rShoulder].y) / 2 - (lm[L.lHip].y + lm[L.rHip].y) / 2) * h,
    );
  };
  const torsos = frames.map(torsoPx).filter((value): value is number => value != null && value > 1);
  const medianTorso = torsos.length ? [...torsos].sort((a, b) => a - b)[Math.floor(torsos.length / 2)] : 1;

  const sample = (i: number) => {
    const lm = frames[i];
    if (!lm || !visible(lm, arm.shoulder, arm.wrist)) return null;
    const torso = torsoPx(lm);
    if (torso == null || torso < medianTorso * 0.7) return null;
    const wrist = px(lm, arm.wrist);
    const shoulder = px(lm, arm.shoulder);
    const dy = shoulder.y - wrist.y;
    const reach = dist(wrist, shoulder) / torso;
    const elbow = visible(lm, arm.elbow) ? angleAt(shoulder, px(lm, arm.elbow), wrist) : null;
    const angle = Math.abs((Math.atan2(wrist.x - shoulder.x, dy) * 180) / Math.PI);
    const extended = dy > torso * 0.08 && (reach >= 0.28 || (elbow != null && elbow >= 130));
    return { dy, angle, extended };
  };

  const peaks: number[] = [];
  for (let i = 1; i < frames.length - 1; i++) {
    const here = sample(i);
    const prev = sample(i - 1);
    const next = sample(i + 1);
    if (!here || here.dy <= 0) continue;
    if (prev && here.dy < prev.dy - medianTorso * 0.04) continue;
    if (next && next.dy > here.dy + medianTorso * 0.03) continue;
    peaks.push(i);
  }

  // The delivery stride is when the feet are spread. A high hand in the run-up, before that
  // spread, is not the release. If the feet never spread, a front foot that comes down out of
  // the jump marks the same moment.
  const frontAnkle = hand === 'right' ? L.lAnkle : L.rAnkle;
  const backAnkle = hand === 'right' ? L.rAnkle : L.lAnkle;
  const feet: { i: number; sep: number; frontY: number }[] = [];
  frames.forEach((lm, i) => {
    if (!lm || !visible(lm, frontAnkle, backAnkle)) return;
    feet.push({ i, sep: dist(px(lm, frontAnkle), px(lm, backAnkle)), frontY: px(lm, frontAnkle).y });
  });
  let stride: { start: number; end: number } | null = null;
  if (feet.length >= 5) {
    const seps = feet.map((foot) => foot.sep).sort((a, b) => a - b);
    const medSep = seps[Math.floor(seps.length / 2)] ?? 0;
    const maxSep = seps[seps.length - 1] ?? 0;
    if (maxSep > medSep * 1.45 && maxSep > medSep + medianTorso * 0.35) {
      const inside = feet.filter((foot) => foot.sep >= maxSep * 0.72);
      if (inside.length >= 2) stride = { start: inside[0].i, end: inside[inside.length - 1].i };
    } else {
      const ys = feet.map((foot) => foot.frontY).sort((a, b) => a - b);
      const lifted = (ys[ys.length - 1] ?? 0) - (ys[0] ?? 0);
      // A small rise and fall of the foot is not a jump. The run-up has the front foot clearly off the ground.
      if (lifted > medianTorso * 0.65) {
        const down = (ys[ys.length - 1] ?? 0) - lifted * 0.25;
        const plant = feet.find((foot) => foot.frontY >= down);
        if (plant && plant.i > 2) stride = { start: plant.i, end: frames.length - 1 };
      }
    }
  }
  const inStride = (i: number) => stride == null || (i >= stride.start && i <= stride.end);
  const isVertical = (i: number) => {
    const armAt = sample(i);
    return armAt != null && armAt.extended && armAt.angle <= 55;
  };
  const inWindow = peaks.filter((i) => inStride(i) && isVertical(i));
  const vertical = inWindow.length > 0 ? inWindow : peaks.filter(isVertical);
  const later = vertical.some((i) => !early(i));
  const usable = vertical.filter((i) => !(early(i) && (later || duration >= 1)));
  if (usable.length > 0) {
    const tallest = Math.max(...usable.map((i) => sample(i)?.dy ?? 0));
    // Inside a clear stride the first near-vertical peak is the release, and a peak 0.2s
    // later is the follow-through. Without a stride, only a peak close to the tallest counts,
    // so a lower pump in the run-up is left out.
    const fraction = stride && inWindow.length > 0 ? 0.82 : 0.9;
    const strong = usable.filter((i) => (sample(i)?.dy ?? 0) >= tallest * fraction);
    const first = (strong.length > 0 ? strong : usable)[0];
    return { frame: first, confidence: 'high' };
  }

  let fallback = -1;
  let best = -Infinity;
  frames.forEach((_, i) => {
    if (duration >= 1 && early(i)) return;
    const armAt = sample(i);
    if (!armAt || armAt.dy <= best) return;
    best = armAt.dy;
    fallback = i;
  });
  // A short or foreshortened arm never passes the straight-arm test. The highest wrist after the run-up is still the release, at medium confidence.
  if (fallback >= 0 && best > medianTorso * 0.04) return { frame: fallback, confidence: 'medium' };
  return null;
}

export function findReleaseFrame(frames: Landmark[][], hand: Hand, w: number, h: number, times?: number[]): number | null {
  return findRelease(frames, hand, w, h, times)?.frame ?? null;
}

/**
 * Contact is on the downswing after the first backlift, at or just before the hand is fastest.
 * The finish can be faster, so a later swing is not used once the first downswing has peaked.
 */
export function findContact(frames: Landmark[][], hand: Hand, w: number, h: number, times?: number[], shot?: ShotType): FramePick {
  const wrist = hand === 'right' ? L.rWrist : L.lWrist;
  const n = frames.length;
  if (n === 0) return { frame: 0, confidence: 'low' };
  const clock = times && times.length === n ? times : frames.map((_, i) => i / 30);
  const point = (i: number): Point | null => {
    const lm = frames[i];
    if (!lm || (lm[wrist]?.visibility ?? 0) < MIN_VISIBILITY) return null;
    return { x: lm[wrist].x * w, y: lm[wrist].y * h };
  };
  const trunks = frames.map((lm) => (lm ? torsoOf(lm, w, h) : null)).filter((value): value is number => value != null && value > 1);
  const trunk = trunks.length ? [...trunks].sort((a, b) => a - b)[Math.floor(trunks.length / 2)] : h * 0.25;
  const heights = frames.map((lm) => playerSize(lm)).filter((value) => value > 0.05).sort((a, b) => a - b);
  const personPx = (heights.length ? heights[Math.floor(heights.length / 2)] : 0.3) * h;
  // A small figure is a noisy figure. Average the wrist over a wider window before reading its speed.
  const radius = personPx < 180 ? 2 : 0;
  const rawPts = frames.map((_, i) => point(i));
  const smoothAt = (i: number): Point | null => {
    let sx = 0;
    let sy = 0;
    let count = 0;
    for (let k = -radius; k <= radius; k++) {
      const sample = rawPts[i + k];
      if (!sample) continue;
      sx += sample.x;
      sy += sample.y;
      count++;
    }
    return count > 0 ? { x: sx / count, y: sy / count } : null;
  };
  const yAt = (i: number): number | null => smoothAt(i)?.y ?? null;
  // A fixed margin, not a fraction of the clip. A trim can put contact near either end.
  const t0 = clock[0] ?? 0;
  const t1 = clock[n - 1] ?? t0;
  const span = Math.max(0, t1 - t0);
  const margin = span > 0.6 ? 0.15 : Math.min(0.15, span * 0.08);
  let lo = 0;
  let hi = n - 1;
  for (let i = 0; i < n; i++) {
    if ((clock[i] ?? 0) - t0 >= margin - 1e-6) { lo = i; break; }
  }
  for (let i = n - 1; i >= 0; i--) {
    if (t1 - (clock[i] ?? 0) >= margin - 1e-6) { hi = i; break; }
  }
  if (hi <= lo) { lo = 0; hi = n - 1; }
  // The first backlift leaves the stance and reaches its first high. A later, higher finish is not it.
  // A trim can start with the hands already up. That opening is the backlift; it does not have to be seen rising.
  const seenY: number[] = [];
  for (let i = 0; i < n; i++) {
    const y = yAt(i);
    if (y != null) seenY.push(y);
  }
  seenY.sort((a, b) => a - b);
  const handsHigh = seenY[0] ?? 0;
  const handsLow = seenY[seenY.length - 1] ?? handsHigh;
  let open = 0;
  while (open < n - 1 && yAt(open) == null) open++;
  const opening = yAt(open);
  let dropsSoon = false;
  if (opening != null) {
    for (let i = open; i < n && (clock[i] ?? 0) - (clock[open] ?? 0) <= 0.45; i++) {
      const y = yAt(i);
      if (y != null && y > opening + h * 0.05) { dropsSoon = true; break; }
    }
  }
  // Only a clip that opens high and then comes down is mid-backlift. A long rise is the backlift itself.
  const startedUp = opening != null
    && dropsSoon
    && handsLow - handsHigh > h * 0.04
    && handsLow - opening >= (handsLow - handsHigh) * 0.55;
  let lowY = yAt(lo) ?? opening ?? 0;
  let rising = startedUp;
  let top = startedUp ? open : lo;
  let topY = startedUp ? (opening ?? lowY) : lowY;
  let peakRise = 0;
  if (!startedUp) {
    for (let i = lo; i <= hi; i++) {
      const y = yAt(i);
      if (y == null) continue;
      if (!rising) {
        if (y >= lowY) { lowY = y; top = i; topY = y; continue; }
        if (lowY - y >= h * 0.045) { rising = true; top = i; topY = y; }
        continue;
      }
      const prev = yAt(i - 1);
      const rise = prev == null ? 0 : prev - y;
      if (rise > peakRise) peakRise = rise;
      if (y < topY) { topY = y; top = i; }
      const gained = lowY - topY;
      const stalled = gained > h * 0.05 && peakRise > h * 0.015 && rise < peakRise * 0.35 && i > top;
      if (stalled || y > topY + h * 0.04) break;
    }
  }
  if (startedUp || !rising) {
    // Hands already up, or they never left the stance into a clear lift. Take the first top, then the drop.
    top = startedUp ? open : lo;
    topY = yAt(top) ?? Infinity;
    for (let i = top; i <= hi; i++) {
      const y = yAt(i);
      if (y == null) continue;
      if (y < topY) { topY = y; top = i; }
      if (i > top && y > topY + h * 0.04) break;
    }
  }
  const speeds: { i: number; speed: number }[] = [];
  const end = Math.min(hi, top + Math.max(4, Math.round(n * 0.5)));
  for (let i = Math.max(1, top + 1); i <= end; i++) {
    const prev = smoothAt(i - 1);
    const here = smoothAt(i);
    if (!prev || !here) continue;
    const y = yAt(i);
    // Speed on the way down only. Movement while the hands are still at the top is the backlift.
    // A small dip off the top is still the backlift. The downswing has clearly left it.
    if (y == null || y < topY + h * 0.05) continue;
    const dt = Math.max(1 / 240, Math.abs((clock[i] ?? i) - (clock[i - 1] ?? i - 1)) || 1 / 30);
    const elapsed = (clock[i] ?? 0) - (clock[top] ?? 0);
    if (elapsed > 0.9 && speeds.length > 2) break;
    // Trunks per second, so a small figure is not a slower swing.
    speeds.push({ i, speed: dist(here, prev) / dt / trunk });
  }
  if (shot === 'drive') {
    const arrived = driveArrival();
    if (arrived != null) return { frame: arrived, confidence: 'medium' };
  }
  if (speeds.length === 0) {
    let frame = Math.min(hi, Math.max(lo, top));
    if (rising) frame = arrivalFrame(frame);
    frame = levelBat(frame);
    return { frame, confidence: 'medium' };
  }
  const peak = speeds.reduce((a, b) => (b.speed > a.speed ? b : a));
  const band = speeds.filter((sample) => sample.i <= peak.i && sample.speed >= peak.speed * 0.9);
  let best = (band.length > 0 ? band : [peak]).reduce((a, b) => (a.i <= b.i ? a : b));
  best = { i: levelBat(best.i), speed: peak.speed };
  const sorted = [...speeds].sort((a, b) => a.speed - b.speed);
  const mid = sorted[Math.floor(sorted.length / 2)].speed;
  const confidence: ScoreConfidence = peak.speed >= Math.max(mid * 1.4, 1) ? 'high' : 'medium';
  return { frame: best.i, confidence };

  // A drive meets the ball as the hands first arrive at the front shoulder and check.
  function driveArrival(): number | null {
    const frontWrist = hand === 'right' ? L.lWrist : L.rWrist;
    const backWrist = hand === 'right' ? L.rWrist : L.lWrist;
    const frontShoulder = hand === 'right' ? L.lShoulder : L.rShoulder;
    const body = frames.map((lm) => playerSize(lm)).filter((value) => value > 0.05).sort((a, b) => a - b);
    const typical = body.length ? body[Math.floor(body.length / 2)] : 0;
    const frontSeen = (lm: Landmark[] | undefined) => !!lm
      && (lm[frontWrist]?.visibility ?? 0) >= 0.45
      && (lm[frontShoulder]?.visibility ?? 0) >= MIN_VISIBILITY
      && (typical <= 0 || playerSize(lm) >= typical * 0.75);
    let crossAt = -1;
    for (let i = lo; i <= hi; i++) {
      const lm = frames[i];
      if (!frontSeen(lm)) continue;
      if ((clock[i] ?? 0) - (clock[0] ?? 0) < 0.5) continue;
      if ((lm[frontWrist].y - lm[frontShoulder].y) * h < h * 0.03) { crossAt = i; break; }
    }
    if (crossAt < 0) return null;
    // In that short arrival the bat is nearest vertical. A frozen, half-missing pose is not quieter, it is wrong.
    let best = crossAt;
    let upright = Infinity;
    for (let i = crossAt; i <= hi && (clock[i] ?? 0) - (clock[crossAt] ?? 0) <= 0.2; i++) {
      const lm = frames[i];
      if (!lm || (lm[frontWrist]?.visibility ?? 0) < 0.45 || (lm[backWrist]?.visibility ?? 0) < 0.45) continue;
      if (typical > 0 && playerSize(lm) < typical * 0.75) continue;
      const ang = Math.abs((Math.atan2((lm[backWrist].x - lm[frontWrist].x) * w, (lm[backWrist].y - lm[frontWrist].y) * h) * 180) / Math.PI);
      const plane = Math.min(ang, 180 - ang);
      if (plane < upright) { upright = plane; best = i; }
    }
    return best;
  }

  function batPlane(i: number): number | null {
    const other = hand === 'right' ? L.lWrist : L.rWrist;
    const lm = frames[i];
    if (!lm) return null;
    if ((lm[wrist]?.visibility ?? 0) < 0.35 || (lm[other]?.visibility ?? 0) < 0.35) return null;
    const ang = Math.abs((Math.atan2((lm[wrist].x - lm[other].x) * w, (lm[wrist].y - lm[other].y) * h) * 180) / Math.PI);
    return Math.min(ang, 180 - ang);
  }

  // A pull meets the ball as the bat first levels and stays level. A level bat that
  // drops back to vertical was the backlift. One bad frame does not reset it.
  function levelBat(candidate: number): number {
    if (shot !== 'pull' && shot !== 'cut' && shot !== 'sweep') return candidate;
    // A small figure foreshortens the bat, so the same level shot reads lower.
    const hit = personPx < 180 ? 52 : 68;
    const support = personPx < 180 ? 48 : 60;
    const readings: { i: number; plane: number }[] = [];
    for (let i = 0; i <= candidate; i++) {
      const plane = batPlane(i);
      if (plane != null) readings.push({ i, plane });
    }
    for (let r = 0; r < readings.length; r++) {
      const here = readings[r];
      if (here.plane < hit) continue;
      const span = personPx < 180 ? 0.2 : 0.119;
      const near = readings.slice(r, r + 4).filter((item) => (clock[item.i] ?? 0) - (clock[here.i] ?? 0) <= span);
      const backed = near.filter((item) => item.plane >= support).length >= 2;
      if (!backed) continue;
      // A one-frame flick during the backlift is not the shot. This one is held.
      if ((clock[candidate] ?? 0) - (clock[here.i] ?? 0) > 0.13) return here.i;
    }
    return candidate;
  }

  // The hands ran up and never came down, so the last high is the follow-through.
  // A cross-bat shot arrives when the bat first levels.
  function arrivalFrame(fallback: number): number {
    const cross = shot === 'pull' || shot === 'cut' || shot === 'sweep';
    if (cross) {
      const other = hand === 'right' ? L.lWrist : L.rWrist;
      for (let i = lo; i <= fallback; i++) {
        const lm = frames[i];
        if (!lm) continue;
        if ((lm[wrist]?.visibility ?? 0) < MIN_VISIBILITY || (lm[other]?.visibility ?? 0) < MIN_VISIBILITY) continue;
        const ang = Math.abs((Math.atan2((lm[wrist].x - lm[other].x) * w, (lm[wrist].y - lm[other].y) * h) * 180) / Math.PI);
        const plane = Math.min(ang, 180 - ang);
        if (plane >= 70 && (clock[fallback] ?? 0) - (clock[i] ?? 0) > 0.12) return i;
      }
      return fallback;
    }
    return fallback;
  }
}

export function findContactFrame(frames: Landmark[][], hand: Hand, w: number, h: number, times?: number[]): number {
  return findContact(frames, hand, w, h, times).frame;
}

/** How far the head sits to the side of the front foot, in trunk lengths. Front-on only. */
export function headOverFrontFoot(lm: Landmark[], hand: Hand, w: number, h: number): number | null {
  const frontAnkle = hand === 'right' ? L.lAnkle : L.rAnkle;
  if (!visible(lm, L.nose, frontAnkle) || !coreVisible(lm)) return null;
  const px = (i: number): Point => ({ x: lm[i].x * w, y: lm[i].y * h });
  const size = torsoOf(lm, w, h);
  return size ? Math.abs(px(L.nose).x - px(frontAnkle).x) / size : null;
}

/**
 * How far the head sits behind the front leg, in trunk lengths. Forward of that leg counts as 0.
 * A knee that has lunged past the foot is not the marker: the head is behind only when it trails
 * both the knee and the ankle. Leaning toward the ball does not count.
 */
export function headBehindFrontKnee(lm: Landmark[], hand: Hand, w: number, h: number): number | null {
  const frontKnee = hand === 'right' ? L.lKnee : L.rKnee;
  const frontAnkle = hand === 'right' ? L.lAnkle : L.rAnkle;
  const backAnkle = hand === 'right' ? L.rAnkle : L.lAnkle;
  if (!visible(lm, L.nose, frontKnee) || !coreVisible(lm)) return null;
  const px = (i: number): Point => ({ x: lm[i].x * w, y: lm[i].y * h });
  const size = torsoOf(lm, w, h);
  if (!size) return null;
  let forward = { x: 1, y: 0 };
  if (visible(lm, frontAnkle, backAnkle)) {
    const step = { x: px(frontAnkle).x - px(backAnkle).x, y: px(frontAnkle).y - px(backAnkle).y };
    const length = Math.hypot(step.x, step.y);
    if (length > size * 0.2) forward = { x: step.x / length, y: step.y / length };
  }
  const aheadOf = (joint: number) => {
    const from = { x: px(L.nose).x - px(joint).x, y: px(L.nose).y - px(joint).y };
    return from.x * forward.x + from.y * forward.y;
  };
  let ahead = aheadOf(frontKnee);
  if (visible(lm, frontAnkle)) ahead = Math.max(ahead, aheadOf(frontAnkle));
  return Math.max(0, -ahead) / size;
}

/**
 * How much the head moves relative to the hips, in trunk lengths.
 * A stride or a camera pan moves the whole body and does not count. Leaning the head forward,
 * which skilled batters do, is along the pitch and does not count either. What remains is the
 * head bobbing or swaying off the body.
 */
export function headWobble(frames: Landmark[][], w: number, h: number): number | null {
  const rows: { size: number; across: number; along: number; rise: number }[] = [];
  for (const lm of frames) {
    if (!visible(lm, L.nose) || !coreVisible(lm)) continue;
    const px = (i: number): Point => ({ x: lm[i].x * w, y: lm[i].y * h });
    const size = torsoOf(lm, w, h);
    if (!size) continue;
    const hips = mid(px(L.lHip), px(L.rHip));
    const offset = { x: (px(L.nose).x - hips.x) / size, y: (px(L.nose).y - hips.y) / size };
    const across = { x: px(L.rShoulder).x - px(L.lShoulder).x, y: px(L.rShoulder).y - px(L.lShoulder).y };
    const acrossLen = Math.hypot(across.x, across.y);
    rows.push({
      size,
      across: acrossLen,
      along: acrossLen > 1 ? (offset.x * across.x + offset.y * across.y) / acrossLen : offset.y,
      rise: offset.y,
    });
  }
  // One collapsed frame, or a shoulder line that folds in, is a bad pose. It is not the head moving.
  // The whole window uses one measure. Mixing a side-on rise with a front-on sway makes a still head look wild.
  const trunk = median(rows.map((row) => row.size));
  const shoulder = median(rows.map((row) => row.across));
  const kept = rows.filter((row) => row.size >= trunk * 0.7 && row.across >= shoulder * 0.6);
  const frontOn = shoulder >= trunk * 0.45;
  const samples = kept.map((row) => (frontOn ? row.along : row.rise));
  if (samples.length < 3) return null;
  const centre = mean(samples);
  return Math.sqrt(mean(samples.map((value) => (value - centre) ** 2)));
}

/**
 * How far the head slides along the trunk, as a fraction of trunk length.
 * A pull turns the body under the head, so movement against the hips is expected.
 * Movement along the trunk is the part that is actually unstable.
 */
export function headOnTrunk(frames: Landmark[][], w: number, h: number): number | null {
  const samples: number[] = [];
  for (const lm of frames) {
    if (!visible(lm, L.nose) || !coreVisible(lm)) continue;
    const px = (i: number): Point => ({ x: lm[i].x * w, y: lm[i].y * h });
    const hips = mid(px(L.lHip), px(L.rHip));
    const shoulders = mid(px(L.lShoulder), px(L.rShoulder));
    const trunk = { x: shoulders.x - hips.x, y: shoulders.y - hips.y };
    const length = Math.hypot(trunk.x, trunk.y);
    if (length < 1) continue;
    const nose = px(L.nose);
    samples.push(((nose.x - hips.x) * trunk.x + (nose.y - hips.y) * trunk.y) / (length * length));
  }
  if (samples.length < 3) return null;
  const centre = mean(samples);
  return Math.sqrt(mean(samples.map((value) => (value - centre) ** 2)));
}

/** Largest body nearest the middle, then the one closest to the person already being followed. */
export function choosePose(people: Landmark[][], previous: Landmark[] | null, w = 1, h = 1): Landmark[] | null {
  const bodies = people.filter((lm) => lm.some((point) => (point.visibility ?? 0) >= MIN_VISIBILITY));
  if (bodies.length === 0) return null;
  const score = (lm: Landmark[]) => {
    const size = playerSize(lm);
    const hips = coreVisible(lm) ? mid(
      { x: lm[L.lHip].x, y: lm[L.lHip].y },
      { x: lm[L.rHip].x, y: lm[L.rHip].y },
    ) : { x: 0.5, y: 0.5 };
    const central = 1 - Math.min(1, Math.hypot(hips.x - 0.5, hips.y - 0.5) * 1.4);
    let track = 1;
    if (previous && coreVisible(previous) && coreVisible(lm)) {
      const before = mid({ x: previous[L.lHip].x * w, y: previous[L.lHip].y * h }, { x: previous[L.rHip].x * w, y: previous[L.rHip].y * h });
      const now = mid({ x: lm[L.lHip].x * w, y: lm[L.lHip].y * h }, { x: lm[L.rHip].x * w, y: lm[L.rHip].y * h });
      const sizePx = torsoOf(lm, w, h) ?? 1;
      track = 1 / (1 + dist(before, now) / sizePx);
    }
    return size * (0.45 + central) * (0.5 + track);
  };
  return bodies.reduce((best, lm) => (score(lm) > score(best) ? lm : best));
}

/** One person across the clip. `crowded` is true when another person is in frame often enough to matter. */
export function lockPerson(frames: Landmark[][][]): { frames: Landmark[][]; crowded: boolean; index: number[]; which: number[] } {
  const chosen: Landmark[][] = [];
  const index: number[] = [];
  const which: number[] = [];
  let previous: Landmark[] | null = null;
  let crowdedFrames = 0;
  let seen = 0;
  frames.forEach((people, i) => {
    const visiblePeople = people.filter((lm) => playerSize(lm) > 0.05);
    if (visiblePeople.length > 0) seen++;
    if (visiblePeople.length > 1) crowdedFrames++;
    const pose = choosePose(people, previous);
    if (pose) {
      chosen.push(pose);
      index.push(i);
      which.push(Math.max(0, people.indexOf(pose)));
      previous = pose;
    }
  });
  return { frames: chosen, index, which, crowded: seen > 0 && crowdedFrames / seen >= 0.3 };
}

function shotTip(def: MetricDef, shotType?: ShotType): string {
  return (shotType && SHOT_TIPS[shotType]?.[def.key]) || def.tip;
}

function medianOrNull(values: number[]): number | null {
  const finite = values.filter((value) => Number.isFinite(value));
  return finite.length > 0 ? median(finite) : null;
}

// Averages each metric across the contact window, not the whole clip. Each measure uses only the
// joints it needs. Shot-type ranges and tips override the drive defaults.
export function analyse(frames: Landmark[][], mode: Mode, hand: Hand, w: number, h: number, shotType?: ShotType, view: View = 'side', times?: number[]): MetricResult[] | null {
  if (mode === 'bowling') return bowlingAnalysis(frames, hand, w, h, view, times)?.metrics ?? null;
  return scoreBatting(frames, hand, w, h, shotType, view, times);
}

/** Joints a batting measure needs. Missing feet do not throw away an elbow reading. */
function battingNeeds(key: string, hand: Hand): number[] {
  const front = hand === 'right'
    ? { shoulder: L.lShoulder, elbow: L.lElbow, wrist: L.lWrist, knee: L.lKnee, ankle: L.lAnkle }
    : { shoulder: L.rShoulder, elbow: L.rElbow, wrist: L.rWrist, knee: L.rKnee, ankle: L.rAnkle };
  const back = hand === 'right'
    ? { shoulder: L.rShoulder, elbow: L.rElbow, wrist: L.rWrist }
    : { shoulder: L.lShoulder, elbow: L.lElbow, wrist: L.lWrist };
  switch (key) {
    case 'frontElbow': return [front.shoulder, front.elbow, front.wrist];
    case 'kneeFlex': return [L.lHip, L.lKnee, L.lAnkle, L.rHip, L.rKnee, L.rAnkle];
    case 'headOverKnee':
    case 'headOverFront': return [L.nose, front.knee];
    case 'shoulderLevel': return [L.lShoulder, L.rShoulder];
    case 'headStability': return [L.nose, L.lHip, L.rHip];
    case 'batSwingPlane': return [L.lWrist, L.rWrist];
    case 'backElbow': return [back.shoulder, back.elbow, back.wrist];
    case 'balance': return [L.lHip, L.rHip, L.lAnkle, L.rAnkle];
    case 'headLevel': return [2, 5];
    default: return [L.lShoulder, L.rShoulder, L.lHip, L.rHip];
  }
}

function battingValue(lm: Landmark[], key: string, hand: Hand, w: number, h: number): number | null {
  if (key === 'headOverKnee') return headBehindFrontKnee(lm, hand, w, h);
  if (key === 'headOverFront') return headOverFrontFoot(lm, hand, w, h);
  if (key === 'weightTransfer') {
    if (!visible(lm, L.lHip, L.rHip, L.lAnkle, L.rAnkle)) return null;
    const px = (i: number): Point => ({ x: lm[i].x * w, y: lm[i].y * h });
    const size = torsoOf(lm, w, h);
    const frontAnkle = hand === 'right' ? L.lAnkle : L.rAnkle;
    const backAnkle = hand === 'right' ? L.rAnkle : L.lAnkle;
    const span = Math.abs(px(frontAnkle).x - px(backAnkle).x);
    // From the side the feet often overlap. A stride that narrow is not a readable weight shift,
    // so it is treated as a balanced base rather than as a guess.
    if (!size || span < size * 0.35) return 0.5;
    const hipMid = mid(px(L.lHip), px(L.rHip));
    return Math.min(1, Math.max(0, Math.abs(hipMid.x - px(backAnkle).x) / span));
  }
  if (key === 'batSwingPlane' && visible(lm, L.lWrist, L.rWrist)) {
    const px = (i: number): Point => ({ x: lm[i].x * w, y: lm[i].y * h });
    const size = torsoOf(lm, w, h);
    // The hands sit together on the handle. A gap of a trunk or more is a lost hand, not the bat.
    if (size && dist(px(L.lWrist), px(L.rWrist)) > size * 0.9) return null;
  }
  const sample = frameMetrics(lm, 'batting', hand, w, h);
  // frameMetrics still wants a full body. Read the one angle when only its joints are there.
  if (sample && Object.prototype.hasOwnProperty.call(sample.values, key) && sample.values[key] != null) return sample.values[key];
  if (!visible(lm, ...battingNeeds(key, hand).filter((i) => i !== L.nose))) return null;
  const px = (i: number): Point => ({ x: lm[i].x * w, y: lm[i].y * h });
  const front = hand === 'right'
    ? { shoulder: L.lShoulder, elbow: L.lElbow, wrist: L.lWrist }
    : { shoulder: L.rShoulder, elbow: L.rElbow, wrist: L.rWrist };
  const back = hand === 'right'
    ? { shoulder: L.rShoulder, elbow: L.rElbow, wrist: L.rWrist }
    : { shoulder: L.lShoulder, elbow: L.lElbow, wrist: L.lWrist };
  if (key === 'frontElbow' && visible(lm, front.shoulder, front.elbow, front.wrist)) return angleAt(px(front.shoulder), px(front.elbow), px(front.wrist));
  if (key === 'backElbow' && visible(lm, back.shoulder, back.elbow, back.wrist)) return angleAt(px(back.shoulder), px(back.elbow), px(back.wrist));
  if (key === 'shoulderLevel' && visible(lm, L.lShoulder, L.rShoulder)) return tilt(px(L.lShoulder), px(L.rShoulder));
  if (key === 'headLevel' && visible(lm, 2, 5)) return tilt(px(2), px(5));
  if (key === 'kneeFlex' && visible(lm, L.lHip, L.lKnee, L.lAnkle, L.rHip, L.rKnee, L.rAnkle)) {
    return mean([angleAt(px(L.lHip), px(L.lKnee), px(L.lAnkle)), angleAt(px(L.rHip), px(L.rKnee), px(L.rAnkle))]);
  }
  if (key === 'batSwingPlane' && visible(lm, L.lWrist, L.rWrist)) {
    const size = torsoOf(lm, w, h);
    const sep = dist(px(L.lWrist), px(L.rWrist));
    // The hands sit together on the handle. A gap of a trunk or more is a lost hand, not the bat.
    if (size && sep > size * 0.9) return null;
    const line = Math.abs((Math.atan2(px(L.rWrist).x - px(L.lWrist).x, px(L.rWrist).y - px(L.lWrist).y) * 180) / Math.PI);
    return Math.min(line, 180 - line);
  }
  if (key === 'balance' && visible(lm, L.lHip, L.rHip, L.lAnkle, L.rAnkle)) {
    const hips = mid(px(L.lHip), px(L.rHip));
    const feet = mid(px(L.lAnkle), px(L.rAnkle));
    const size = torsoOf(lm, w, h);
    return size ? Math.abs(hips.x - feet.x) / size : null;
  }
  return null;
}

function scoreBatting(framesIn: Landmark[][], hand: Hand, w: number, h: number, shotType: ShotType | undefined, view: View, times?: number[]): MetricResult[] | null {
  const frames = prepareFrames(framesIn);
  if (frames.length < 4) return null;
  // Contact is read on the raw wrists. Smoothing a one-frame bat angle hides the hit on a mirrored clip.
  const contactPick = findContact(framesIn, hand, w, h, times, shotType);
  const contact = contactPick.frame;
  const clock = times && times.length === frames.length ? times : frames.map((_, i) => i / 30);
  const at = clock[contact] ?? 0;
  const window = frames.filter((_, i) => Math.abs((clock[i] ?? 0) - at) <= 0.1);
  const scored = window.length > 0 ? window : [frames[contact]];
  const defs = METRICS_BY_VIEW[view][ 'batting' ].filter((def) => !NOT_SCORED.includes(def.key) && !(shotType && (SHOT_SKIPS[shotType] ?? []).includes(def.key)));
  const overrides = shotType ? (SHOT_OVERRIDES[shotType] ?? {}) : {};
  const metrics: MetricResult[] = [];
  for (const def of defs) {
    let value: number | null;
    if (def.key === 'headStability') value = shotType === 'pull' ? headOnTrunk(scored, w, h) : headWobble(scored, w, h);
    else value = medianOrNull(scored.map((lm) => battingValue(lm, def.key, hand, w, h)).filter((v): v is number => v !== null));
    if (value === null) continue;
    const ideal: [number, number] = overrides[def.key] ?? def.ideal;
    metrics.push({ ...def, tip: shotTip(def, shotType), ideal, value, score: scoreFor(value, ideal, def.tolerance, def.best) });
  }
  return metrics.length >= 2 ? metrics : null;
}

// Highlight score for one segment: technique score scaled by the share of frames with a clearly visible pose,
// so a strong but mostly occluded clip ranks below a clean, fully visible one.
export function segmentScore(
  frames: Landmark[][], totalFrames: number, mode: Mode, hand: Hand, w: number, h: number, shotType?: ShotType, view: View = 'side',
) {
  if (totalFrames === 0) return 0;
  const metrics = analyse(frames, mode, hand, w, h, shotType, view);
  if (!metrics) return 0;
  const usable = frames.filter(coreVisible).length;
  return Math.round(overallScore(metrics) * Math.min(1, usable / totalFrames));
}

/* ── Shared helpers ────────────────────────────────────────────────────────── */

const visible = (lm: Landmark[], ...indices: number[]) => indices.every((i) => (lm[i]?.visibility ?? 0) >= MIN_VISIBILITY);

/** Shoulders and hips can be seen: enough to say a body is in the picture */
export function coreVisible(lm: Landmark[]) {
  return visible(lm, L.lShoulder, L.rShoulder, L.lHip, L.rHip);
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** How far a line is from level, 0 to 90 degrees, whichever way it runs */
function tilt(a: Point, b: Point) {
  const degrees = Math.abs((Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI) % 180;
  return Math.min(degrees, 180 - degrees);
}

/** How far the line from bottom to top leans from straight up, 0 to 180 degrees */
function lean(top: Point, bottom: Point) {
  return Math.abs((Math.atan2(top.x - bottom.x, bottom.y - top.y) * 180) / Math.PI);
}

// Eyes, for judging whether the head is level
const EYES = { left: 2, right: 5 };

function sides(hand: Hand, wrongFooted = false) {
  // A right-armer bowls with the right arm and normally lands on the left (front) leg
  const arm = hand === 'right'
    ? { shoulder: L.rShoulder, elbow: L.rElbow, wrist: L.rWrist }
    : { shoulder: L.lShoulder, elbow: L.lElbow, wrist: L.lWrist };
  const frontArm = hand === 'right'
    ? { frontShoulder: L.lShoulder, frontElbow: L.lElbow }
    : { frontShoulder: L.rShoulder, frontElbow: L.rElbow };
  const leftLeg = { hip: L.lHip, knee: L.lKnee, ankle: L.lAnkle };
  const rightLeg = { hip: L.rHip, knee: L.rKnee, ankle: L.rAnkle };
  const leftLands = (hand === 'right') !== wrongFooted;
  return { ...arm, ...frontArm, ...(leftLands ? leftLeg : rightLeg), backAnkle: leftLands ? L.rAnkle : L.lAnkle };
}

/* ── Unique actions ────────────────────────────────────────────────────────── */

export type UniqueKey = 'round-arm' | 'bent-front-knee' | 'wrong-footed' | 'big-side-bend';

/**
 * Actions that differ from the textbook by style rather than by mistake. When one is seen it is
 * named, and the measure it affects is shown but left out of the overall score, so the player
 * is judged as their own kind of bowler. `excused: false` is for a trait that is distinctive
 * but carries an injury risk, which should not be waved through.
 */
export const UNIQUE_ACTIONS: Record<UniqueKey, { title: string; detail: string; metric: string | null; excused: boolean }> = {
  'round-arm': {
    title: 'Round-arm or slinging action',
    detail: 'The bowling arm comes through well below vertical. That is a recognised style, not a fault in itself: it gives a low, skidding trajectory. From front-on, arm height is shown but not counted in the overall score.',
    metric: 'armHeight',
    excused: true,
  },
  'bent-front-knee': {
    title: 'Bowls on a bent front knee',
    detail: 'The front leg stays flexed through release instead of bracing. Plenty of effective bowlers do this. Front knee brace is shown but not counted in the overall score.',
    metric: 'frontKnee',
    excused: true,
  },
  'wrong-footed': {
    title: 'Bowls off the wrong foot',
    detail: 'The ball is released off the same foot as the bowling arm. It is unusual but legal, and can be hard for batters to pick. The landing leg has been measured as the front leg.',
    metric: null,
    excused: true,
  },
  'big-side-bend': {
    title: 'Very large side bend at release',
    detail: 'The trunk bends a long way sideways at release. It is distinctive, but a large side bend is linked with lower back injury in fast bowlers, so it still counts in the score and is worth a coach looking at.',
    metric: 'sideBend',
    excused: false,
  },
};

/** Overall score: the mean of the measures, leaving out any excused as part of a unique action */
export function overallScore(metrics: MetricResult[]) {
  const counted = metrics.filter((m) => !m.excused);
  const pool = counted.length > 0 ? counted : metrics;
  return Math.round(mean(pool.map((m) => m.score)));
}

/** The measure with the most room to improve. Excused unique-action measures are left out. */
export function weakestMeasure(metrics: MetricResult[]): MetricResult | null {
  const counted = metrics.filter((m) => !m.excused);
  if (counted.length === 0) return null;
  return counted.reduce((worst, metric) => (metric.score < worst.score ? metric : worst));
}

/** One thing to practise for the weakest measure. The wording comes from the coaching rule, not from a model. */
export function drillFor(metric: MetricResult): string {
  const focus = metric.label.toLowerCase();
  return `Film yourself again and look only at your ${focus}. Do it slowly five times: ${metric.tip}`;
}

const FULL_BODY = [L.nose, L.lShoulder, L.rShoulder, L.lHip, L.rHip, L.lAnkle, L.rAnkle];

/** True when the head and both feet are in the picture, so the player has stepped back far enough. */
export function wholeBodyVisible(lm: Landmark[] | undefined): boolean {
  if (!lm) return false;
  const seen = (i: number) => (lm[i]?.visibility ?? 0) >= MIN_VISIBILITY;
  if (!FULL_BODY.every(seen)) return false;
  const head = lm[L.nose].y ?? 1;
  const feet = Math.max(lm[L.lAnkle].y ?? 0, lm[L.rAnkle].y ?? 0);
  return head > 0.02 && feet < 0.98;
}

/* ── Bowling: measured at release ──────────────────────────────────────────── */

/**
 * Finds the release (bowling hand at its highest, above the head) and measures the action there.
 * Returns null when no bowling action can be seen, e.g. someone standing or walking.
 */
export function bowlingAnalysis(
  frames: Landmark[][], hand: Hand, w: number, h: number, view: View = 'side', times?: number[],
): { metrics: MetricResult[]; keyFrame: number; elbow: ElbowCheck; unique: UniqueKey[] } | null {
  const smoothed = prepareFrames(frames);
  const arm = sides(hand);
  const p = (lm: Landmark[], i: number): Point => ({ x: lm[i].x * w, y: lm[i].y * h });
  const shoulderMid = (lm: Landmark[]) => mid(p(lm, L.lShoulder), p(lm, L.rShoulder));
  const hipMid = (lm: Landmark[]) => mid(p(lm, L.lHip), p(lm, L.rHip));
  const torso = (lm: Landmark[]) => Math.max(1, dist(shoulderMid(lm), hipMid(lm)));

  // Release is inside the delivery stride, after the front foot lands and the arm comes up.
  // The highest hand in the run-up is not the release.
  const release = findReleaseFrame(frames, hand, w, h, times) ?? -1;
  if (release < 0) return null;
  const releaseLm = frames[release];
  const releaseSize = torso(releaseLm);
  const best = visible(releaseLm, arm.wrist, arm.shoulder) && releaseSize > 0
    ? (p(releaseLm, arm.shoulder).y - p(releaseLm, arm.wrist).y) / releaseSize
    : 0;
  const atRelease = frames[release];

  // Which foot is down at release? Normally the one opposite the bowling arm.
  const unique: UniqueKey[] = [];
  const normal = sides(hand);
  if (visible(atRelease, normal.ankle, normal.backAnkle)
    && p(atRelease, normal.backAnkle).y - p(atRelease, normal.ankle).y > 0.15 * torso(atRelease)) {
    unique.push('wrong-footed');
  }
  const side = sides(hand, unique.includes('wrong-footed'));

  const clock = times && times.length === frames.length ? times : frames.map((_, i) => i / 30);
  const aroundTime = (before: number, after: number) => frames.filter((_, i) => {
    const t = clock[i] ?? 0;
    const at = clock[release] ?? 0;
    return t >= at - before && t <= at + after;
  });
  const window = (before: number, after: number) => aroundTime(before / 30, after / 30);
  const measure = (pool: Landmark[][], needed: number[], fn: (lm: Landmark[]) => number) => {
    const values = pool.filter((lm) => visible(lm, ...needed)).map(fn).filter((v) => Number.isFinite(v));
    return values.length > 0 ? median(values) : null;
  };
  const around = window(2, 1);
  const core = [L.lShoulder, L.rShoulder, L.lHip, L.rHip];
  const armLean = measure([atRelease], [side.shoulder, side.wrist], (lm) => lean(p(lm, side.wrist), p(lm, side.shoulder)));
  const trunkLean = measure(around, core, (lm) => lean(shoulderMid(lm), hipMid(lm)));

  // Head stability through the delivery stride, relative to the hips, not the picture.
  // Smoothed so a noisy or smaller picture does not swing this one number.
  const smoothRelease = Math.min(smoothed.length - 1, Math.max(0, release));
  const headStability = headWobble(aroundTime(0.25, 0.1).length >= 3
    ? aroundTime(0.25, 0.1)
    : smoothed.slice(Math.max(0, smoothRelease - 8), smoothRelease + 3), w, h);

  const values: Record<string, number | null> = view === 'side'
    ? {
        frontKnee: measure([atRelease], [side.hip, side.knee, side.ankle], (lm) => angleAt(p(lm, side.hip), p(lm, side.knee), p(lm, side.ankle))),
        // From the arm coming over the shoulder up to release
        armStraightness: measure(
          window(4, 0).filter((lm) => visible(lm, side.shoulder, side.wrist) && p(lm, side.wrist).y < p(lm, side.shoulder).y),
          [side.shoulder, side.elbow, side.wrist],
          (lm) => angleAt(p(lm, side.shoulder), p(lm, side.elbow), p(lm, side.wrist)),
        ),
        armUpright: armLean,
        trunkTilt: trunkLean,
        headStability,
      }
    : {
        armHeight: armLean,
        sideBend: trunkLean,
        headLevel: measure(around, [EYES.left, EYES.right], (lm) => tilt(p(lm, EYES.left), p(lm, EYES.right))),
        frontFootLine: measure(around, [...core, side.ankle], (lm) => Math.abs(p(lm, side.ankle).x - hipMid(lm).x) / torso(lm)),
        frontArm: measure([atRelease], [...core, side.frontShoulder, side.frontElbow],
          (lm) => Math.abs(p(lm, side.frontElbow).x - p(lm, side.frontShoulder).x) / torso(lm)),
        headStability,
      };

  if (view === 'side' && values.frontKnee !== null && values.frontKnee < 125) unique.push('bent-front-knee');
  // A round arm is a side-on reading: the hand stays low because the arm points at the camera.
  // From in front that same shape is just the arm coming past the ear, so it is not flagged here.
  if (view === 'side' && best < 0.6) unique.push('round-arm');
  if (view === 'front' && values.sideBend !== null && values.sideBend > 45) unique.push('big-side-bend');
  const excused = unique.filter((key) => UNIQUE_ACTIONS[key].excused).map((key) => UNIQUE_ACTIONS[key].metric);

  const metrics = METRICS_BY_VIEW[view].bowling
    .filter((def) => values[def.key] !== null && values[def.key] !== undefined)
    .map((def) => ({
      ...def,
      value: values[def.key] as number,
      score: scoreFor(values[def.key] as number, def.ideal, def.tolerance, def.best),
      ...(excused.includes(def.key) ? { excused: true } : {}),
    }));
  return metrics.length >= 2 ? { metrics, keyFrame: release, elbow: elbowCheck(frames, release, side, p), unique } : null;
}

/* ── Bowling arm reference check ───────────────────────────────────────────── */

/** The law's limit on straightening of the elbow, from the arm reaching horizontal to release */
export const ELBOW_EXTENSION_LIMIT = 15;

/** How many frames before release to look for the arm passing horizontal (enough for slow motion) */
const ELBOW_LOOK_BACK = 60;
/** An elbow angle below this on a bowling arm above the shoulder is a misread pose, not a bend */
const ELBOW_MIN_ANGLE = 90;
/** The most straightening that is taken as a real reading, in degrees */
const ELBOW_MAX_BELIEVABLE = 60;

export type ElbowCheck = {
  /** Degrees the elbow straightened between the arm reaching horizontal and release; null if it could not be seen */
  extension: number | null;
  /** How many frames of that part of the action were seen. Two or three is typical at normal speed. */
  frames: number;
  /** Elbow angle at its most bent in that part of the action, and at release */
  mostBent: number | null;
  atRelease: number | null;
  /**
   * Degrees the elbow went past straight (hyperextension) in that part of the action; 0 if it did
   * not. Movement past straight is not straightening of a bent arm, so it is left out of `extension`.
   */
  hyperextension: number | null;
  /** What the arm did, in one word, for showing and saving with the result; null if there was no reading */
  kind: ElbowKind | null;
};

/** Smallest movement, in degrees, that is called extension or hyperextension; below it is camera noise */
export const ELBOW_NOTICEABLE = 3;

export type ElbowKind = 'extension' | 'hyperextension' | 'both' | 'none';

export const ELBOW_KIND_LABELS: Record<ElbowKind, string> = {
  extension: 'Extension',
  hyperextension: 'Hyperextension',
  both: 'Extension and hyperextension',
  none: 'Neither: the arm stayed straight',
};

/** Names what the elbow did from the two measured movements. */
export function elbowKind(extension: number, hyperextension: number): ElbowKind {
  const ext = extension >= ELBOW_NOTICEABLE, hyper = hyperextension >= ELBOW_NOTICEABLE;
  return ext && hyper ? 'both' : ext ? 'extension' : hyper ? 'hyperextension' : 'none';
}

/**
 * A reference reading for the bowling arm, to decide whether a closer look is worth it.
 *
 * What counts as extension: after the arm passes horizontal on the way up, the elbow bends, and
 * then straightens again before release. The figure is how far it straightened from its most bent
 * point in that stretch. An arm that stays straight all the way from horizontal reads zero.
 *
 * It is not a test of whether an action is legal: that needs several cameras in a laboratory.
 * From one camera the elbow angle also appears to change as the arm turns, so this can read high
 * or low. It is kept out of the technique score.
 *
 * Hyperextension is not counted. An elbow that bends backwards past straight looks, as a plain
 * angle, the same as one bent forwards by the same amount, so the side the forearm sits on is
 * tracked too. The side it is on when the arm is most bent is taken as the normal bend; a forearm
 * on the other side has gone past straight, and that frame is treated as a straight arm.
 */
function elbowCheck(
  frames: Landmark[][], release: number,
  side: { shoulder: number; elbow: number; wrist: number },
  p: (lm: Landmark[], i: number) => Point,
): ElbowCheck {
  // The arm's true proportions, as the longest each part is ever seen in the clip (in torso
  // lengths). A part that looks much shorter in a frame is pointing at the camera or has been
  // lost by the pose model, and an elbow angle read from it means nothing.
  const torso = (lm: Landmark[]) => Math.max(1, dist(mid(p(lm, L.lShoulder), p(lm, L.rShoulder)), mid(p(lm, L.lHip), p(lm, L.rHip))));
  const parts = (lm: Landmark[]) => ({
    upper: dist(p(lm, side.shoulder), p(lm, side.elbow)) / torso(lm),
    fore: dist(p(lm, side.elbow), p(lm, side.wrist)) / torso(lm),
  });
  const seen = frames.filter((lm) => visible(lm, L.lShoulder, L.rShoulder, L.lHip, L.rHip, side.shoulder, side.elbow, side.wrist)).map(parts);
  const longest = (values: number[]) => [...values].sort((x, y) => x - y)[Math.floor(values.length * 0.9)] ?? 0;
  const fullUpper = longest(seen.map((s) => s.upper)), fullFore = longest(seen.map((s) => s.fore));

  // For each frame: how far the elbow is from straight, signed by the side the forearm is on
  const bends: number[] = [];
  // Walk back from release while the upper arm is still above horizontal
  for (let i = release; i >= 0 && release - i <= ELBOW_LOOK_BACK; i--) {
    const lm = frames[i];
    if (!visible(lm, side.shoulder, side.elbow, side.wrist)) {
      // Losing the arm at release itself leaves nothing to measure from; earlier, skip the frame
      if (i === release) break;
      continue;
    }
    const shoulder = p(lm, side.shoulder), elbow = p(lm, side.elbow), wrist = p(lm, side.wrist);
    if (elbow.y > shoulder.y) break;
    const angle = angleAt(shoulder, elbow, wrist);
    const size = visible(lm, L.lShoulder, L.rShoulder, L.lHip, L.rHip) ? parts(lm) : null;
    // Not a believable bowling arm in this frame: folded past a right angle, or foreshortened
    const unreliable = angle < ELBOW_MIN_ANGLE || (size !== null && (size.upper < fullUpper * 0.6 || size.fore < fullFore * 0.6));
    if (unreliable) {
      if (i === release) break;
      continue;
    }
    const cross = (elbow.x - shoulder.x) * (wrist.y - elbow.y) - (elbow.y - shoulder.y) * (wrist.x - elbow.x);
    bends.unshift((180 - angle) * (cross < 0 ? -1 : 1));
  }
  if (bends.length < 2) return { extension: null, frames: bends.length, mostBent: null, atRelease: null, hyperextension: null, kind: null };
  // The side of the biggest bend is the normal one; anything on the other side is past straight
  const normal = Math.sign(bends.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a))) || 1;
  const flexion = bends.map((b) => b * normal);
  const angles = flexion.map((f) => 180 - Math.max(0, f));
  const atRelease = angles[angles.length - 1];
  const mostBent = Math.min(...angles);
  const extension = Math.max(0, atRelease - mostBent);
  const hyperextension = Math.max(0, -Math.min(...flexion));
  // More straightening than any real action shows means the pose was misread, not that the arm did it
  if (extension > ELBOW_MAX_BELIEVABLE) return { extension: null, frames: bends.length, mostBent: null, atRelease: null, hyperextension: null, kind: null };
  return { extension, frames: bends.length, mostBent, atRelease, hyperextension, kind: elbowKind(extension, hyperextension) };
}

/* ── Full result for the screen ────────────────────────────────────────────── */

export type Analysis = {
  metrics: MetricResult[];
  /** Index into the frames given of the position worth showing, and what to call it */
  keyFrame: number;
  keyLabel: string;
  /** Frames where a body could be seen */
  framesSeen: number;
  /** Height of the player as a share of the picture at the key frame (1 = fills it) */
  playerSize: number;
  /** Bowling only: the bowling arm reference check */
  elbow?: ElbowCheck;
  /** Styles noticed that differ from the textbook */
  unique: UniqueKey[];
  /** Plain reasons the picture was hard to read. The scores still stand when there are any. */
  warnings: string[];
  /** High, medium or low, from how well the body was tracked and how sure the event was. */
  confidence: ScoreConfidence;
};

export type AnalysisProblem = 'no-body' | 'no-action' | 'feet-out-of-frame';

export const ANALYSIS_PROBLEMS: Record<AnalysisProblem, string> = {
  'no-body': 'No one is clearly in frame.',
  'no-action': 'No bowling action was found after the front foot landed.',
  'feet-out-of-frame': 'Feet out of frame.',
};

/** Height from the highest to the lowest visible body point, as a share of the frame */
export function playerSize(lm: Landmark[]) {
  const ys = lm.filter((point, i) => (i === 0 || i >= 11) && (point.visibility ?? 0) >= MIN_VISIBILITY).map((point) => point.y);
  return ys.length >= 2 ? Math.max(...ys) - Math.min(...ys) : 0;
}

/** Frames per second implied by the timestamps, or null when the clip did not say. */
export function clipFrameRate(times?: number[]): number | null {
  if (!times || times.length < 2) return null;
  const span = (times[times.length - 1] ?? 0) - (times[0] ?? 0);
  if (span <= 0.05) return null;
  return (times.length - 1) / span;
}

export function capConfidence(value: ScoreConfidence, cap: ScoreConfidence): ScoreConfidence {
  return combineConfidence(value, cap);
}

/** How much to trust the number at the release or the contact, not at the last frame of the clip. */
export type CameraMotion = 'still' | 'pan' | 'zoom';

/** How far the picture must be enlarged so a person of `personPx` becomes at least 256px tall. */
export function upscaleFactor(personPx: number): number {
  if (!(personPx > 0)) return 1;
  return personPx >= 256 ? 1 : 256 / personPx;
}

/** Elbow angle in degrees. 180 is straight. Uses metres when MediaPipe world landmarks are present. */
export function elbowAngle3D(world: Landmark[] | undefined, hand: Hand): number | null {
  if (!world) return null;
  const shoulder = world[hand === 'right' ? L.rShoulder : L.lShoulder];
  const elbow = world[hand === 'right' ? L.rElbow : L.lElbow];
  const wrist = world[hand === 'right' ? L.rWrist : L.lWrist];
  if (!shoulder || !elbow || !wrist) return null;
  const v1 = { x: shoulder.x - elbow.x, y: shoulder.y - elbow.y, z: (shoulder.z ?? 0) - (elbow.z ?? 0) };
  const v2 = { x: wrist.x - elbow.x, y: wrist.y - elbow.y, z: (wrist.z ?? 0) - (elbow.z ?? 0) };
  const size = Math.hypot(v1.x, v1.y, v1.z) * Math.hypot(v2.x, v2.y, v2.z);
  if (size < 1e-8) return null;
  const cos = Math.min(1, Math.max(-1, (v1.x * v2.x + v1.y * v2.y + v1.z * v2.z) / size));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** The picture elbow, used when world landmarks were not captured. Same check from either camera. */
export function elbowAngle2D(lm: Landmark[] | undefined, hand: Hand, w: number, h: number): number | null {
  if (!lm) return null;
  const shoulder = hand === 'right' ? L.rShoulder : L.lShoulder;
  const elbow = hand === 'right' ? L.rElbow : L.lElbow;
  const wrist = hand === 'right' ? L.rWrist : L.lWrist;
  if (!visible(lm, shoulder, elbow, wrist)) return null;
  const px = (i: number): Point => ({ x: lm[i].x * w, y: lm[i].y * h });
  return angleAt(px(shoulder), px(elbow), px(wrist));
}

export function readingConfidence(input: {
  frames: Landmark[][];
  keyFrame: number;
  times?: number[];
  ratio?: number;
  armAngle?: number | null;
  crowded?: boolean;
  motion?: CameraMotion;
  view?: View;
}): ScoreConfidence {
  let confidence: ScoreConfidence = 'high';
  const worse = (next: ScoreConfidence) => { confidence = combineConfidence(confidence, next); };
  const frame = input.frames[Math.min(input.frames.length - 1, Math.max(0, input.keyFrame))];
  const sizes = input.frames.map((lm) => playerSize(lm)).filter((value) => value > 0.05).sort((a, b) => a - b);
  const typical = sizes.length ? sizes[Math.floor(sizes.length / 2)] : 0;
  const frameSize = frame ? playerSize(frame) : 0;
  // One collapsed frame is not a player who was far away. Use the size the rest of the clip shows.
  const size = frameSize > 0 && typical > 0 && frameSize < typical * 0.75 ? typical : frameSize;
  // A small figure, or a moving broadcast camera, is not a net close-up.
  if (size < 0.25 || input.motion === 'pan' || input.motion === 'zoom') worse('low');
  else if (size < 0.36) worse('medium');
  if (frame) {
    const joints = [L.lShoulder, L.rShoulder, L.lElbow, L.rElbow, L.lWrist, L.rWrist, L.lHip, L.rHip, L.lKnee, L.rKnee];
    const seen = joints.map((i) => frame[i]?.visibility ?? 0);
    const meanVis = seen.reduce((sum, v) => sum + v, 0) / seen.length;
    if (meanVis < 0.5) worse('low');
    else if (meanVis < 0.7) worse('medium');
    if (!visible(frame, L.lAnkle) && !visible(frame, L.rAnkle)) worse('low');
  }
  if (input.armAngle != null) {
    // Side-on, a bowling arm under about 140° is not a readable release. Front-on foreshortens
    // a straight arm, so only a clearly folded elbow hides the score.
    const lowCut = input.view === 'front' ? 95 : 140;
    const midCut = input.view === 'front' ? 115 : 155;
    if (input.armAngle < lowCut) worse('low');
    else if (input.armAngle < midCut) worse('medium');
  }
  if (input.crowded && input.ratio != null && input.ratio < 0.5) worse('low');
  // Between a clear side-on and a clear front-on is a three-quarter view.
  if (input.ratio != null && input.ratio > 0.28 && input.ratio < 0.48) worse('medium');
  const fps = clipFrameRate(input.times);
  if (fps != null && fps < 12) worse('low');
  else if (fps != null && fps < 20) worse('medium');
  if (input.crowded) worse('medium');
  return confidence;
}

/** Scores a clip and picks the position to show. Says why when it cannot. */
export type ClipContext = {
  /** MediaPipe world landmarks, one body per frame, in metres. Same order as `frames`. */
  world?: Landmark[][];
  /** Camera movement seen in the background, not in the player. */
  motion?: CameraMotion;
  /** Another person stays in frame. A bowling release cannot be timed cleanly then. */
  crowded?: boolean;
};

export function analyseDetailed(
  frames: Landmark[][], mode: Mode, hand: Hand, w: number, h: number, shotType?: ShotType, view: View = 'side', times?: number[], context?: ClipContext,
): { ok: true; analysis: Analysis } | { ok: false; problem: AnalysisProblem } {
  const framesSeen = frames.filter((lm) => visible(lm, L.lShoulder, L.rShoulder) || visible(lm, L.lHip, L.rHip)).length;
  const feet = frames.filter((lm) => visible(lm, L.lAnkle) || visible(lm, L.rAnkle)).length;
  const feetMissing = frames.length > 0 && feet < frames.length * 0.4;
  if (framesSeen < 4) return { ok: false, problem: feetMissing ? 'feet-out-of-frame' : 'no-body' };

  const detected = detectView(frames, w, h);
  const resolved = resolveView(view, detected);
  const warnings: string[] = [];
  if (feetMissing) warnings.push('feet out of frame');
  if (resolved.hint) warnings.push(resolved.hint);
  if (context?.motion === 'pan' || context?.motion === 'zoom') warnings.push('The phone moved. No pan or zoom.');
  const fps = clipFrameRate(times);
  if (fps != null && fps < 20) warnings.push(LOW_FPS_MESSAGE);

  const sampled = resampleClip(frames, times);
  if (mode === 'bowling') {
    const result = bowlingAnalysis(sampled.frames, hand, w, h, resolved.view, sampled.times);
    if (!result) return { ok: false, problem: framesSeen < MIN_FRAMES ? 'no-body' : 'no-action' };
    const keyFrame = sampled.toOriginal(result.keyFrame);
    const arm = elbowAngle3D(context?.world?.[keyFrame], hand)
      ?? elbowAngle2D(frames[keyFrame], hand, w, h)
      ?? result.metrics.find((metric) => metric.key === 'armStraightness')?.value
      ?? null;
    const shoulder = hand === 'right' ? L.rShoulder : L.lShoulder;
    const wrist = hand === 'right' ? L.rWrist : L.lWrist;
    const leanAt = frames[keyFrame] && visible(frames[keyFrame], shoulder, wrist)
      ? lean(
        { x: frames[keyFrame][wrist].x * w, y: frames[keyFrame][wrist].y * h },
        { x: frames[keyFrame][shoulder].x * w, y: frames[keyFrame][shoulder].y * h },
      )
      : null;
    if (resolved.view === 'side' && leanAt != null && leanAt > 55) warnings.push('The bowling arm is not coming over the shoulder.');
    const confidence = readingConfidence({
      frames, keyFrame, times, ratio: detected.ratio, armAngle: arm, motion: context?.motion, view: resolved.view,
      crowded: resolved.view === 'side' && leanAt != null && leanAt > 55,
    });
    result.metrics.forEach((metric) => { metric.confidence = confidence; });
    const sizes = frames.map((lm) => playerSize(lm)).filter((size) => size > 0.05);
    const medSize = sizes.length ? [...sizes].sort((a, b) => a - b)[Math.floor(sizes.length / 2)] : 1;
    const far = medSize < 0.42 || playerSize(frames[keyFrame] ?? []) < 0.28;
    const folded = resolved.view !== 'front' && arm != null && arm < 140;
    const panning = context?.motion === 'pan' || context?.motion === 'zoom';
    // A far, folded, crowded or panning bowler has no release we can time. The number stays hidden.
    if (panning || far || folded || context?.crowded) return { ok: false, problem: 'no-action' };
    return {
      ok: true,
      analysis: {
        ...result, keyFrame, keyLabel: 'At release', framesSeen,
        playerSize: playerSize(frames[keyFrame] ?? frames[0]), warnings, unique: result.unique, confidence,
      },
    };
  }

  const metrics = analyse(sampled.frames, 'batting', hand, w, h, shotType, resolved.view, sampled.times);
  if (!metrics) return { ok: false, problem: feetMissing ? 'feet-out-of-frame' : 'no-body' };
  const contact = findContact(sampled.frames, hand, w, h, sampled.times, shotType);
  const keyFrame = sampled.toOriginal(contact.frame);
  const confidence = combineConfidence(
    readingConfidence({ frames, keyFrame, times, ratio: detected.ratio, motion: context?.motion }),
    contact.confidence,
  );
  metrics.forEach((metric) => { metric.confidence = confidence; });
  return {
    ok: true,
    analysis: {
      metrics, keyFrame, keyLabel: 'At contact', framesSeen,
      playerSize: playerSize(frames[keyFrame] ?? frames[0]), warnings, unique: [], confidence,
    },
  };
}

const SAMPLE_FPS = 30;

function lerpLandmark(a: Landmark, b: Landmark, u: number): Landmark {
  const av = a?.visibility ?? 0;
  const bv = b?.visibility ?? 0;
  if (av >= MIN_VISIBILITY && bv < MIN_VISIBILITY) return { ...a };
  if (bv >= MIN_VISIBILITY && av < MIN_VISIBILITY) return { ...b };
  return {
    x: (a?.x ?? 0) + ((b?.x ?? 0) - (a?.x ?? 0)) * u,
    y: (a?.y ?? 0) + ((b?.y ?? 0) - (a?.y ?? 0)) * u,
    z: (a?.z ?? 0) + ((b?.z ?? 0) - (a?.z ?? 0)) * u,
    visibility: Math.min(av, bv),
  };
}

/** Even samples at 30fps so a 10fps clip is not scored on a different clock from a 50fps one. */
export function resampleClip(frames: Landmark[][], times?: number[]): {
  frames: Landmark[][];
  times: number[];
  toOriginal: (index: number) => number;
} {
  const identity = {
    frames,
    times: times && times.length === frames.length ? times : frames.map((_, i) => i / SAMPLE_FPS),
    toOriginal: (index: number) => Math.min(frames.length - 1, Math.max(0, index)),
  };
  const fps = clipFrameRate(times);
  if (!times || times.length !== frames.length || frames.length < 2 || fps == null || fps >= 24) return identity;
  const start = times[0] ?? 0;
  const end = times[times.length - 1] ?? start;
  const step = 1 / SAMPLE_FPS;
  const outFrames: Landmark[][] = [];
  const outTimes: number[] = [];
  for (let t = start; t <= end + 1e-6; t += step) {
    let hi = times.findIndex((time) => time >= t - 1e-6);
    if (hi < 0) hi = times.length - 1;
    const lo = Math.max(0, hi === 0 ? 0 : hi - 1);
    const span = (times[hi] ?? 0) - (times[lo] ?? 0);
    const u = hi === lo || span <= 0 ? 0 : ((t - (times[lo] ?? 0)) / span);
    const count = Math.max(frames[lo]?.length ?? 0, frames[hi]?.length ?? 0);
    outFrames.push(Array.from({ length: count }, (_, joint) => lerpLandmark(frames[lo][joint], frames[hi][joint], Math.min(1, Math.max(0, u)))));
    outTimes.push(Math.min(end, t));
  }
  if (outFrames.length < 4) return identity;
  return {
    frames: outFrames,
    times: outTimes,
    toOriginal: (index: number) => {
      const at = outTimes[Math.min(outTimes.length - 1, Math.max(0, index))] ?? start;
      let best = 0;
      let bestGap = Infinity;
      times.forEach((time, i) => {
        const gap = Math.abs(time - at);
        if (gap < bestGap) { bestGap = gap; best = i; }
      });
      return best;
    },
  };
}

function combineConfidence(a: ScoreConfidence, b: ScoreConfidence): ScoreConfidence {
  const rank: Record<ScoreConfidence, number> = { low: 0, medium: 1, high: 2 };
  return rank[a] <= rank[b] ? a : b;
}

/* ── For drawing the figure ────────────────────────────────────────────────── */

/** The joints each angle is taken at, for labelling the figure: [a, joint, c] */
export function metricJoints(key: string, mode: Mode, hand: Hand): [number, number, number][] {
  const right = hand === 'right';
  const front = right
    ? { shoulder: L.lShoulder, elbow: L.lElbow, wrist: L.lWrist, hip: L.lHip, knee: L.lKnee, ankle: L.lAnkle }
    : { shoulder: L.rShoulder, elbow: L.rElbow, wrist: L.rWrist, hip: L.rHip, knee: L.rKnee, ankle: L.rAnkle };
  const back = right
    ? { shoulder: L.rShoulder, elbow: L.rElbow, wrist: L.rWrist }
    : { shoulder: L.lShoulder, elbow: L.lElbow, wrist: L.lWrist };
  switch (key) {
    case 'frontKnee': return [[front.hip, front.knee, front.ankle]];
    case 'armStraightness': return [[back.shoulder, back.elbow, back.wrist]];
    case 'frontElbow': return [[front.shoulder, front.elbow, front.wrist]];
    case 'backElbow': return mode === 'batting' ? [[back.shoulder, back.elbow, back.wrist]] : [];
    case 'kneeFlex': return [[L.lHip, L.lKnee, L.lAnkle], [L.rHip, L.rKnee, L.rAnkle]];
    default: return [];
  }
}

export type Guide = {
  /** Line to draw, in the same 0 to 1 units as the landmarks */
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** A plumb line is dashed and stands for "should be above this point" */
  plumb?: boolean;
};

/**
 * Lines that show a measure which is not a joint angle: how level the eyes are, how upright
 * the arm or trunk is, whether the head is over the front foot.
 */
export function metricGuides(key: string, lm: Landmark[], mode: Mode, hand: Hand): Guide[] {
  const seen = (...indices: number[]) => visible(lm, ...indices);
  const at = (i: number) => ({ x: lm[i].x, y: lm[i].y });
  const between = (a: number, b: number) => ({ x: (lm[a].x + lm[b].x) / 2, y: (lm[a].y + lm[b].y) / 2 });
  // Stretches a short line (between the eyes, say) so its slope can be seen
  const stretched = (a: { x: number; y: number }, b: { x: number; y: number }, factor: number): Guide => {
    const centre = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    return {
      from: { x: centre.x + (a.x - centre.x) * factor, y: centre.y + (a.y - centre.y) * factor },
      to: { x: centre.x + (b.x - centre.x) * factor, y: centre.y + (b.y - centre.y) * factor },
    };
  };
  const bowlingArm = hand === 'right' ? { shoulder: L.rShoulder, wrist: L.rWrist } : { shoulder: L.lShoulder, wrist: L.lWrist };
  const frontLeg = hand === 'right' ? { knee: L.lKnee, ankle: L.lAnkle } : { knee: L.rKnee, ankle: L.rAnkle };
  const core = [L.lShoulder, L.rShoulder, L.lHip, L.rHip];

  switch (key) {
    case 'armHeight':
    case 'armUpright':
      return seen(bowlingArm.shoulder, bowlingArm.wrist) ? [{ from: at(bowlingArm.shoulder), to: at(bowlingArm.wrist) }] : [];
    case 'sideBend':
    case 'trunkTilt':
      return seen(...core) ? [{ from: between(L.lHip, L.rHip), to: between(L.lShoulder, L.rShoulder) }] : [];
    case 'headLevel':
      return seen(EYES.left, EYES.right) ? [stretched(at(EYES.left), at(EYES.right), 4)] : [];
    case 'shoulderLevel':
      return seen(L.lShoulder, L.rShoulder) ? [stretched(at(L.lShoulder), at(L.rShoulder), 1.4)] : [];
    case 'batSwingPlane':
      return mode === 'batting' && seen(L.lWrist, L.rWrist) ? [stretched(at(L.lWrist), at(L.rWrist), 3)] : [];
    case 'headOverFront':
      return seen(L.nose, frontLeg.ankle) ? [{ from: at(frontLeg.ankle), to: { x: lm[frontLeg.ankle].x, y: lm[L.nose].y }, plumb: true }] : [];
    case 'headOverKnee':
      return seen(L.nose, frontLeg.knee) ? [{ from: at(frontLeg.knee), to: { x: lm[frontLeg.knee].x, y: lm[L.nose].y }, plumb: true }] : [];
    case 'frontFootLine':
      return seen(...core, frontLeg.ankle)
        ? [{ from: between(L.lHip, L.rHip), to: { x: between(L.lHip, L.rHip).x, y: lm[frontLeg.ankle].y }, plumb: true }]
        : [];
    default:
      return [];
  }
}

/** A measured value as text: "172°" or "0.12" */
export function formatValue(m: { unit: string; value: number }) {
  return m.unit === '°' ? `${Math.round(m.value)}°` : m.value.toFixed(2);
}

/** The target range as text: "165° to 180°" or "under 0.15" */
export function formatRange(m: { unit: string; ideal: [number, number] }) {
  const [lo, hi] = m.ideal;
  if (m.unit === '°') return `${lo}° to ${hi}°`;
  return lo === 0 ? `under ${hi}` : `${lo} to ${hi}`;
}
