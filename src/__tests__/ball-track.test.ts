import { createKalman, createTracker, detectBounce, estimateSpeed, findCandidates, isBallColour, measureSwing } from '@/lib/analysis/ball-track';

const W = 480;
const H = 270;

// A green field with optional discs drawn on it
function frame(discs: { x: number; y: number; r: number; colour: [number, number, number] }[]) {
  const rgba = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) rgba.set([40, 120, 50, 255], i * 4);
  for (const disc of discs) {
    for (let y = Math.max(0, Math.floor(disc.y - disc.r)); y <= Math.min(H - 1, Math.ceil(disc.y + disc.r)); y++) {
      for (let x = Math.max(0, Math.floor(disc.x - disc.r)); x <= Math.min(W - 1, Math.ceil(disc.x + disc.r)); x++) {
        if (Math.hypot(x - disc.x, y - disc.y) <= disc.r) rgba.set([...disc.colour, 255], (y * W + x) * 4);
      }
    }
  }
  return rgba;
}

const RED: [number, number, number] = [200, 20, 30];
const WHITE: [number, number, number] = [250, 250, 250];

// A delivery from left to right that falls, bounces at frame 20 and rises
function ballAt(i: number) {
  const x = 30 + i * 10;
  const y = i <= 20 ? 60 + i * 8 : 220 - (i - 20) * 6;
  return { x, y };
}

describe('isBallColour', () => {
  it('knows red from grass, skin and white', () => {
    expect(isBallColour(200, 20, 30, false)).toBe(true);
    expect(isBallColour(40, 120, 50, false)).toBe(false);
    expect(isBallColour(250, 250, 250, false)).toBe(false);
    expect(isBallColour(224, 172, 140, false)).toBe(false);
    expect(isBallColour(250, 250, 250, true)).toBe(true);
    expect(isBallColour(200, 20, 30, true)).toBe(false);
  });
});

describe('findCandidates', () => {
  const options = { whiteBall: false, minRadius: 2, maxRadius: 20 };

  it('finds a moving ball and ignores a still one', () => {
    const still = { x: 400, y: 40, r: 6, colour: RED };
    const first = new Uint8Array(W * H);
    expect(findCandidates(frame([still, { x: 100, y: 100, r: 6, colour: RED }]), W, H, null, first, options)).toEqual([]);
    const second = new Uint8Array(W * H);
    const found = findCandidates(frame([still, { x: 120, y: 110, r: 6, colour: RED }]), W, H, first, second, options);
    expect(found).toHaveLength(1);
    expect(found[0].x).toBeCloseTo(120, 0);
    expect(found[0].y).toBeCloseTo(110, 0);
  });

  it('ignores things that are too big or too thin', () => {
    const first = new Uint8Array(W * H);
    findCandidates(frame([]), W, H, null, first, options);
    const shirt = frame([{ x: 200, y: 130, r: 45, colour: RED }]);
    expect(findCandidates(shirt, W, H, first, new Uint8Array(W * H), options)).toEqual([]);
    const line = frame([]);
    for (let x = 100; x < 140; x++) line.set([200, 20, 30, 255], (50 * W + x) * 4);
    expect(findCandidates(line, W, H, first, new Uint8Array(W * H), options)).toEqual([]);
  });
});

describe('measurements', () => {
  it('finds the bounce where falling turns to rising', () => {
    const path = Array.from({ length: 30 }, (_, i) => ballAt(i));
    expect(detectBounce(path)).toBe(20);
    expect(detectBounce(path.slice(0, 15))).toBeNull();
    expect(detectBounce([])).toBeNull();
  });

  it('measures swing to the bounce', () => {
    const path = Array.from({ length: 30 }, (_, i) => ballAt(i));
    expect(measureSwing(path, 20)).toBe(200);
    expect(measureSwing(path.slice(0, 2), null)).toBe(0);
  });

  it('turns pixels per frame into km/h', () => {
    // 20 px a frame across a 1000 px frame that is 20 m wide = 0.4 m a frame = 12 m/s at 30 fps
    const positions = Array.from({ length: 10 }, (_, i) => ({ frame: i, x: i * 20, y: 100, radius: 6, confidence: 1 }));
    expect(estimateSpeed(positions, 30, 20, 1000)).toBe(43.2);
    // The same ball seen only every other frame is no faster
    const gappy = positions.filter((p) => p.frame % 2 === 0).concat({ frame: 10, x: 200, y: 100, radius: 6, confidence: 1 });
    expect(estimateSpeed(gappy, 30, 20, 1000)).toBe(43.2);
    expect(estimateSpeed(positions.slice(0, 2), 30, 20, 1000)).toBeNull();
  });

  it('smooths a straight path', () => {
    const kalman = createKalman(0, 0);
    let last = { x: 0, y: 0 };
    for (let i = 0; i <= 20; i++) {
      kalman.correct(i * 10, i * 5);
      last = kalman.predict();
    }
    expect(last.x).toBeGreaterThan(195);
    expect(last.x).toBeLessThan(215);
    expect(last.y).toBeGreaterThan(97);
    expect(last.y).toBeLessThan(108);
  });
});

describe('createTracker', () => {
  function run(colour: [number, number, number], whiteBall: boolean, hideFrames: number[] = []) {
    // Frames are half the size of the "video", to check positions are scaled back up
    const tracker = createTracker({ videoWidth: W * 2, videoHeight: H * 2, whiteBall });
    const distraction = { x: 440, y: 30, r: 7, colour };
    for (let i = 0; i < 36; i++) {
      const ball = ballAt(i);
      tracker.push(frame(hideFrames.includes(i) ? [distraction] : [distraction, { ...ball, r: 5, colour }]), W, H);
    }
    return tracker.finish();
  }

  it('follows a red ball, finds the bounce and reports full-size positions', () => {
    const result = run(RED, false);
    expect(result.frames_processed).toBe(36);
    expect(result.resolution).toEqual({ w: W * 2, h: H * 2 });
    expect(result.ball_positions.length).toBeGreaterThanOrEqual(33);
    // Every sighting is the moving ball, never the still one
    for (const p of result.ball_positions) {
      const truth = ballAt(p.frame);
      expect(Math.abs(p.x - truth.x * 2)).toBeLessThanOrEqual(3);
      expect(Math.abs(p.y - truth.y * 2)).toBeLessThanOrEqual(3);
    }
    expect(result.bounce_frame).not.toBeNull();
    // The ball is lowest at frame 20
    expect(Math.abs((result.bounce_frame as number) - 20)).toBeLessThanOrEqual(1);
    expect(result.bounce_point!.y).toBeGreaterThan(380);
    expect(result.pitch_map!.py).toBeGreaterThan(0.7);
    expect(result.swing_px).toBeGreaterThan(300);
    expect(result.speed_kph).toBeGreaterThan(0);
  });

  it('follows a white ball when told to', () => {
    expect(run(WHITE, true).ball_positions.length).toBeGreaterThanOrEqual(33);
  });

  it('keeps the path going while the ball is hidden', () => {
    const result = run(RED, false, [8, 9, 10]);
    expect(result.ball_positions.some((p) => [8, 9, 10].includes(p.frame))).toBe(false);
    expect(result.ball_positions.some((p) => p.frame === 12)).toBe(true);
    expect(result.trajectory.length).toBe(35);
  });

  it('says so when there is no ball', () => {
    const tracker = createTracker({ videoWidth: W, videoHeight: H, whiteBall: false });
    for (let i = 0; i < 5; i++) tracker.push(frame([{ x: 100, y: 100, r: 6, colour: RED }]), W, H);
    expect(() => tracker.finish()).toThrow('No ball detected');
  });
});
