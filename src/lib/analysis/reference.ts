// Textbook technique to compare a player against: a model body position for the key moment,
// the checkpoints a coach looks for, and where the guidance comes from.
//
// The model positions are drawn for a right-hander seen side-on, moving or facing to the right
// of the picture; they are mirrored for left-handers. They are illustrations of the coaching
// model, not a measurement of any one player.

import { L, type Hand, type Landmark, type Mode, type ShotType } from './pose-metrics';

type JointName = keyof typeof L | 'lHeel' | 'rHeel' | 'lToe' | 'rToe';
type Joints = Record<JointName, [number, number]>;

const EXTRA: Record<'lHeel' | 'rHeel' | 'lToe' | 'rToe', number> = { lHeel: 29, rHeel: 30, lToe: 31, rToe: 32 };

/** Model positions are laid out on a square this many units across */
export const REFERENCE_SIZE = 1000;

export type Reference = {
  title: string;
  /** What the figure shows */
  moment: string;
  joints: Joints;
  /** Bat from the hands to the toe of the bat, for batting */
  bat?: [number, number, number, number];
  checkpoints: string[];
  sources: { label: string; url: string }[];
};

const SOURCES = {
  icc: { label: 'ICC Illegal Bowling Regulations (15° elbow extension limit)', url: 'https://www.icc-cricket.com/about/cricket/rules-and-regulations/illegal-bowling-actions' },
  portus: { label: 'Portus (AIS): fast bowling technique, trunk injuries and ball release speed', url: 'https://ojs.ub.uni-konstanz.de/cpa/article/view/3896/3614' },
  frontLeg: { label: 'Front leg mechanics in fast bowling, 3D motion analysis study', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12899921/' },
  ranson: { label: 'Ranson et al.: bowling action classification and lower trunk motion (J Sports Sci 2008)', url: 'https://informahealthcare.com/doi/abs/10.1080/02640410701501671' },
  taliep: { label: 'Taliep et al.: head and centre of mass in the front foot off-drive (Sports Biomech 2007)', url: 'https://informahealthcare.com/doi/abs/10.1080/14763140701491310' },
  stuelcken: { label: "Stuelcken, Portus & Mason: off-side front foot drives in men's high performance cricket (Sports Biomech 2005)", url: 'https://research.usc.edu.au/esploro/outputs/journalArticle/Off-side-front-foot-drives-in-mens/99448906702621' },
};

const BOWLING: Reference = {
  title: 'Textbook bowling action',
  moment: 'At release',
  joints: {
    nose: [562, 258],
    lShoulder: [548, 332], rShoulder: [520, 322],
    lElbow: [592, 420], rElbow: [527, 202],
    lWrist: [560, 500], rWrist: [533, 86],
    lHip: [500, 560], rHip: [478, 560],
    lKnee: [560, 730], rKnee: [408, 688],
    lAnkle: [615, 900], rAnkle: [330, 640],
    lHeel: [600, 915], rHeel: [345, 612], lToe: [680, 906], rToe: [300, 700],
  },
  checkpoints: [
    'Front leg firm at release. A straight, braced front leg is the coaching model; many good bowlers flex a little on landing and then straighten.',
    'Bowling arm straight from shoulder height to release. The law allows up to 15° of straightening at the elbow; the reference check below the scores gives a reading against that.',
    'Arm high at release, close to vertical, brushing past the ear.',
    'Head upright and eyes level, with only a moderate lean of the trunk away from the bowling arm. A big sideways bend is linked with lower back injury.',
    'Hips and shoulders lined up through the delivery stride. Twisting the shoulders back against the hips by more than about 30° (a mixed action) is linked with lower back injury. This cannot be measured from a side-on video.',
    'Front arm pulls down close to the body, and the back leg drives through.',
  ],
  sources: [SOURCES.icc, SOURCES.portus, SOURCES.frontLeg, SOURCES.ranson],
};

// Shared lower body for front foot shots: a full stride with the front knee bent over the foot
const FRONT_FOOT_LEGS = {
  lHip: [552, 560], rHip: [516, 560],
  lKnee: [590, 700], rKnee: [400, 720],
  lAnkle: [620, 880], rAnkle: [330, 880],
  lHeel: [605, 895], rHeel: [318, 868], lToe: [690, 892], rToe: [370, 900],
} satisfies Partial<Joints>;

const BATTING: Record<ShotType, Reference> = {
  drive: {
    title: 'Textbook front foot drive',
    moment: 'At contact',
    joints: {
      nose: [604, 268],
      lShoulder: [582, 350], rShoulder: [532, 346],
      lElbow: [660, 332], rElbow: [566, 480],
      lWrist: [694, 432], rWrist: [688, 472],
      ...FRONT_FOOT_LEGS,
    },
    bat: [694, 420, 650, 770],
    checkpoints: [
      'Head forward and over the front knee at contact. Skilled batters keep their head further forward than less skilled batters through the drive.',
      'A full stride with the front knee bent, so your weight finishes on the front foot.',
      'High front elbow leading the bat down straight, with the full face of the bat.',
      'Shoulders level and head still as the ball arrives.',
      'Contact under the eyes, beside the front pad.',
    ],
    sources: [SOURCES.taliep, SOURCES.stuelcken],
  },
  defence: {
    title: 'Textbook forward defence',
    moment: 'At contact',
    joints: {
      nose: [592, 282],
      lShoulder: [578, 360], rShoulder: [528, 356],
      lElbow: [652, 350], rElbow: [560, 486],
      lWrist: [672, 452], rWrist: [664, 490],
      ...FRONT_FOOT_LEGS,
      lKnee: [586, 705], rKnee: [398, 722],
    },
    bat: [674, 440, 628, 772],
    checkpoints: [
      'Head right over the ball and the front knee.',
      'High front elbow, soft bottom hand, bat angled down so the ball drops at your feet.',
      'Bat and front pad close together, leaving no gap.',
      'Little or no turn of the hips. Stay still at contact.',
    ],
    sources: [SOURCES.taliep],
  },
  leave: {
    title: 'Textbook leave',
    moment: 'As the ball passes',
    joints: {
      nose: [540, 250],
      lShoulder: [540, 335], rShoulder: [492, 335],
      lElbow: [520, 300], rElbow: [470, 330],
      lWrist: [472, 222], rWrist: [458, 240],
      lHip: [512, 560], rHip: [478, 560],
      lKnee: [548, 720], rKnee: [452, 722],
      lAnkle: [565, 880], rAnkle: [420, 880],
      lHeel: [550, 895], rHeel: [406, 895], lToe: [632, 892], rToe: [470, 895],
    },
    bat: [465, 231, 430, 20],
    checkpoints: [
      'Balanced, with your weight even between both feet.',
      'Head still and eyes on the ball all the way past the stumps.',
      'Bat lifted high and inside the line, out of the way of the ball.',
      'Know where your off stump is before you decide to leave.',
    ],
    sources: [],
  },
  pull: {
    title: 'Textbook pull shot',
    moment: 'At contact',
    joints: {
      nose: [520, 262],
      lShoulder: [552, 338], rShoulder: [498, 352],
      lElbow: [628, 372], rElbow: [560, 440],
      lWrist: [684, 336], rWrist: [712, 346],
      lHip: [520, 565], rHip: [482, 565],
      lKnee: [610, 705], rKnee: [505, 715],
      lAnkle: [590, 880], rAnkle: [420, 880],
      lHeel: [575, 895], rHeel: [406, 895], lToe: [658, 890], rToe: [472, 896],
    },
    bat: [672, 344, 900, 316],
    checkpoints: [
      'Back and across early, with your weight on a bent back leg.',
      'Head still and inside the line of the ball.',
      'Arms extended at contact, in front of the body, rolling the wrists to keep the ball down.',
      'Hips and shoulders turn through the shot.',
    ],
    sources: [],
  },
  cut: {
    title: 'Textbook cut shot',
    moment: 'At contact',
    joints: {
      nose: [512, 270],
      lShoulder: [545, 345], rShoulder: [492, 352],
      lElbow: [610, 420], rElbow: [548, 452],
      lWrist: [682, 404], rWrist: [710, 410],
      lHip: [515, 565], rHip: [478, 565],
      lKnee: [598, 708], rKnee: [492, 716],
      lAnkle: [592, 880], rAnkle: [415, 880],
      lHeel: [577, 895], rHeel: [402, 895], lToe: [660, 890], rToe: [468, 896],
    },
    bat: [672, 404, 895, 428],
    checkpoints: [
      'Back and across, with your weight on the back foot.',
      'Wait for width. Head still, eyes level.',
      'Arms reach full stretch at contact, hitting down on the ball.',
      'Roll the wrists over the ball to keep it on the ground.',
    ],
    sources: [],
  },
  sweep: {
    title: 'Textbook sweep',
    moment: 'At contact',
    joints: {
      nose: [640, 400],
      lShoulder: [600, 470], rShoulder: [548, 462],
      lElbow: [640, 570], rElbow: [590, 590],
      lWrist: [735, 562], rWrist: [762, 574],
      lHip: [500, 660], rHip: [465, 664],
      lKnee: [625, 700], rKnee: [395, 850],
      lAnkle: [640, 880], rAnkle: [255, 880],
      lHeel: [625, 895], rHeel: [240, 868], lToe: [712, 892], rToe: [262, 900],
    },
    bat: [724, 557, 905, 640],
    checkpoints: [
      'A long stride to the pitch of the ball, with the front knee bent deeply and the back knee down.',
      'Head over the front knee and in line with the ball.',
      'Bat comes across from high to low, with arms extended at contact.',
      'Front pad in line as a second line of defence.',
    ],
    sources: [],
  },
};

export function getReference(mode: Mode, shotType?: ShotType): Reference {
  return mode === 'bowling' ? BOWLING : BATTING[shotType ?? 'drive'];
}

/**
 * The model position as body landmarks, ready to draw or measure.
 * Left-handers get the mirror image, with left and right joints swapped so the same side leads.
 */
export function referencePose(reference: Reference, hand: Hand): Landmark[] {
  const pose: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0 }));
  const index = (name: JointName) => (name in EXTRA ? EXTRA[name as keyof typeof EXTRA] : L[name as keyof typeof L]);
  const swap = (name: JointName): JointName => {
    if (name === 'nose') return name;
    return ((name.startsWith('l') ? 'r' : 'l') + name.slice(1)) as JointName;
  };
  for (const [name, [x, y]] of Object.entries(reference.joints) as [JointName, [number, number]][]) {
    const target = hand === 'right' ? name : swap(name);
    pose[index(target)] = { x: (hand === 'right' ? x : REFERENCE_SIZE - x) / REFERENCE_SIZE, y: y / REFERENCE_SIZE, visibility: 1 };
  }
  return pose;
}

/** The bat for this hand, in the same 0 to 1 units as the pose */
export function referenceBat(reference: Reference, hand: Hand): [number, number, number, number] | null {
  if (!reference.bat) return null;
  const [x1, y1, x2, y2] = reference.bat;
  const flip = (x: number) => (hand === 'right' ? x : REFERENCE_SIZE - x) / REFERENCE_SIZE;
  return [flip(x1), y1 / REFERENCE_SIZE, flip(x2), y2 / REFERENCE_SIZE];
}
