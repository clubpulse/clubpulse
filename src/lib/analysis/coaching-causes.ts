/**
 * Plain words for a score, and a likely cause for each amber or red reading.
 * A cause is only chosen from other readings that themselves passed confidence.
 * The wording says "may" on purpose: this is a likely cause, not a diagnosis.
 */
import { ON_TARGET, type MetricResult } from '@/lib/analysis/pose-metrics';

/** One line under the number. The example for 70 is "7/10: mostly there, one thing to fix". */
export function scoreMeaning(score: number): string {
  const tenths = Math.max(0, Math.min(10, Math.round(score / 10)));
  const read = tenths >= 9
    ? 'looking strong'
    : tenths >= 7
      ? 'mostly there, one thing to fix'
      : tenths >= 5
        ? 'getting there, a few things to fix'
        : 'a start. Pick one thing and try again';
  return `${tenths}/10: ${read}. Compare with your own past scores, not others`;
}

export type CoachingChain = {
  key: string;
  problem: string;
  likelyCause: string;
  fix: string;
};

type CausePick = {
  likelyCause: string;
  fix: string;
  /** Other clear readings that point at this cause. Absent means the fallback. */
  when?: (valueOf: (key: string) => number | null) => boolean;
};

type CauseRule = {
  problem: (value: number) => string;
  picks: CausePick[];
  fallback: { likelyCause: string; fix: string };
};

const RULES: Record<string, CauseRule> = {
  frontKnee: {
    problem: (value) => value < 130 ? 'Front knee is folding at release' : 'Front knee is not in the braced range',
    picks: [
      {
        when: (valueOf) => (valueOf('frontFootLine') ?? 0) > 0.3,
        likelyCause: 'The front foot may be landing across, or a long way from the body',
        fix: 'Land the front foot under your hips, a little closer, and brace the knee as you let go',
      },
      {
        when: (valueOf) => (valueOf('trunkTilt') ?? 0) > 30,
        likelyCause: 'The stride may be long, so the knee gives way as you land',
        fix: 'Shorten the stride a touch and land with a firm front knee',
      },
    ],
    fallback: {
      likelyCause: 'The front leg may be soft as you land',
      fix: 'Practise landing on a firm front leg, as if stepping onto a stair and stopping',
    },
  },
  armStraightness: {
    problem: () => 'Bowling arm is bending',
    picks: [
      {
        when: (valueOf) => (valueOf('armUpright') ?? 0) > 25 || (valueOf('trunkTilt') ?? 0) > 30 || (valueOf('sideBend') ?? 0) > 30,
        likelyCause: 'The shoulders may be tipping early, which makes the arm look bent',
        fix: 'Stay tall, let the arm come past your ear, then let the ball go',
      },
    ],
    fallback: {
      likelyCause: 'The elbow may be bending on the way through',
      fix: 'Bowl with a long arm, like a straight stick, from the top to the let-go',
    },
  },
  armHeight: {
    problem: () => 'Bowling arm is dropping',
    picks: [
      {
        when: (valueOf) => (valueOf('sideBend') ?? 0) > 30,
        likelyCause: 'A sideways lean may be pulling the arm down',
        fix: 'Stay tall and let the arm brush your ear before you let go',
      },
    ],
    fallback: {
      likelyCause: 'The arm may be dropping before you let go',
      fix: 'Reach up high and let the ball go near the top',
    },
  },
  headOverKnee: {
    problem: () => 'Head is off the front knee at contact',
    picks: [
      {
        when: (valueOf) => (valueOf('shoulderLevel') ?? 0) > 15,
        likelyCause: 'The shoulders may be tilting and taking the head with them',
        fix: 'Keep the shoulders quieter and the head over the front knee',
      },
      {
        when: (valueOf) => {
          const knee = valueOf('kneeFlex');
          return knee != null && knee < 130;
        },
        likelyCause: 'The front knee may be folding, so the head falls off the ball',
        fix: 'Stay taller on the front leg and keep the head still over it',
      },
    ],
    fallback: {
      likelyCause: 'The head may be falling away from the ball',
      fix: 'Watch the ball all the way, with your head over the front knee',
    },
  },
  headOverFront: {
    problem: () => 'Head is not over the front foot',
    picks: [
      {
        when: (valueOf) => (valueOf('shoulderLevel') ?? 0) > 15,
        likelyCause: 'The shoulders may be tilting and taking the head away',
        fix: 'Keep the shoulders level and the head over the front foot',
      },
    ],
    fallback: {
      likelyCause: 'The head may be falling away to the side',
      fix: 'Watch the ball with your head over the front foot',
    },
  },
  headStability: {
    problem: () => 'Head is moving',
    picks: [
      {
        when: (valueOf) => (valueOf('trunkTilt') ?? 0) > 30 || (valueOf('sideBend') ?? 0) > 35,
        likelyCause: 'The body may be falling, which shakes the head',
        fix: 'Stay balanced over your feet and keep your eyes level',
      },
    ],
    fallback: {
      likelyCause: 'The head may be moving as you play the ball',
      fix: 'Pick a spot on the ball and keep your head still until you have finished',
    },
  },
  kneeFlex: {
    problem: () => 'Knees are not in a ready bend',
    picks: [
      {
        when: (valueOf) => (valueOf('headOverKnee') ?? 0) > 0.3,
        likelyCause: 'The head may be falling, which pulls the knees with it',
        fix: 'Set the head over the front knee first, then let the knees stay softly bent',
      },
    ],
    fallback: {
      likelyCause: 'The knees may be too stiff or too deep',
      fix: 'Stand ready with a small bend, so you can move either way',
    },
  },
  batSwingPlane: {
    problem: () => 'Bat is swinging across',
    picks: [
      {
        when: (valueOf) => (valueOf('shoulderLevel') ?? 0) > 15,
        likelyCause: 'The shoulders may be tilting the bat across the ball',
        fix: 'Keep the shoulders level and bring the bat down straight',
      },
    ],
    fallback: {
      likelyCause: 'The bat may be coming across the ball',
      fix: 'Play the ball with the bat close to straight up and down',
    },
  },
};

function passed(metric: MetricResult): boolean {
  return metric.confidence !== 'low' && !metric.excused;
}

/** Amber and red readings only, and only where the number itself was clear. */
export function coachingChains(metrics: MetricResult[]): CoachingChain[] {
  const valueOf = (key: string): number | null => {
    const found = metrics.find((metric) => metric.key === key);
    if (!found || !passed(found)) return null;
    return found.value;
  };
  const chains: CoachingChain[] = [];
  for (const metric of metrics) {
    if (!passed(metric) || metric.score >= ON_TARGET) continue;
    const rule = RULES[metric.key];
    if (!rule) {
      chains.push({
        key: metric.key,
        problem: `${metric.label} needs a look`,
        likelyCause: 'We can see it is off, but not yet why',
        fix: metric.tip,
      });
      continue;
    }
    const pick = rule.picks.find((item) => item.when?.(valueOf)) ?? rule.fallback;
    chains.push({
      key: metric.key,
      problem: rule.problem(metric.value),
      likelyCause: pick.likelyCause,
      fix: pick.fix,
    });
  }
  return chains.sort((a, b) => {
    const left = metrics.find((metric) => metric.key === a.key)?.score ?? 0;
    const right = metrics.find((metric) => metric.key === b.key)?.score ?? 0;
    return left - right;
  });
}

/** The single fix for the first screen: the weakest clear amber or red reading. */
export function topFix(metrics: MetricResult[]): CoachingChain | null {
  return coachingChains(metrics)[0] ?? null;
}
