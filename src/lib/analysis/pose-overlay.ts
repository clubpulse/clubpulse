/**
 * The simplified pose figure: a thick stick body, a small head, and labels only on the
 * joints that were actually scored. The video overlay and the results figure both use this
 * so they cannot drift apart.
 */
import {
  L, MIN_VISIBILITY, ON_TARGET, formatRange, formatValue,
  type Hand, type MetricResult, type Mode, type ShotType, type View,
} from '@/lib/analysis/pose-metrics';

export const OVERLAY_GOLD = '#EFC84A';
export const OVERLAY_AMBER = '#f59e0b';
export const OVERLAY_RED = '#ef4444';
export const OVERLAY_BODY = 'rgba(244,242,236,0.92)';
export const OVERLAY_QUIET = 'rgba(244,242,236,0.38)';
export const OVERLAY_OUTLINE = '#0B0B0B';

/** Joints the simplified figure is allowed to use. Face, fingers and feet stay off it. */
export const OVERLAY_JOINTS: readonly number[] = [
  L.nose,
  L.lShoulder, L.rShoulder, L.lElbow, L.rElbow, L.lWrist, L.rWrist,
  L.lHip, L.rHip, L.lKnee, L.rKnee, L.lAnkle, L.rAnkle,
];

/**
 * Bones of the simplified figure. The spine is the mid-shoulder to mid-hip line and is drawn
 * separately, because it is not a landmark pair.
 */
export const OVERLAY_BONES: readonly [number, number][] = [
  [L.lShoulder, L.rShoulder],
  [L.lShoulder, L.lHip],
  [L.rShoulder, L.rHip],
  [L.lHip, L.rHip],
  [L.lShoulder, L.lElbow],
  [L.lElbow, L.lWrist],
  [L.rShoulder, L.rElbow],
  [L.rElbow, L.rWrist],
  [L.lHip, L.lKnee],
  [L.lKnee, L.lAnkle],
  [L.rHip, L.rKnee],
  [L.rKnee, L.rAnkle],
];

const SMOOTH_JOINTS = new Set<number>(OVERLAY_JOINTS);

export function scoreTone(score: number): string {
  if (score >= ON_TARGET) return OVERLAY_GOLD;
  if (score >= 60) return OVERLAY_AMBER;
  return OVERLAY_RED;
}

export type OverlayPoint = { x: number; y: number; visibility?: number };

type Side = {
  frontShoulder: number; frontElbow: number; frontWrist: number;
  backShoulder: number; backElbow: number; backWrist: number;
  frontHip: number; frontKnee: number; frontAnkle: number;
  backHip: number; backKnee: number; backAnkle: number;
};

function sides(hand: Hand): Side {
  const right = hand === 'right';
  return right
    ? {
        frontShoulder: L.lShoulder, frontElbow: L.lElbow, frontWrist: L.lWrist,
        backShoulder: L.rShoulder, backElbow: L.rElbow, backWrist: L.rWrist,
        frontHip: L.lHip, frontKnee: L.lKnee, frontAnkle: L.lAnkle,
        backHip: L.rHip, backKnee: L.rKnee, backAnkle: L.rAnkle,
      }
    : {
        frontShoulder: L.rShoulder, frontElbow: L.rElbow, frontWrist: L.rWrist,
        backShoulder: L.lShoulder, backElbow: L.lElbow, backWrist: L.lWrist,
        frontHip: L.rHip, frontKnee: L.rKnee, frontAnkle: L.rAnkle,
        backHip: L.lHip, backKnee: L.lKnee, backAnkle: L.lAnkle,
      };
}

function sameBone(a: number, b: number, c: number, d: number) {
  return (a === c && b === d) || (a === d && b === c);
}

/** The non-scoring arm and the back leg are drawn lighter so the action reads first. */
export function boneIsQuiet(a: number, b: number, mode: Mode, hand: Hand): boolean {
  const s = sides(hand);
  const quiet = mode === 'bowling'
    ? [[s.frontShoulder, s.frontElbow], [s.frontElbow, s.frontWrist], [s.backHip, s.backKnee], [s.backKnee, s.backAnkle]]
    : [[s.backShoulder, s.backElbow], [s.backElbow, s.backWrist], [s.backHip, s.backKnee], [s.backKnee, s.backAnkle]];
  return quiet.some(([c, d]) => sameBone(a, b, c, d));
}

export type OverlayGuide =
  | { kind: 'vertical'; at: number }
  | { kind: 'plumb'; at: number; nose: number }
  | { kind: 'bat'; a: number; b: number };

export type OverlayHighlight = {
  key: string;
  colour: string;
  /** Pill text, taken from the scored value, not re-measured off one frame. */
  label: string;
  onTarget: boolean;
  /** Real bones, each a chain of landmark indices. Never a shoulder-to-wrist shortcut. */
  limbs: number[][];
  /** Joint that receives the coloured dot. Null for a head or bat cue. */
  joint: number | null;
  /** Angle arc through a, the joint, and c. */
  arc: [number, number, number] | null;
  /** Arc drawn from straight up at the shoulder toward the wrist, for arm height. */
  verticalArc: { shoulder: number; wrist: number } | null;
  guides: OverlayGuide[];
};

const STRENGTH: Record<string, string> = {
  armStraightness: 'Bowling arm is straight',
  frontElbow: 'Front elbow is high',
  frontFootLine: 'Front foot lands under the hips',
  frontKnee: 'Front knee is braced',
  kneeFlex: 'Knees are nicely flexed',
  headStability: 'Head is steady',
  armHeight: 'Arm is up at release',
  headOverKnee: 'Head is over the front knee',
  headOverFront: 'Head is over the front foot',
  backElbow: 'Back elbow is in a good place',
  batSwingPlane: 'Bat comes through on a good line',
};

const WORK_ON: Record<string, string> = {
  armHeight: 'Arm height at release — keep it closer to vertical',
  headOverKnee: 'Head position — get the head over the front knee',
  headOverFront: 'Head position — get the head over the front foot',
  trunkTilt: 'Forward lean at release',
  armStraightness: 'Bowling arm — keep it straighter through release',
  frontElbow: 'Front elbow — lead with it higher',
  backElbow: 'Back elbow — keep it up through the shot',
  frontKnee: 'Front knee — brace it as the front foot lands',
  kneeFlex: 'Knees — keep a little flex so you can move',
  headStability: 'Head — keep it steadier through the shot',
  batSwingPlane: 'Bat path — bring it through on the line of the shot',
};

export function strengthPhrase(metric: MetricResult): string {
  return STRENGTH[metric.key] ?? metric.label;
}

export function workOnPhrase(metric: MetricResult): string {
  return WORK_ON[metric.key] ?? metric.label;
}

/** The best counted measure, for the "Strength" line. Excused unique actions are left out. */
export function strongestMeasure(metrics: MetricResult[]): MetricResult | null {
  const counted = metrics.filter((metric) => !metric.excused);
  if (counted.length === 0) return null;
  return counted.reduce((best, metric) => (metric.score > best.score ? metric : best));
}

function shortLabel(metric: MetricResult, target: boolean): string {
  const name = metric.key === 'armStraightness' || metric.key === 'armHeight' ? 'Arm'
    : metric.key === 'frontKnee' || metric.key === 'kneeFlex' ? 'Knee'
      : metric.key === 'frontElbow' || metric.key === 'backElbow' ? 'Elbow'
        : metric.key === 'batSwingPlane' ? 'Bat'
          : metric.key === 'headOverKnee' || metric.key === 'headOverFront' || metric.key === 'headStability' ? 'Head'
            : metric.label;
  if (name === 'Head') return 'Head';
  if (target) {
    const range = formatRange(metric).replace(/° to /, '–').replace('°', '');
    return `${name} ${range}${metric.unit === '°' ? '°' : ''}`;
  }
  return `${name} ${formatValue(metric)}`;
}

function toHighlight(metric: MetricResult, hand: Hand, target: boolean): OverlayHighlight {
  const s = sides(hand);
  const colour = target ? OVERLAY_GOLD : scoreTone(metric.score);
  const base: OverlayHighlight = {
    key: metric.key,
    colour,
    label: shortLabel(metric, target),
    onTarget: metric.score >= ON_TARGET,
    limbs: [],
    joint: null,
    arc: null,
    verticalArc: null,
    guides: [],
  };
  switch (metric.key) {
    case 'armStraightness':
      return {
        ...base,
        limbs: [[s.backShoulder, s.backElbow, s.backWrist]],
        joint: s.backElbow,
        arc: [s.backShoulder, s.backElbow, s.backWrist],
      };
    case 'armHeight':
      // The coloured arm follows the real bones. The dashed line is the vertical the angle is measured against.
      return {
        ...base,
        limbs: [[s.backShoulder, s.backElbow, s.backWrist]],
        joint: s.backElbow,
        verticalArc: { shoulder: s.backShoulder, wrist: s.backWrist },
        guides: [{ kind: 'vertical', at: s.backShoulder }],
      };
    case 'frontKnee':
      return {
        ...base,
        limbs: [[s.frontHip, s.frontKnee, s.frontAnkle]],
        joint: s.frontKnee,
        arc: [s.frontHip, s.frontKnee, s.frontAnkle],
      };
    case 'kneeFlex':
      return {
        ...base,
        limbs: [[s.frontHip, s.frontKnee, s.frontAnkle]],
        joint: s.frontKnee,
        arc: [s.frontHip, s.frontKnee, s.frontAnkle],
      };
    case 'frontElbow':
      return {
        ...base,
        limbs: [[s.frontShoulder, s.frontElbow, s.frontWrist]],
        joint: s.frontElbow,
        arc: [s.frontShoulder, s.frontElbow, s.frontWrist],
      };
    case 'backElbow':
      return {
        ...base,
        limbs: [[s.backShoulder, s.backElbow, s.backWrist]],
        joint: s.backElbow,
        arc: [s.backShoulder, s.backElbow, s.backWrist],
      };
    case 'headOverKnee':
      return { ...base, guides: [{ kind: 'plumb', at: s.frontKnee, nose: L.nose }] };
    case 'headOverFront':
      return { ...base, guides: [{ kind: 'plumb', at: s.frontAnkle, nose: L.nose }] };
    case 'headStability':
      return base;
    case 'batSwingPlane':
      return { ...base, limbs: [[L.lWrist, L.rWrist]], guides: [{ kind: 'bat', a: L.lWrist, b: L.rWrist }] };
    default:
      return base;
  }
}

function take(metrics: MetricResult[], key: string): MetricResult | undefined {
  return metrics.find((metric) => metric.key === key);
}

/**
 * The one or two (bowling) or two or three (batting) measures worth painting on the figure.
 * Everything else stays in the detailed list.
 */
export function pickHighlights(
  metrics: MetricResult[], mode: Mode, hand: Hand, view: View, shot?: ShotType, target = false,
): OverlayHighlight[] {
  const chosen: MetricResult[] = [];
  const add = (metric: MetricResult | undefined) => { if (metric && metric.confidence !== 'low') chosen.push(metric); };
  if (mode === 'bowling') {
    if (view === 'front') add(take(metrics, 'armHeight'));
    else add(take(metrics, 'armStraightness'));
    add(take(metrics, 'frontKnee'));
  } else {
    const played = shot ?? 'drive';
    const head = take(metrics, 'headOverKnee') ?? take(metrics, 'headOverFront');
    if (played === 'pull') {
      add(take(metrics, 'kneeFlex'));
      add(take(metrics, 'backElbow'));
    } else if (played === 'cut') {
      add(take(metrics, 'frontElbow'));
      add(take(metrics, 'batSwingPlane'));
      add(head);
    } else if (played === 'sweep') {
      add(take(metrics, 'kneeFlex'));
      add(take(metrics, 'frontElbow'));
      add(head);
    } else {
      add(take(metrics, 'frontElbow'));
      add(take(metrics, 'kneeFlex'));
      add(head);
    }
  }
  return chosen.map((metric) => toHighlight(metric, hand, target));
}

/** True for a few frames before the key moment and a short hold on it, so a label can be read. */
export function highlightsVisible(time: number, keyTime: number): boolean {
  return time >= keyTime - 0.25 && time <= keyTime + 0.1;
}

const GAUSS_SIGMA = 1.15;
const GAUSS_WEIGHTS = [-2, -1, 0, 1, 2].map((k) => Math.exp(-(k * k) / (2 * GAUSS_SIGMA * GAUSS_SIGMA)));

/**
 * Smooth one stored frame with a short look both ways, so the skeleton does not twitch and the
 * key frame does not lag behind the action. A point under the visibility line is left alone.
 */
export function smoothOverlayFrame<T extends OverlayPoint>(frames: T[][], index: number): T[] {
  const current = frames[index];
  if (!current) return [];
  return current.map((point, joint) => {
    if (!SMOOTH_JOINTS.has(joint) || (point.visibility ?? 0) < MIN_VISIBILITY) return point;
    let sx = 0;
    let sy = 0;
    let sw = 0;
    for (let k = -2; k <= 2; k++) {
      const sample = frames[index + k]?.[joint];
      if (!sample || (sample.visibility ?? 0) < MIN_VISIBILITY) continue;
      const weight = GAUSS_WEIGHTS[k + 2];
      sx += sample.x * weight;
      sy += sample.y * weight;
      sw += weight;
    }
    if (sw <= 0) return point;
    return { ...point, x: sx / sw, y: sy / sw };
  });
}

function seen(point: OverlayPoint | undefined): point is OverlayPoint {
  return !!point && (point.visibility ?? 0) >= MIN_VISIBILITY;
}

function stroke(ctx: CanvasRenderingContext2D, points: OverlayPoint[], colour: string, width: number) {
  if (points.length < 2 || points.some((point) => !seen(point))) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.stroke();
}

function outlined(ctx: CanvasRenderingContext2D, points: OverlayPoint[], colour: string, width: number, outline: number) {
  stroke(ctx, points, OVERLAY_OUTLINE, width + outline);
  stroke(ctx, points, colour, width);
}

function playerBox(points: OverlayPoint[]) {
  const body = OVERLAY_JOINTS.map((index) => points[index]).filter(seen);
  if (body.length < 2) return { height: 0, top: 0, bottom: 0 };
  const ys = body.map((point) => point.y);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  return { height: Math.max(1, bottom - top), top, bottom };
}

function headCentre(points: OverlayPoint[], radius: number): OverlayPoint | null {
  const nose = points[L.nose];
  const left = points[L.lShoulder];
  const right = points[L.rShoulder];
  const shoulders = seen(left) && seen(right)
    ? { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2, visibility: 1 }
    : null;
  if (seen(nose) && shoulders) {
    const away = { x: nose.x - shoulders.x, y: nose.y - shoulders.y };
    const length = Math.hypot(away.x, away.y) || 1;
    const nudge = radius * 0.35;
    return { x: nose.x + (away.x / length) * nudge, y: nose.y + (away.y / length) * nudge, visibility: 1 };
  }
  if (seen(nose)) return { x: nose.x, y: nose.y - radius * 0.35, visibility: 1 };
  if (shoulders) return { x: shoulders.x, y: shoulders.y - radius * 1.4, visibility: 1 };
  return null;
}

function drawHead(ctx: CanvasRenderingContext2D, points: OverlayPoint[], playerHeight: number, cap: number) {
  const left = points[L.lShoulder];
  const right = points[L.rShoulder];
  const shoulderWidth = seen(left) && seen(right) ? Math.hypot(left.x - right.x, left.y - right.y) : playerHeight * 0.18;
  const hip = points[L.lHip];
  const torso = seen(left) && seen(hip) ? Math.hypot(left.x - hip.x, left.y - hip.y) : shoulderWidth;
  const radius = Math.min(0.16 * Math.max(shoulderWidth, torso), 0.06 * playerHeight, cap);
  const centre = headCentre(points, radius);
  if (!centre || radius < 2) return;
  ctx.beginPath();
  ctx.arc(centre.x, centre.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(244,242,236,0.16)';
  ctx.fill();
  ctx.lineWidth = Math.max(2, radius * 0.18);
  ctx.strokeStyle = OVERLAY_OUTLINE;
  ctx.stroke();
  ctx.strokeStyle = OVERLAY_BODY;
  ctx.lineWidth = Math.max(1.5, radius * 0.12);
  ctx.stroke();
}

function drawArc(ctx: CanvasRenderingContext2D, a: OverlayPoint, joint: OverlayPoint, c: OverlayPoint, radius: number, width: number, colour: string) {
  const start = Math.atan2(a.y - joint.y, a.x - joint.x);
  const end = Math.atan2(c.y - joint.y, c.x - joint.x);
  let sweep = end - start;
  while (sweep > Math.PI) sweep -= Math.PI * 2;
  while (sweep < -Math.PI) sweep += Math.PI * 2;
  ctx.beginPath();
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.arc(joint.x, joint.y, radius, start, start + sweep, sweep < 0);
  ctx.stroke();
}

function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, onTarget: boolean, scale: number) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.6, 1.8 * scale);
  if (onTarget) {
    ctx.strokeStyle = OVERLAY_GOLD;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 4 * scale, y + 4 * scale);
    ctx.lineTo(x + 10 * scale, y - 5 * scale);
    ctx.stroke();
  } else {
    ctx.strokeStyle = OVERLAY_RED;
    ctx.beginPath();
    ctx.moveTo(x, y - 4 * scale);
    ctx.lineTo(x + 8 * scale, y + 4 * scale);
    ctx.moveTo(x + 8 * scale, y - 4 * scale);
    ctx.lineTo(x, y + 4 * scale);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPill(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number, colour: string, onTarget: boolean, scale: number,
  bounds: { width: number; height: number },
) {
  ctx.save();
  const font = Math.max(12, Math.round(13 * Math.min(scale, 2.2)));
  ctx.font = `600 ${font}px Inter, system-ui, sans-serif`;
  const textWidth = ctx.measureText(text).width;
  const mark = 14 * scale;
  const padX = 8 * scale;
  const height = 22 * scale;
  let left = x - (textWidth + mark) / 2;
  let top = y - height / 2;
  left = Math.min(bounds.width - textWidth - mark - padX * 2, Math.max(4, left));
  top = Math.min(bounds.height - height - 4, Math.max(4, top));
  ctx.fillStyle = 'rgba(11,11,11,0.88)';
  ctx.beginPath();
  ctx.roundRect(left, top, textWidth + mark + padX * 2, height, 8 * scale);
  ctx.fill();
  ctx.fillStyle = '#F4F2EC';
  ctx.fillText(text, left + padX, top + height * 0.72);
  drawMark(ctx, left + padX + textWidth + 2 * scale, top + height * 0.55, onTarget, scale);
  ctx.restore();
}

function drawGuides(ctx: CanvasRenderingContext2D, points: OverlayPoint[], guides: OverlayGuide[], colour: string, width: number, playerHeight: number, scale: number) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.setLineDash([5 * scale, 4 * scale]);
  ctx.lineCap = 'round';
  for (const guide of guides) {
    if (guide.kind === 'vertical') {
      const at = points[guide.at];
      if (!seen(at)) continue;
      ctx.beginPath();
      ctx.moveTo(at.x, at.y - playerHeight * 0.22);
      ctx.lineTo(at.x, at.y + playerHeight * 0.04);
      ctx.stroke();
    } else if (guide.kind === 'plumb') {
      const at = points[guide.at];
      const nose = points[guide.nose];
      if (!seen(at) || !seen(nose)) continue;
      ctx.beginPath();
      ctx.moveTo(at.x, at.y);
      ctx.lineTo(at.x, nose.y);
      ctx.moveTo(nose.x, nose.y);
      ctx.lineTo(at.x, nose.y);
      ctx.stroke();
    } else if (guide.kind === 'bat') {
      const a = points[guide.a];
      const b = points[guide.b];
      if (!seen(a) || !seen(b)) continue;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export type PaintOverlayOptions = {
  mode: Mode;
  hand: Hand;
  highlights?: OverlayHighlight[];
  /** Device-pixel scale. 1 on the results figure, the canvas-to-screen ratio on video. */
  scale?: number;
  /** Hard cap on the head circle, in the same pixels as the points. */
  headCap?: number;
};

/** Draws the simplified body, then the scored highlights, in the coordinate space of `points`. */
export function paintOverlay(ctx: CanvasRenderingContext2D, points: OverlayPoint[], options: PaintOverlayOptions) {
  const scale = options.scale ?? 1;
  const box = playerBox(points);
  if (box.height < 8) return;
  const bodyWidth = Math.max(5 * scale, 0.022 * box.height);
  const outline = 2.5 * scale;
  const highlighted = new Set<string>();
  for (const highlight of options.highlights ?? []) {
    for (const limb of highlight.limbs) {
      for (let i = 0; i < limb.length - 1; i++) highlighted.add(`${limb[i]}:${limb[i + 1]}`);
    }
  }
  const covered = (a: number, b: number) => highlighted.has(`${a}:${b}`) || highlighted.has(`${b}:${a}`);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const bones: { points: OverlayPoint[]; quiet: boolean }[] = [];
  for (const [a, b] of OVERLAY_BONES) {
    if (covered(a, b) || !seen(points[a]) || !seen(points[b])) continue;
    bones.push({ points: [points[a], points[b]], quiet: boneIsQuiet(a, b, options.mode, options.hand) });
  }
  const left = points[L.lShoulder];
  const right = points[L.rShoulder];
  const hips = points[L.lHip] && points[L.rHip] && seen(points[L.lHip]) && seen(points[L.rHip]) && seen(left) && seen(right)
    ? [
        { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2, visibility: 1 },
        { x: (points[L.lHip].x + points[L.rHip].x) / 2, y: (points[L.lHip].y + points[L.rHip].y) / 2, visibility: 1 },
      ]
    : null;
  if (hips) bones.unshift({ points: hips, quiet: false });

  for (const bone of bones.filter((bone) => bone.quiet)) outlined(ctx, bone.points, OVERLAY_QUIET, bodyWidth, outline);
  for (const bone of bones.filter((bone) => !bone.quiet)) outlined(ctx, bone.points, OVERLAY_BODY, bodyWidth, outline);
  drawHead(ctx, points, box.height, options.headCap ?? 22 * scale);

  const highlightWidth = bodyWidth * 1.45;
  const arcWidth = bodyWidth * 0.55;
  const arcRadius = 0.055 * box.height;
  for (const highlight of options.highlights ?? []) {
    for (const limb of highlight.limbs) {
      outlined(ctx, limb.map((index) => points[index]), highlight.colour, highlightWidth, outline);
    }
    if (highlight.arc) {
      const [a, joint, c] = highlight.arc;
      if (seen(points[a]) && seen(points[joint]) && seen(points[c])) {
        drawArc(ctx, points[a], points[joint], points[c], arcRadius, arcWidth, highlight.colour);
      }
    }
    if (highlight.verticalArc && seen(points[highlight.verticalArc.shoulder]) && seen(points[highlight.verticalArc.wrist])) {
      const shoulder = points[highlight.verticalArc.shoulder];
      const wrist = points[highlight.verticalArc.wrist];
      const aim = Math.atan2(wrist.y - shoulder.y, wrist.x - shoulder.x);
      ctx.beginPath();
      ctx.strokeStyle = highlight.colour;
      ctx.lineWidth = arcWidth;
      ctx.arc(shoulder.x, shoulder.y, arcRadius, -Math.PI / 2, aim, aim > -Math.PI / 2);
      ctx.stroke();
    }
    drawGuides(ctx, points, highlight.guides, highlight.colour, arcWidth, box.height, scale);
    if (highlight.joint != null && seen(points[highlight.joint])) {
      const joint = points[highlight.joint];
      ctx.beginPath();
      ctx.arc(joint.x, joint.y, highlightWidth * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = highlight.colour;
      ctx.fill();
    }
    const anchor = highlight.joint != null && seen(points[highlight.joint])
      ? points[highlight.joint]
      : highlight.guides[0]?.kind === 'plumb' && seen(points[highlight.guides[0].nose])
        ? points[highlight.guides[0].nose]
        : highlight.limbs[0] && seen(points[highlight.limbs[0][0]])
          ? points[highlight.limbs[0][0]]
          : null;
    if (anchor) {
      drawPill(ctx, highlight.label, anchor.x, anchor.y - box.height * 0.08, highlight.colour, highlight.onTarget, scale, {
        width: ctx.canvas.width / (ctx.getTransform().a || 1),
        height: ctx.canvas.height / (ctx.getTransform().d || 1),
      });
    }
  }
  ctx.restore();
}

/** A small clock in the corner of a replay, so the skeleton is not the only thing on screen. */
export function paintTimeBadge(ctx: CanvasRenderingContext2D, seconds: number, scale = 1) {
  const text = `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, '0')}`;
  ctx.save();
  ctx.font = `600 ${Math.max(12, 13 * scale)}px Inter, system-ui, sans-serif`;
  const width = ctx.measureText(text).width + 16 * scale;
  const height = 22 * scale;
  ctx.fillStyle = 'rgba(11,11,11,0.88)';
  ctx.beginPath();
  ctx.roundRect(8 * scale, 8 * scale, width, height, 8 * scale);
  ctx.fill();
  ctx.fillStyle = '#BEBEC4';
  ctx.fillText(text, 16 * scale, 8 * scale + height * 0.72);
  ctx.restore();
}
