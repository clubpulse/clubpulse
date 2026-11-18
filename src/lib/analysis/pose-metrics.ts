// Technique scoring from body landmarks (MediaPipe Pose). Pure functions, no browser needed.
//
// Batting is averaged over the clip. Bowling is measured at the moment of release: averaging a
// bowler's knee and arm angles over the run-up says nothing about the action itself.
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

export type MetricDef = { key: string; label: string; unit: string; ideal: [number, number]; tolerance: number; tip: string };
export type MetricResult = MetricDef & { value: number; score: number };

// Shot-type-aware ideal ranges for batting metrics.
// Each entry overrides the default ideal for that shot.
// Keys match the metric keys in METRICS.batting.
const SHOT_OVERRIDES: Partial<Record<ShotType, Partial<Record<string, [number, number]>>>> = {
  pull: {
    // Pull/hook: weight on back foot, front arm higher, big hip rotation, shoulder dips
    frontElbow:     [100, 145],
    kneeFlex:       [130, 155],  // more loaded back leg
    shoulderLevel:  [5, 20],     // natural tilt playing a short ball
    hipRotation:    [30, 60],    // powerful rotation through the ball
    weightTransfer: [0.3, 0.6],  // weight stays back or only slightly transfers
  },
  cut: {
    frontElbow:     [80, 120],
    shoulderLevel:  [0, 15],
    hipRotation:    [15, 40],
    weightTransfer: [0.3, 0.65],
  },
  sweep: {
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
    // Classic straight/cover drive: full extension, weight fully transferred
    frontElbow:     [90, 125],
    kneeFlex:       [150, 170],
    hipRotation:    [25, 50],
    weightTransfer: [0.65, 0.9],
  },
  leave: {
    // Leave: balanced, minimal movement, head still, weight centred
    kneeFlex:       [150, 170],
    hipRotation:    [0, 10],
    weightTransfer: [0.4, 0.6],
    headStability:  [0, 0.08],  // extra still on a leave
  },
};

export const METRICS: Record<Mode, MetricDef[]> = {
  // Bowling is measured at the moment of release, not averaged over the run-up (see bowlingAnalysis)
  bowling: [
    { key: 'frontKnee', label: 'Front knee brace', unit: '°', ideal: [165, 180], tolerance: 30,
      tip: 'Land on a firm, straight front leg to transfer momentum into the ball.' },
    { key: 'armStraightness', label: 'Bowling arm straightness', unit: '°', ideal: [165, 180], tolerance: 25,
      tip: 'Keep the bowling arm as straight as possible from shoulder height to release.' },
    { key: 'armUpright', label: 'Arm height at release', unit: '°', ideal: [0, 20], tolerance: 35,
      tip: 'Release with the arm close to vertical, brushing past your ear. A low arm loses bounce and accuracy.' },
    { key: 'trunkTilt', label: 'Trunk tilt at release', unit: '°', ideal: [5, 25], tolerance: 20,
      tip: 'A moderate lean helps; too much strains the lower back.' },
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
    { key: 'batSwingPlane', label: 'Bat swing plane', unit: '°', ideal: [70, 110], tolerance: 30,
      tip: 'A straight bat plane (near vertical) gives more margin for error than a cross-bat swing.' },
    { key: 'backElbow', label: 'Back elbow position', unit: '°', ideal: [60, 100], tolerance: 35,
      tip: 'A raised back elbow at the top of the backswing powers the downswing — don\'t let it collapse.' },
    { key: 'wristCock', label: 'Wrist cock', unit: '°', ideal: [100, 145], tolerance: 35,
      tip: 'Cocked wrists at the top of backswing store energy — release them through impact for timing.' },
  ],
};

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

function scoreFor(value: number, [lo, hi]: [number, number], tolerance: number) {
  const off = value < lo ? lo - value : value > hi ? value - hi : 0;
  return Math.round(Math.max(0, 100 - (100 * off) / tolerance));
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
  const hipRotation = Math.abs(((shoulderAngle - hipAngle) * 180) / Math.PI);

  // Weight transfer: horizontal position of centre of mass (hipMid) relative to foot positions
  // 0 = fully back foot, 1 = fully front foot
  const frontAnkle = p(front.ankle);
  const backAnkle = p(back.hip === L.rHip
    ? (hand === 'right' ? L.rAnkle : L.lAnkle)
    : (hand === 'right' ? L.lAnkle : L.rAnkle));
  const footSpan = Math.abs(frontAnkle.x - backAnkle.x);
  const weightTransfer = footSpan > 10
    ? Math.min(1, Math.max(0, Math.abs(hipMid.x - backAnkle.x) / footSpan))
    : 0.5;

  // Bat swing plane: angle of the line from back wrist to front wrist relative to vertical
  // Near 90° = vertical bat, deviating = cross-bat
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

// Averages each metric across all usable frames; head stability is the spread of head position over the clip.
// For batting, shotType-aware ideal ranges override the defaults via SHOT_OVERRIDES.
export function analyse(frames: Landmark[][], mode: Mode, hand: Hand, w: number, h: number, shotType?: ShotType): MetricResult[] | null {
  if (mode === 'bowling') return bowlingAnalysis(frames, hand, w, h)?.metrics ?? null;

  const usable = frames.map((lm) => frameMetrics(lm, mode, hand, w, h)).filter((f) => f !== null);
  if (usable.length < MIN_FRAMES) return null;

  const noseMean = mean(usable.map((f) => f.noseX));
  const headSpread = Math.sqrt(mean(usable.map((f) => (f.noseX - noseMean) ** 2)));

  // Phase detection from wrist vertical velocity: high wrist = backswing, low wrist = contact/follow-through
  // We score contact-phase frames more heavily for batting metrics
  const wristYValues = usable.map((f) => f.wristY).filter((y): y is number => y !== null);
  const wristPeak = wristYValues.length > 0 ? Math.min(...wristYValues) : null; // smallest y = highest point (screen coords)

  const overrides = shotType ? (SHOT_OVERRIDES[shotType] ?? {}) : {};

  return METRICS[mode].map((def) => {
    let value: number;
    if (def.key === 'headStability') {
      value = headSpread;
    } else if (mode === 'batting' && def.key === 'batSwingPlane' && wristPeak !== null) {
      // For swing plane, weight the contact phase (wrist descending) more than the backswing
      const contactFrames = usable.filter((f) => f.wristY !== null && f.wristY > wristPeak + 0.05);
      const pool = contactFrames.length >= MIN_FRAMES / 2 ? contactFrames : usable;
      value = mean(pool.map((f) => f.values[def.key]).filter((v) => !isNaN(v)));
    } else {
      const raw = usable.map((f) => f.values[def.key]).filter((v) => v !== undefined && !isNaN(v));
      value = raw.length > 0 ? mean(raw) : 0;
    }

    // Apply shot-type override if present
    const ideal: [number, number] = overrides[def.key] ?? def.ideal;
    return { ...def, ideal, value, score: scoreFor(value, ideal, def.tolerance) };
  });
}

// Highlight score for one segment: technique score scaled by the share of frames with a clearly visible pose,
// so a strong but mostly occluded clip ranks below a clean, fully visible one.
export function segmentScore(frames: Landmark[][], totalFrames: number, mode: Mode, hand: Hand, w: number, h: number, shotType?: ShotType) {
  if (totalFrames === 0) return 0;
  const metrics = analyse(frames, mode, hand, w, h, shotType);
  if (!metrics) return 0;
  const usable = frames.filter(coreVisible).length;
  return Math.round(mean(metrics.map((m) => m.score)) * Math.min(1, usable / totalFrames));
}

/* ── Bowling: measured at release ──────────────────────────────────────────── */

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

function sides(hand: Hand) {
  // A right-armer bowls with the right arm and lands on the left (front) leg
  return hand === 'right'
    ? { shoulder: L.rShoulder, elbow: L.rElbow, wrist: L.rWrist, hip: L.lHip, knee: L.lKnee, ankle: L.lAnkle }
    : { shoulder: L.lShoulder, elbow: L.lElbow, wrist: L.lWrist, hip: L.rHip, knee: L.rKnee, ankle: L.rAnkle };
}

/**
 * Finds the release (bowling hand at its highest, above the head) and measures the action there.
 * Returns null when no bowling action can be seen, e.g. someone standing or walking.
 */
export function bowlingAnalysis(frames: Landmark[][], hand: Hand, w: number, h: number): { metrics: MetricResult[]; keyFrame: number } | null {
  const side = sides(hand);
  const p = (lm: Landmark[], i: number): Point => ({ x: lm[i].x * w, y: lm[i].y * h });
  const torso = (lm: Landmark[]) => Math.max(1, dist(mid(p(lm, L.lShoulder), p(lm, L.rShoulder)), mid(p(lm, L.lHip), p(lm, L.rHip))));

  // Release: the frame where the bowling wrist is furthest above its shoulder
  let release = -1;
  let best = 0;
  frames.forEach((lm, i) => {
    if (!coreVisible(lm) || !visible(lm, L.nose, side.shoulder, side.elbow, side.wrist)) return;
    const wrist = p(lm, side.wrist);
    // The hand has to be above the head and the elbow above the shoulder, or it is not a delivery
    if (wrist.y >= p(lm, L.nose).y || p(lm, side.elbow).y >= p(lm, side.shoulder).y) return;
    const height = (p(lm, side.shoulder).y - wrist.y) / torso(lm);
    if (height > best) {
      best = height;
      release = i;
    }
  });
  if (release < 0 || best < 0.6) return null;

  const window = (before: number, after: number) => frames.slice(Math.max(0, release - before), release + after + 1);
  const measure = (pool: Landmark[][], needed: number[], fn: (lm: Landmark[]) => number) => {
    const values = pool.filter((lm) => visible(lm, ...needed)).map(fn).filter((v) => Number.isFinite(v));
    return values.length > 0 ? median(values) : null;
  };

  const around = window(2, 1);
  const values: Record<string, number | null> = {
    frontKnee: measure(around, [side.hip, side.knee, side.ankle], (lm) => angleAt(p(lm, side.hip), p(lm, side.knee), p(lm, side.ankle))),
    // From the arm coming over the shoulder up to release
    armStraightness: measure(
      window(4, 0).filter((lm) => visible(lm, side.shoulder, side.wrist) && p(lm, side.wrist).y < p(lm, side.shoulder).y),
      [side.shoulder, side.elbow, side.wrist],
      (lm) => angleAt(p(lm, side.shoulder), p(lm, side.elbow), p(lm, side.wrist)),
    ),
    // Angle of the bowling arm away from straight up, at release
    armUpright: measure([frames[release]], [side.shoulder, side.wrist], (lm) => {
      const shoulder = p(lm, side.shoulder);
      const wrist = p(lm, side.wrist);
      return Math.abs((Math.atan2(wrist.x - shoulder.x, shoulder.y - wrist.y) * 180) / Math.PI);
    }),
    trunkTilt: measure(around, [L.lShoulder, L.rShoulder, L.lHip, L.rHip], (lm) => {
      const shoulders = mid(p(lm, L.lShoulder), p(lm, L.rShoulder));
      const hips = mid(p(lm, L.lHip), p(lm, L.rHip));
      return Math.abs((Math.atan2(shoulders.x - hips.x, hips.y - shoulders.y) * 180) / Math.PI);
    }),
  };

  // Head stability: how much the head moves relative to the shoulders through the delivery stride.
  // Measured against the body, not the picture, because the bowler is running across it.
  const stride = window(12, 2).filter((lm) => coreVisible(lm) && visible(lm, L.nose));
  if (stride.length >= 4) {
    const offsets = stride.map((lm) => (p(lm, L.nose).x - mid(p(lm, L.lShoulder), p(lm, L.rShoulder)).x) / torso(lm));
    const centre = mean(offsets);
    values.headStability = Math.sqrt(mean(offsets.map((o) => (o - centre) ** 2)));
  } else {
    values.headStability = null;
  }

  const metrics = METRICS.bowling
    .filter((def) => values[def.key] !== null && values[def.key] !== undefined)
    .map((def) => ({ ...def, value: values[def.key] as number, score: scoreFor(values[def.key] as number, def.ideal, def.tolerance) }));
  return metrics.length >= 2 ? { metrics, keyFrame: release } : null;
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
};

export type AnalysisProblem = 'no-body' | 'no-action';

/** Height from the highest to the lowest visible body point, as a share of the frame */
export function playerSize(lm: Landmark[]) {
  const ys = lm.filter((point, i) => (i === 0 || i >= 11) && (point.visibility ?? 0) >= MIN_VISIBILITY).map((point) => point.y);
  return ys.length >= 2 ? Math.max(...ys) - Math.min(...ys) : 0;
}

/** Scores a clip and picks the position to show. Says why when it cannot. */
export function analyseDetailed(
  frames: Landmark[][], mode: Mode, hand: Hand, w: number, h: number, shotType?: ShotType,
): { ok: true; analysis: Analysis } | { ok: false; problem: AnalysisProblem } {
  const framesSeen = frames.filter(coreVisible).length;
  if (framesSeen < MIN_FRAMES) return { ok: false, problem: 'no-body' };

  if (mode === 'bowling') {
    const result = bowlingAnalysis(frames, hand, w, h);
    if (!result) return { ok: false, problem: 'no-action' };
    return {
      ok: true,
      analysis: { ...result, keyLabel: 'At release', framesSeen, playerSize: playerSize(frames[result.keyFrame]) },
    };
  }

  const metrics = analyse(frames, mode, hand, w, h, shotType);
  if (!metrics) return { ok: false, problem: 'no-body' };
  // Top of the backswing: the back hand at its highest
  const backWrist = hand === 'right' ? L.rWrist : L.lWrist;
  let keyFrame = -1;
  frames.forEach((lm, i) => {
    if (!coreVisible(lm) || !visible(lm, backWrist)) return;
    if (keyFrame < 0 || lm[backWrist].y < frames[keyFrame][backWrist].y) keyFrame = i;
  });
  if (keyFrame < 0) keyFrame = frames.findIndex(coreVisible);
  return {
    ok: true,
    analysis: { metrics, keyFrame, keyLabel: 'Top of the backswing', framesSeen, playerSize: playerSize(frames[keyFrame]) },
  };
}

/** The joints each measurement is taken at, for labelling the figure: [a, joint, c] */
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
