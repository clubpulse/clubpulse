"""
ClubPulse Ball Tracking Pipeline
---------------------------------
Detects and tracks a cricket ball through a video clip.

Outputs:
  - ball_positions: [{frame, x, y, confidence}]
  - trajectory:     smoothed (x, y) path via Kalman filter
  - bounce_frame:   frame index where bounce occurs
  - bounce_point:   (x, y) in pixel space
  - speed_kph:      estimated delivery speed
  - swing_px:       lateral movement in pixels (release → bounce)
  - pitch_map:      normalised (0–1) pitch coordinates for UI overlay

Usage (server-side, called by Next.js API route):
  python ball_tracker.py --video /tmp/upload.mp4 --fps 30 --pitch_length_m 20.12

Dependencies:
  pip install ultralytics opencv-python-headless numpy
"""

import argparse
import json
import math
import sys
import cv2
import numpy as np

# YOLO detector — imported lazily; fails gracefully if ultralytics absent
try:
    from yolo_detector import YOLODetector as _YOLODetector
    _yolo: "_YOLODetector | None" = _YOLODetector()
except Exception:
    _yolo = None

# HSV confidence below this threshold triggers YOLO fallback
HSV_CONF_THRESHOLD = 0.45

# ---------------------------------------------------------------------------
# Kalman Filter — constant-velocity model for 2-D ball tracking
# ---------------------------------------------------------------------------

def make_kalman() -> cv2.KalmanFilter:
    """2-D Kalman filter: state = [x, y, vx, vy], measurement = [x, y]."""
    kf = cv2.KalmanFilter(4, 2)

    # Transition matrix  (x' = x + vx, y' = y + vy)
    kf.transitionMatrix = np.array(
        [[1, 0, 1, 0],
         [0, 1, 0, 1],
         [0, 0, 1, 0],
         [0, 0, 0, 1]], dtype=np.float32
    )

    # Measurement matrix  (we observe x and y only)
    kf.measurementMatrix = np.array(
        [[1, 0, 0, 0],
         [0, 1, 0, 0]], dtype=np.float32
    )

    # Process noise — how much we trust the motion model
    kf.processNoiseCov = np.eye(4, dtype=np.float32) * 1e-2

    # Measurement noise — how much we trust detections
    kf.measurementNoiseCov = np.eye(2, dtype=np.float32) * 1e-1

    # Initial state covariance
    kf.errorCovPost = np.eye(4, dtype=np.float32)

    return kf


# ---------------------------------------------------------------------------
# Ball detection  (colour-based HSV blob + optional YOLO fallback)
# ---------------------------------------------------------------------------

# Red cricket ball HSV ranges (two hue segments — red wraps around 0°)
BALL_HSV_LOWER1 = np.array([0,   100, 80],  dtype=np.uint8)
BALL_HSV_UPPER1 = np.array([10,  255, 255], dtype=np.uint8)
BALL_HSV_LOWER2 = np.array([160, 100, 80],  dtype=np.uint8)
BALL_HSV_UPPER2 = np.array([180, 255, 255], dtype=np.uint8)

# White ball override (T20 / indoor)
BALL_HSV_WHITE_LOWER = np.array([0,   0,   200], dtype=np.uint8)
BALL_HSV_WHITE_UPPER = np.array([180, 30,  255], dtype=np.uint8)

BALL_RADIUS_MIN = 5   # px  — ignore tiny blobs
BALL_RADIUS_MAX = 40  # px  — ignore large blobs (stray circles)


def detect_ball_hsv(frame: np.ndarray, white_ball: bool = False):
    """Return (cx, cy, radius, confidence) or None."""
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

    if white_ball:
        mask = cv2.inRange(hsv, BALL_HSV_WHITE_LOWER, BALL_HSV_WHITE_UPPER)
    else:
        mask1 = cv2.inRange(hsv, BALL_HSV_LOWER1, BALL_HSV_UPPER1)
        mask2 = cv2.inRange(hsv, BALL_HSV_LOWER2, BALL_HSV_UPPER2)
        mask  = cv2.bitwise_or(mask1, mask2)

    # Morphological clean-up
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN,  kernel, iterations=2)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)

    # Hough circle detection on the cleaned mask
    circles = cv2.HoughCircles(
        mask,
        cv2.HOUGH_GRADIENT,
        dp=1.2,
        minDist=30,
        param1=50,
        param2=15,
        minRadius=BALL_RADIUS_MIN,
        maxRadius=BALL_RADIUS_MAX,
    )

    if circles is None:
        return None

    circles = np.uint16(np.around(circles[0]))

    # Pick the circle whose radius is closest to expected ball size
    best = min(circles, key=lambda c: abs(c[2] - 12))
    cx, cy, r = int(best[0]), int(best[1]), int(best[2])

    if not (BALL_RADIUS_MIN <= r <= BALL_RADIUS_MAX):
        return None

    # Confidence: fraction of circle area that is in the mask
    circle_mask = np.zeros(mask.shape, dtype=np.uint8)
    cv2.circle(circle_mask, (cx, cy), r, 255, -1)
    overlap = cv2.bitwise_and(mask, circle_mask)
    area    = math.pi * r * r
    conf    = float(np.count_nonzero(overlap)) / area if area > 0 else 0.0

    return cx, cy, r, min(conf, 1.0)


# ---------------------------------------------------------------------------
# Speed estimation
# ---------------------------------------------------------------------------

def estimate_speed(
    positions: list[dict],
    fps: float,
    pitch_length_m: float,
    frame_width: int,
) -> float | None:
    """
    Estimate ball speed in km/h.

    We find the longest consecutive run of detections near the release point
    and compute displacement per frame, then scale from pixels → metres using
    the known pitch length as reference.

    Returns None if not enough data.
    """
    if len(positions) < 3:
        return None

    # Pixels per metre — approximate using the full frame width ≈ pitch length
    # (works when camera is side-on; caller should calibrate for accuracy)
    px_per_m = frame_width / pitch_length_m

    # Take first 10 frames of detected positions for speed (pre-bounce)
    early = positions[:10]
    if len(early) < 2:
        return None

    total_px = 0.0
    for i in range(1, len(early)):
        dx = early[i]["x"] - early[i - 1]["x"]
        dy = early[i]["y"] - early[i - 1]["y"]
        total_px += math.hypot(dx, dy)

    frames_elapsed = len(early) - 1
    time_s = frames_elapsed / fps
    distance_m = total_px / px_per_m

    if time_s == 0:
        return None

    speed_ms  = distance_m / time_s
    speed_kph = speed_ms * 3.6
    return round(speed_kph, 1)


# ---------------------------------------------------------------------------
# Bounce detection — Y-velocity sign change
# ---------------------------------------------------------------------------

def detect_bounce(trajectory: list[tuple[float, float]]) -> int | None:
    """
    Return the frame index of the bounce (Y velocity reversal).

    Cricket ball falls toward the pitch (y increases in image space),
    then rises after impact (y decreases).
    """
    if len(trajectory) < 5:
        return None

    ys = [p[1] for p in trajectory]
    velocities = [ys[i + 1] - ys[i] for i in range(len(ys) - 1)]

    # Look for transition from positive → negative dy (descending → ascending)
    for i in range(2, len(velocities) - 1):
        window_before = velocities[max(0, i - 2): i]
        window_after  = velocities[i: i + 2]
        avg_before = sum(window_before) / len(window_before) if window_before else 0
        avg_after  = sum(window_after)  / len(window_after)  if window_after  else 0

        if avg_before > 1.5 and avg_after < -1.5:
            return i  # frame offset into trajectory list

    return None


# ---------------------------------------------------------------------------
# Swing measurement
# ---------------------------------------------------------------------------

def measure_swing(
    trajectory: list[tuple[float, float]],
    bounce_frame: int | None,
) -> float:
    """
    Lateral movement (pixels) from release to bounce.
    Positive = away swing / off-side, negative = in-swing / leg-side.
    Returns 0.0 if insufficient data.
    """
    if not trajectory or len(trajectory) < 3:
        return 0.0

    end = bounce_frame if bounce_frame and bounce_frame < len(trajectory) else len(trajectory) - 1
    dx  = trajectory[end][0] - trajectory[0][0]
    return round(dx, 1)


# ---------------------------------------------------------------------------
# Pitch map — normalise bounce point to 0–1 within pitch area
# ---------------------------------------------------------------------------

def normalise_pitch_coords(
    bounce_xy: tuple[float, float] | None,
    frame_w: int,
    frame_h: int,
) -> dict | None:
    """
    Return {"px": 0–1, "py": 0–1} representing position on a standard pitch map.
    px: 0 = leg stump, 1 = off stump (rough approximation)
    py: 0 = bowler end, 1 = batting crease
    """
    if bounce_xy is None:
        return None

    bx, by = bounce_xy
    return {
        "px": round(float(bx) / frame_w, 3),
        "py": round(float(by) / frame_h, 3),
    }


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def run_pipeline(
    video_path: str,
    fps_override: float | None = None,
    pitch_length_m: float = 20.12,
    white_ball: bool = False,
    max_frames: int = 600,        # safety cap (~10s @ 60fps)
) -> dict:
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {"error": f"Cannot open video: {video_path}"}

    fps        = fps_override or cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_w    = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_h    = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Attempt auto calibration from the first frame
    from calibration import calibrate_from_frame, calibrated_speed_kph
    ret0, first_frame = cap.read()
    calibration = calibrate_from_frame(first_frame, pitch_length_m=pitch_length_m) if ret0 else None
    if not ret0:
        return {"error": f"Cannot read first frame: {video_path}"}
    # Re-seek to start (first frame already consumed)
    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

    kf         = make_kalman()
    kalman_initialised = False

    raw_detections: list[dict]           = []   # confident HSV detections
    trajectory:     list[tuple[float, float]] = []  # Kalman-smoothed positions

    frame_idx = 0

    while frame_idx < max_frames:
        ret, frame = cap.read()
        if not ret:
            break

        detection = detect_ball_hsv(frame, white_ball=white_ball)

        # If HSV confidence is low (or nothing found), try YOLO
        if (detection is None or detection[3] < HSV_CONF_THRESHOLD) and _yolo and _yolo.available:
            yolo_det = _yolo.detect(frame)
            if yolo_det is not None:
                # Prefer YOLO when HSV was absent or weak
                if detection is None or yolo_det[3] > detection[3]:
                    detection = yolo_det

        if detection is not None:
            cx, cy, r, conf = detection

            measurement = np.array([[np.float32(cx)], [np.float32(cy)]])

            if not kalman_initialised:
                kf.statePre = np.array(
                    [[np.float32(cx)], [np.float32(cy)],
                     [np.float32(0)],  [np.float32(0)]]
                )
                kf.statePost = kf.statePre.copy()
                kalman_initialised = True

            kf.correct(measurement)
            raw_detections.append({
                "frame": frame_idx,
                "x": cx,
                "y": cy,
                "radius": r,
                "confidence": round(conf, 3),
            })

        # Always predict (fills gaps when ball is occluded)
        if kalman_initialised:
            predicted = kf.predict()
            px = float(predicted[0])
            py = float(predicted[1])
            trajectory.append((px, py))
        else:
            trajectory.append(None)  # type: ignore

        frame_idx += 1

    cap.release()

    # Strip leading Nones (before first detection)
    first_real = next((i for i, p in enumerate(trajectory) if p is not None), None)
    if first_real is None:
        return {
            "error": "No ball detected in video",
            "frames_processed": frame_idx,
        }

    trajectory     = [p for p in trajectory[first_real:] if p is not None]
    raw_detections = [d for d in raw_detections if d["frame"] >= first_real]

    # Bounce
    bounce_frame = detect_bounce(trajectory)
    bounce_point = trajectory[bounce_frame] if bounce_frame is not None else None

    # Speed — use calibrated px/m if available, otherwise rough heuristic
    if calibration and calibration.valid:
        speed_kph = calibrated_speed_kph(raw_detections, fps, calibration)
    else:
        speed_kph = estimate_speed(raw_detections, fps, pitch_length_m, frame_w)

    # Swing
    swing_px = measure_swing(trajectory, bounce_frame)

    # Pitch map
    pitch_coords = normalise_pitch_coords(bounce_point, frame_w, frame_h)

    return {
        "frames_processed": frame_idx,
        "fps": fps,
        "resolution": {"w": frame_w, "h": frame_h},
        "ball_positions": raw_detections,
        "trajectory": [
            {"x": round(p[0], 1), "y": round(p[1], 1)}
            for p in trajectory
        ],
        "bounce_frame": bounce_frame,
        "bounce_point": (
            {"x": round(bounce_point[0], 1), "y": round(bounce_point[1], 1)}
            if bounce_point else None
        ),
        "speed_kph": speed_kph,
        "swing_px": swing_px,
        "pitch_map": pitch_coords,
        "calibration": {
            "valid":      calibration.valid      if calibration else False,
            "px_per_m":   calibration.px_per_m   if calibration else None,
            "method":     calibration.method     if calibration else "none",
            "confidence": calibration.confidence if calibration else 0.0,
        } if calibration else None,
    }


# ---------------------------------------------------------------------------
# CLI entry point  (called by Next.js via child_process.spawn)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ClubPulse ball tracker")
    parser.add_argument("--video",         required=True,  help="Path to video file")
    parser.add_argument("--fps",           type=float,     help="Override FPS detection")
    parser.add_argument("--pitch_length_m",type=float, default=20.12)
    parser.add_argument("--white_ball",    action="store_true")
    parser.add_argument("--max_frames",    type=int,   default=600)
    args = parser.parse_args()

    result = run_pipeline(
        video_path=args.video,
        fps_override=args.fps,
        pitch_length_m=args.pitch_length_m,
        white_ball=args.white_ball,
        max_frames=args.max_frames,
    )

    print(json.dumps(result))
