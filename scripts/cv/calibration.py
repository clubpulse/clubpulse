"""
ClubPulse Camera Calibration
------------------------------
Converts pixel measurements to real-world distances so speed estimates
are accurate regardless of where the phone is placed.

Two calibration modes:
  1. KNOWN_OBJECT — user marks two points of known real-world distance
     (e.g. crease-to-crease = 17.68 m, or stumps width = 0.228 m)
  2. AUTO_PITCH — detects the pitch boundary lines automatically using
     Hough line transform and fits px/m from the known pitch length

The result is a CalibrationResult that ball_tracker.py uses to replace
the rough frame_width / pitch_length assumption.

Usage:
  from calibration import calibrate_from_frame, CalibrationResult

  cal = calibrate_from_frame(frame, mode="auto_pitch", pitch_length_m=20.12)
  if cal.valid:
      speed = distance_px / cal.px_per_m / time_s * 3.6   # km/h
"""

from __future__ import annotations
import math
from dataclasses import dataclass, field

import cv2
import numpy as np


@dataclass
class CalibrationResult:
    valid:       bool  = False
    px_per_m:    float = 0.0
    method:      str   = "none"
    confidence:  float = 0.0
    notes:       list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Mode 1: Known-object calibration (two pixel points + real distance)
# ---------------------------------------------------------------------------

def calibrate_from_points(
    pt1: tuple[float, float],
    pt2: tuple[float, float],
    real_distance_m: float,
) -> CalibrationResult:
    """
    Given two pixel coordinates (user-supplied or auto-detected) and their
    known real-world separation, compute px_per_m.

    Example call (front-end sends crease positions):
        calibrate_from_points((120, 480), (950, 490), real_distance_m=17.68)
    """
    if real_distance_m <= 0:
        return CalibrationResult(notes=["real_distance_m must be > 0"])

    pixel_dist = math.hypot(pt2[0] - pt1[0], pt2[1] - pt1[1])
    if pixel_dist < 10:
        return CalibrationResult(notes=["Points too close together in pixel space"])

    px_per_m = pixel_dist / real_distance_m
    return CalibrationResult(
        valid=True,
        px_per_m=round(px_per_m, 4),
        method="known_object",
        confidence=1.0,
        notes=[f"{pixel_dist:.1f}px = {real_distance_m}m → {px_per_m:.2f} px/m"],
    )


# ---------------------------------------------------------------------------
# Mode 2: Auto-pitch calibration via Hough line detection
# ---------------------------------------------------------------------------

def calibrate_from_frame(
    frame: np.ndarray,
    pitch_length_m: float = 20.12,
    mode: str = "auto_pitch",
) -> CalibrationResult:
    """
    Attempt to find the pitch in the frame and derive px_per_m.

    Works best when:
      - The camera is side-on or slightly elevated
      - The pitch surface is visible (white crease lines detectable)
      - Lighting is reasonable

    Returns CalibrationResult (check .valid before using).
    """
    if mode == "auto_pitch":
        return _auto_pitch(frame, pitch_length_m)
    return CalibrationResult(notes=[f"Unknown mode: {mode}"])


def _auto_pitch(frame: np.ndarray, pitch_length_m: float) -> CalibrationResult:
    """
    Detect the bowling and batting crease lines using Hough transform,
    then measure their pixel separation to derive px_per_m.
    """
    h, w = frame.shape[:2]
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # Look for white crease lines: threshold → Canny → Hough
    _, white_mask = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)
    edges = cv2.Canny(white_mask, 50, 150, apertureSize=3)

    lines = cv2.HoughLinesP(
        edges,
        rho=1,
        theta=np.pi / 180,
        threshold=80,
        minLineLength=w * 0.2,   # crease must span at least 20% of frame width
        maxLineGap=20,
    )

    if lines is None or len(lines) < 2:
        return CalibrationResult(
            notes=["Not enough lines found — try known_object mode"],
            method="auto_pitch",
        )

    # Filter to near-horizontal lines (crease lines)
    horizontal = []
    for line in lines:
        x1, y1, x2, y2 = line[0]
        angle = abs(math.degrees(math.atan2(y2 - y1, x2 - x1)))
        if angle < 15 or angle > 165:   # within 15° of horizontal
            mid_y = (y1 + y2) / 2
            horizontal.append(mid_y)

    if len(horizontal) < 2:
        return CalibrationResult(
            notes=["Could not isolate two horizontal crease lines"],
            method="auto_pitch",
        )

    # Take the two most separated horizontal lines as the crease pair
    horizontal.sort()
    crease_y1 = horizontal[0]
    crease_y2 = horizontal[-1]
    pixel_sep = abs(crease_y2 - crease_y1)

    if pixel_sep < 20:
        return CalibrationResult(
            notes=["Crease lines too close — camera may be too far from pitch"],
            method="auto_pitch",
        )

    # The popping crease to popping crease distance is 17.68 m
    # (bowling crease to bowling crease is 20.12 m — use caller's value)
    px_per_m = pixel_sep / pitch_length_m
    confidence = min(1.0, pixel_sep / (h * 0.3))  # higher if lines span 30%+ of frame

    return CalibrationResult(
        valid=True,
        px_per_m=round(px_per_m, 4),
        method="auto_pitch",
        confidence=round(confidence, 3),
        notes=[
            f"Crease Y positions: {crease_y1:.0f}px, {crease_y2:.0f}px",
            f"Separation: {pixel_sep:.1f}px over {pitch_length_m}m",
            f"→ {px_per_m:.2f} px/m",
        ],
    )


# ---------------------------------------------------------------------------
# Apply calibration to speed estimate in ball_tracker
# ---------------------------------------------------------------------------

def calibrated_speed_kph(
    positions: list[dict],
    fps: float,
    cal: CalibrationResult,
) -> float | None:
    """
    Re-computes speed using a CalibrationResult rather than the rough
    frame_width heuristic in ball_tracker.py.
    """
    if not cal.valid or cal.px_per_m <= 0:
        return None
    if len(positions) < 2:
        return None

    early = positions[:10]
    total_px = 0.0
    for i in range(1, len(early)):
        dx = early[i]["x"] - early[i - 1]["x"]
        dy = early[i]["y"] - early[i - 1]["y"]
        total_px += math.hypot(dx, dy)

    time_s = (len(early) - 1) / fps
    if time_s <= 0:
        return None

    speed_ms  = (total_px / cal.px_per_m) / time_s
    return round(speed_ms * 3.6, 1)
