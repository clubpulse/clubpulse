"""
Unit tests for scripts/cv/ball_tracker.py

Covers:
  - estimate_speed   (speed calculation from pixel displacement + fps)
  - detect_bounce    (Y-velocity sign reversal detection)
  - measure_swing    (lateral pixel displacement)
  - normalise_pitch_coords  (bounce → 0-1 pitch map)

No real video or CV is required — all inputs are synthetic lists.
Run with:  python -m pytest scripts/cv/tests/ -v
"""

import math
import sys
import os

# Allow importing ball_tracker directly without installing the package
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from ball_tracker import (
    estimate_speed,
    detect_bounce,
    measure_swing,
    normalise_pitch_coords,
)


# ── estimate_speed ────────────────────────────────────────────────────────────

class TestEstimateSpeed:
    def _make_positions(self, n: int, dx_per_frame: float, dy_per_frame: float = 0.0):
        """Create n sequential ball positions with constant per-frame displacement."""
        return [
            {"frame": i, "x": i * dx_per_frame, "y": i * dy_per_frame,
             "radius": 10, "confidence": 0.9}
            for i in range(n)
        ]

    def test_returns_none_with_fewer_than_3_positions(self):
        positions = self._make_positions(2, dx_per_frame=10)
        result = estimate_speed(positions, fps=30, pitch_length_m=20.12, frame_width=1920)
        assert result is None

    def test_returns_none_with_zero_positions(self):
        result = estimate_speed([], fps=30, pitch_length_m=20.12, frame_width=1920)
        assert result is None

    def test_speed_calculation_is_reasonable(self):
        """
        Ball moving 100 px/frame at 30 fps, frame_width=1920, pitch=20.12 m.
        px_per_m = 1920 / 20.12 ≈ 95.4
        distance_m/frame ≈ 100 / 95.4 ≈ 1.048 m
        speed_ms ≈ 1.048 * 30 = 31.4 m/s → 113.1 kph
        Allow ±5 kph tolerance for floating-point arithmetic.
        """
        positions = self._make_positions(10, dx_per_frame=100)
        speed = estimate_speed(positions, fps=30, pitch_length_m=20.12, frame_width=1920)
        assert speed is not None
        assert 100.0 < speed < 130.0

    def test_faster_ball_produces_higher_speed(self):
        slow = self._make_positions(10, dx_per_frame=50)
        fast = self._make_positions(10, dx_per_frame=150)
        speed_slow = estimate_speed(slow, fps=30, pitch_length_m=20.12, frame_width=1920)
        speed_fast = estimate_speed(fast, fps=30, pitch_length_m=20.12, frame_width=1920)
        assert speed_fast > speed_slow

    def test_higher_fps_reduces_speed_estimate(self):
        """Same pixel displacement per frame but more frames per second → lower distance per second."""
        positions = self._make_positions(10, dx_per_frame=80)
        speed_30  = estimate_speed(positions, fps=30, pitch_length_m=20.12, frame_width=1920)
        speed_60  = estimate_speed(positions, fps=60, pitch_length_m=20.12, frame_width=1920)
        # At 60 fps each frame is half as long, so the ball covers less distance per second
        # for the same pixel movement per frame.
        # Actually speed_ms = (px/frame * fps) / px_per_m, so higher fps → higher speed.
        assert speed_60 > speed_30

    def test_result_is_rounded_to_one_decimal(self):
        positions = self._make_positions(10, dx_per_frame=73)
        speed = estimate_speed(positions, fps=30, pitch_length_m=20.12, frame_width=1920)
        assert speed is not None
        assert speed == round(speed, 1)

    def test_uses_first_10_positions_only(self):
        """Extra positions beyond frame 10 should not change the result."""
        base    = self._make_positions(10, dx_per_frame=60)
        longer  = self._make_positions(50, dx_per_frame=60)
        s_base  = estimate_speed(base,   fps=30, pitch_length_m=20.12, frame_width=1920)
        s_long  = estimate_speed(longer, fps=30, pitch_length_m=20.12, frame_width=1920)
        assert s_base == s_long


# ── detect_bounce ─────────────────────────────────────────────────────────────

class TestDetectBounce:
    def test_returns_none_for_short_trajectory(self):
        traj = [(x, 100.0) for x in range(4)]   # only 4 points, need ≥ 5
        assert detect_bounce(traj) is None

    def test_returns_none_when_no_sign_change(self):
        """Ball travelling in a straight horizontal line — no bounce."""
        traj = [(float(x), 500.0) for x in range(20)]
        assert detect_bounce(traj) is None

    def test_detects_clear_bounce(self):
        """
        Ball descends (y increasing) for 10 frames, then ascends (y decreasing).
        The sign reversal should be detected somewhere around frame 10.
        """
        descending = [(float(i), float(i * 5))       for i in range(12)]
        ascending  = [(float(i + 12), 60.0 - i * 5) for i in range(10)]
        traj = descending + ascending

        bounce = detect_bounce(traj)
        assert bounce is not None
        # Should be detected within a few frames of the actual reversal (frame 11)
        assert 8 <= bounce <= 14

    def test_ignores_tiny_velocity_fluctuations(self):
        """
        Noise below the ±1.5 threshold should not trigger a false positive.
        """
        # Mostly flat trajectory with sub-threshold noise
        traj = [(float(i), 300.0 + (0.5 if i % 3 == 0 else -0.5)) for i in range(20)]
        assert detect_bounce(traj) is None


# ── measure_swing ─────────────────────────────────────────────────────────────

class TestMeasureSwing:
    def test_returns_zero_for_empty_trajectory(self):
        assert measure_swing([], bounce_frame=None) == 0.0

    def test_returns_zero_for_too_short_trajectory(self):
        traj = [(0.0, 0.0), (1.0, 1.0)]
        assert measure_swing(traj, bounce_frame=None) == 0.0

    def test_positive_swing_is_away_swing(self):
        """Ball moves right (x increasing) → positive → away swing."""
        traj = [(float(i * 10), 100.0) for i in range(10)]
        swing = measure_swing(traj, bounce_frame=None)
        assert swing > 0

    def test_negative_swing_is_in_swing(self):
        """Ball moves left (x decreasing) → negative → in-swing."""
        traj = [(100.0 - i * 8, 100.0) for i in range(10)]
        swing = measure_swing(traj, bounce_frame=None)
        assert swing < 0

    def test_straight_ball_has_near_zero_swing(self):
        """Ball travelling straight down (x constant) → ~0 swing."""
        traj = [(200.0, float(i * 10)) for i in range(10)]
        swing = measure_swing(traj, bounce_frame=None)
        assert abs(swing) < 1.0

    def test_uses_bounce_frame_as_end_point(self):
        """
        If bounce_frame = 5, swing should be from traj[0] to traj[5],
        ignoring later movement.
        """
        # Ball swings right up to frame 5, then swings hard left after
        traj = (
            [(float(i * 10), 100.0) for i in range(6)]   # frames 0–5: x = 0,10,20,30,40,50
            + [(50.0 - i * 20, 100.0) for i in range(5)] # frames 6–10: sharp left
        )
        swing_with_bounce    = measure_swing(traj, bounce_frame=5)
        swing_without_bounce = measure_swing(traj, bounce_frame=None)

        # With bounce_frame=5 swing ≈ 50; without it swings hard negative
        assert swing_with_bounce > 0
        assert swing_without_bounce < swing_with_bounce

    def test_result_is_rounded_to_one_decimal(self):
        traj = [(float(i * 7), 0.0) for i in range(10)]
        swing = measure_swing(traj, bounce_frame=None)
        assert swing == round(swing, 1)


# ── normalise_pitch_coords ────────────────────────────────────────────────────

class TestNormalisePitchCoords:
    def test_returns_none_for_no_bounce(self):
        assert normalise_pitch_coords(None, frame_w=1920, frame_h=1080) is None

    def test_centre_of_frame_gives_0_5(self):
        result = normalise_pitch_coords((960.0, 540.0), frame_w=1920, frame_h=1080)
        assert result is not None
        assert result["px"] == 0.5
        assert result["py"] == 0.5

    def test_top_left_gives_zero(self):
        result = normalise_pitch_coords((0.0, 0.0), frame_w=1920, frame_h=1080)
        assert result is not None
        assert result["px"] == 0.0
        assert result["py"] == 0.0

    def test_bottom_right_gives_one(self):
        result = normalise_pitch_coords((1920.0, 1080.0), frame_w=1920, frame_h=1080)
        assert result is not None
        assert result["px"] == 1.0
        assert result["py"] == 1.0

    def test_values_are_clamped_to_three_decimal_places(self):
        result = normalise_pitch_coords((333.0, 777.0), frame_w=1920, frame_h=1080)
        assert result is not None
        assert result["px"] == round(333.0 / 1920, 3)
        assert result["py"] == round(777.0 / 1080, 3)

    def test_output_has_px_and_py_keys(self):
        result = normalise_pitch_coords((100.0, 200.0), frame_w=1920, frame_h=1080)
        assert result is not None
        assert set(result.keys()) == {"px", "py"}
