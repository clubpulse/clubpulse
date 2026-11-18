// Textbook technique to compare a player against: a model body position for the key moment,
// the checkpoints a coach looks for, and where the guidance comes from.
//
// The model positions are drawn for a right-hander seen side-on, moving or facing to the right
// of the picture; they are mirrored for left-handers. They are illustrations of the coaching
// model, not a measurement of any one player.

import { L, type Hand, type Landmark, type Mode, type ShotType, type View } from './pose-metrics';

type ExtraJoint = 'lHeel' | 'rHeel' | 'lToe' | 'rToe' | 'lEye' | 'rEye';
type JointName = keyof typeof L | ExtraJoint;
// Eyes are only drawn where the face can be seen, in the front-on models
type Joints = Record<Exclude<JointName, 'lEye' | 'rEye'>, [number, number]> & Partial<Record<'lEye' | 'rEye', [number, number]>>;

const EXTRA: Record<ExtraJoint, number> = { lHeel: 29, rHeel: 30, lToe: 31, rToe: 32, lEye: 2, rEye: 5 };

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
  lKnee: [610, 700], rKnee: [400, 720],
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
      lElbow: [660, 332], rElbow: [566, 500],
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
      nose: [606, 282],
      lShoulder: [578, 360], rShoulder: [528, 356],
      lElbow: [652, 350], rElbow: [560, 505],
      lWrist: [682, 450], rWrist: [672, 490],
      ...FRONT_FOOT_LEGS,
      lKnee: [608, 705], rKnee: [398, 722],
    },
    bat: [684, 438, 640, 772],
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
      nose: [558, 250],
      lShoulder: [540, 335], rShoulder: [492, 335],
      lElbow: [520, 300], rElbow: [470, 330],
      lWrist: [472, 222], rWrist: [458, 240],
      lHip: [512, 560], rHip: [478, 560],
      lKnee: [562, 720], rKnee: [470, 722],
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
      lElbow: [610, 420], rElbow: [540, 470],
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
      lElbow: [640, 570], rElbow: [585, 610],
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

/* ── Front-on models ───────────────────────────────────────────────────────────
   Seen looking straight down the pitch. The player faces the camera, so their right side is on
   the left of the picture. For batting the camera is at the bowler's end: a right-hander stands
   side-on to it, front shoulder nearest, with the off side on the left of the picture. */

const BOWLING_FRONT: Reference = {
  title: 'Textbook bowling action, front-on',
  moment: 'At release',
  joints: {
    nose: [548, 255], rEye: [536, 246], lEye: [560, 246],
    rShoulder: [485, 318], lShoulder: [575, 352],
    rElbow: [465, 202], lElbow: [585, 440],
    rWrist: [444, 87], lWrist: [560, 505],
    rHip: [445, 560], lHip: [495, 560],
    rKnee: [420, 700], lKnee: [486, 730],
    rAnkle: [400, 800], lAnkle: [478, 900],
    rHeel: [402, 790], lHeel: [470, 905], rToe: [395, 830], lToe: [490, 925],
  },
  checkpoints: [
    'Arm high at release, close to vertical and brushing past the ear.',
    'Head upright with the eyes level, looking at the target over the front shoulder.',
    'Only a moderate bend of the trunk away from the bowling arm. A large side bend is linked with lower back injury.',
    'Front foot lands under the hips and points down the pitch, in line with the target.',
    'Front arm pulls straight down, close to the body, not out to the side.',
    'Hips and shoulders finish facing the batter, with the follow-through going down the pitch.',
  ],
  sources: [SOURCES.portus, SOURCES.ranson],
};

// Shared for the front foot shots: the stride comes straight towards the camera
const FRONT_VIEW_BASE = {
  nose: [500, 255], rEye: [490, 246], lEye: [510, 246],
  lShoulder: [520, 345], rShoulder: [470, 340],
  lElbow: [545, 420], rElbow: [455, 430],
  lWrist: [500, 470], rWrist: [498, 505],
  lHip: [515, 560], rHip: [480, 560],
  lKnee: [505, 720], rKnee: [478, 715],
  lAnkle: [500, 895], rAnkle: [470, 860],
  lHeel: [496, 905], rHeel: [468, 868], lToe: [504, 928], rToe: [450, 880],
} satisfies Joints;

const BATTING_FRONT: Record<ShotType, Reference> = {
  drive: {
    title: 'Textbook front foot drive, front-on',
    moment: 'At contact',
    joints: FRONT_VIEW_BASE,
    bat: [499, 480, 497, 800],
    checkpoints: [
      'Eyes level and head over the front foot, in line with the ball.',
      'Bat comes down straight, showing its full face to the bowler.',
      'Front foot points towards the ball, with the stride straight down the pitch.',
      'Shoulders level, hips between the feet, no falling away to the off side.',
    ],
    sources: [SOURCES.taliep, SOURCES.stuelcken],
  },
  defence: {
    title: 'Textbook forward defence, front-on',
    moment: 'At contact',
    joints: { ...FRONT_VIEW_BASE, lWrist: [500, 480], rWrist: [498, 512] },
    bat: [499, 490, 497, 790],
    checkpoints: [
      'Eyes level and head directly over the ball.',
      'Bat straight up and down, tight to the front pad with no gap.',
      'Front foot to the pitch of the ball, toe pointing down the pitch.',
      'Still at contact: no sway of the hips or shoulders.',
    ],
    sources: [SOURCES.taliep],
  },
  leave: {
    title: 'Textbook leave, front-on',
    moment: 'As the ball passes',
    joints: {
      ...FRONT_VIEW_BASE,
      lElbow: [530, 300], rElbow: [450, 320],
      lWrist: [478, 228], rWrist: [468, 250],
      lAnkle: [512, 890], rAnkle: [478, 880], lKnee: [512, 722], rKnee: [480, 718],
      lHeel: [508, 900], rHeel: [474, 890], lToe: [518, 922], rToe: [462, 900],
    },
    bat: [473, 239, 440, 40],
    checkpoints: [
      'Eyes level, watching the ball all the way through to the keeper.',
      'Balanced, with the hips between the feet.',
      'Bat lifted high and inside the line of the ball.',
      'Know where your off stump is before you decide to leave.',
    ],
    sources: [],
  },
  pull: {
    title: 'Textbook pull shot, front-on',
    moment: 'At contact',
    joints: {
      ...FRONT_VIEW_BASE,
      lShoulder: [525, 335], rShoulder: [472, 347],
      lElbow: [575, 395], rElbow: [520, 420],
      lWrist: [600, 362], rWrist: [640, 370],
      lAnkle: [525, 890], rAnkle: [470, 890], lKnee: [528, 722], rKnee: [468, 720],
      lHeel: [520, 900], rHeel: [466, 900], lToe: [540, 922], rToe: [452, 912],
    },
    bat: [620, 366, 840, 330],
    checkpoints: [
      'Eyes level and head still, inside the line of the ball.',
      'Bat swings level across the body, with arms extended at contact.',
      'A stable base, hips between the feet, weight on the back leg.',
      'Shoulders turn through the shot.',
    ],
    sources: [],
  },
  cut: {
    title: 'Textbook cut shot, front-on',
    moment: 'At contact',
    joints: {
      ...FRONT_VIEW_BASE,
      lElbow: [470, 410], rElbow: [430, 425],
      lWrist: [395, 420], rWrist: [358, 428],
      lAnkle: [522, 890], rAnkle: [472, 890], lKnee: [524, 722], rKnee: [470, 720],
      lHeel: [518, 900], rHeel: [468, 900], lToe: [538, 922], rToe: [454, 912],
    },
    bat: [376, 424, 160, 440],
    checkpoints: [
      'Eyes level, head still, watching the ball onto the bat.',
      'Bat swings level, arms at full stretch, out on the off side.',
      'A stable base with the weight on the back foot.',
      'Shoulders stay level as the arms reach.',
    ],
    sources: [],
  },
  sweep: {
    title: 'Textbook sweep, front-on',
    moment: 'At contact',
    joints: {
      nose: [500, 420], rEye: [490, 411], lEye: [510, 411],
      lShoulder: [522, 505], rShoulder: [472, 500],
      lElbow: [575, 570], rElbow: [525, 590],
      lWrist: [600, 620], rWrist: [640, 628],
      lHip: [515, 690], rHip: [480, 690],
      lKnee: [505, 770], rKnee: [470, 860],
      lAnkle: [500, 895], rAnkle: [480, 880],
      lHeel: [496, 905], rHeel: [478, 890], lToe: [504, 928], rToe: [462, 900],
    },
    bat: [620, 624, 830, 700],
    checkpoints: [
      'Eyes level and head over the front knee, in line with the ball.',
      'Front pad in line with the ball as a second line of defence.',
      'Bat swings level across the front pad with arms extended.',
      'Low, stable base: front knee bent, back knee down.',
    ],
    sources: [],
  },
};

export function getReference(mode: Mode, shotType?: ShotType, view: View = 'side'): Reference {
  if (view === 'front') return mode === 'bowling' ? BOWLING_FRONT : BATTING_FRONT[shotType ?? 'drive'];
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
    // Mirroring swaps left and right, eyes included
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
