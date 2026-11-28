import { ringCue, ringFill, RING_CUE, WARMUP_NOTE } from '@/lib/camera-drills/ring';
import { balanceHoldSeconds, countJumps, countSquats, shoulderRange } from '@/lib/camera-drills/reps';
import { jointAngle, type PosePoint } from '@/lib/camera-drills/pose';
import { baselineTests, pickDailyDrill, streakDays, streakLine } from '@/lib/camera-drills/plan';
import { cameraDrillsEnabled } from '@/lib/camera-drills/flag';

describe('movement ring', () => {
  it('fills only when the movement is both finished and well formed', () => {
    expect(ringFill(8, 8, 1)).toBe(1);
    expect(ringFill(8, 8, 0.5)).toBe(0.5);
    expect(ringFill(4, 8, 1)).toBe(0.5);
    expect(ringFill(8, 8, 0)).toBe(0);
    expect(ringCue(0.4, 0.2)).toBe(RING_CUE);
    expect(ringCue(1, 1)).toBe('Nice work');
    expect(WARMUP_NOTE).toMatch(/Stop if you feel pain/);
  });
});

describe('rep counting', () => {
  it('counts a squat only after depth and a return to standing', () => {
    const shallow = countSquats([170, 150, 140, 130, 150, 170]);
    expect(shallow.reps).toBe(0);
    expect(shallow.form).toBeLessThan(1);
    const deep = countSquats([170, 140, 100, 95, 130, 170, 140, 100, 170]);
    expect(deep.reps).toBe(2);
    expect(deep.form).toBe(1);
  });

  it('times a balance hold and a jump flight from the samples', () => {
    expect(balanceHoldSeconds([
      { freeY: 0.8, standY: 0.8, t: 0 },
      { freeY: 0.5, standY: 0.8, t: 1 },
      { freeY: 0.5, standY: 0.8, t: 4 },
      { freeY: 0.8, standY: 0.8, t: 5 },
    ])).toBe(4);
    const jumps = countJumps([
      { ankleY: 0.9, t: 0 },
      { ankleY: 0.7, t: 0.1 },
      { ankleY: 0.7, t: 0.4 },
      { ankleY: 0.9, t: 0.5 },
    ], 0.9);
    expect(jumps.reps).toBe(1);
    expect(jumps.flight).toBeGreaterThan(0);
  });

  it('reads a straight knee as 180 degrees', () => {
    const hip: PosePoint = { x: 0, y: 0 };
    const knee: PosePoint = { x: 0, y: 1 };
    const ankle: PosePoint = { x: 0, y: 2 };
    expect(jointAngle(hip, knee, ankle)).toBeCloseTo(180, 0);
    const body = (wristY: number): PosePoint[] => {
      const points = Array.from({ length: 33 }, () => ({ x: 0, y: 0 }));
      points[11] = { x: 0, y: 0 };
      points[23] = { x: 0, y: 1 };
      points[15] = { x: 0, y: wristY };
      points[12] = { x: 1, y: 0 };
      points[24] = { x: 1, y: 1 };
      points[16] = { x: 1, y: wristY };
      return points;
    };
    expect(shoulderRange([body(1), body(-1)]).range).toBeGreaterThan(90);
  });
});

describe('daily plan', () => {
  it('stays off unless the flag is exactly true, and keeps the jump off for under-18s', () => {
    expect(cameraDrillsEnabled({})).toBe(false);
    expect(cameraDrillsEnabled({ NEXT_PUBLIC_CAMERA_DRILLS_ENABLED: 'true' })).toBe(true);
    expect(baselineTests(true).map((drill) => drill.key)).toEqual(['squat', 'balance', 'shoulder', 'reach']);
    expect(baselineTests(false).map((drill) => drill.key)).toContain('jump');
    expect(baselineTests(true).some((drill) => drill.adultOnly)).toBe(false);
  });

  it('picks a bowler toward the shoulder and does not shame a missed day', () => {
    const drill = pickDailyDrill({ role: 'bowler', scores: { squat: 90, balance: 90, shoulder: 40, reach: 90 }, junior: true, day: '2026-11-26' });
    expect(drill.key).toBe('shoulder');
    expect(streakDays(['2026-11-24', '2026-11-25'], '2026-11-26')).toBe(2);
    expect(streakLine(0, true)).not.toMatch(/lost|shame|streak/i);
    expect(streakLine(0, true)).toMatch(/whenever you like/);
  });
});
