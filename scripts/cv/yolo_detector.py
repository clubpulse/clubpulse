"""
ClubPulse YOLO Ball Detector
------------------------------
Wraps an Ultralytics YOLO model fine-tuned for cricket ball detection.

The model is loaded once and reused across frames (singleton pattern).
Falls back gracefully if the model file is missing — ball_tracker.py
then relies entirely on HSV detection.

Model source options (in order of preference):
  1. Custom fine-tuned weights at MODEL_PATH (best accuracy)
  2. YOLOv8n-trained on cricket ball dataset from Roboflow Universe
     (https://universe.roboflow.com — search "cricket ball")
  3. Generic sports ball class from YOLOv8 COCO model (class 32)

Usage:
  from yolo_detector import YOLODetector
  detector = YOLODetector()          # loads once
  result   = detector.detect(frame)  # returns (cx, cy, r, conf) or None
"""

from __future__ import annotations
import os
import logging
from pathlib import Path

import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Where to look for model weights (override via env var CP_BALL_MODEL)
# ---------------------------------------------------------------------------

_DEFAULT_MODEL_PATH = Path(__file__).parent / "models" / "cricket_ball_yolov8n.pt"
MODEL_PATH = Path(os.environ.get("CP_BALL_MODEL", str(_DEFAULT_MODEL_PATH)))

# COCO class index for "sports ball" — used as fallback with base YOLOv8
SPORTS_BALL_CLASS = 32

# Minimum confidence to accept a YOLO detection
MIN_CONF = 0.35


class YOLODetector:
    """Singleton-style YOLO wrapper. Instantiate once, call detect() per frame."""

    def __init__(self, model_path: Path = MODEL_PATH) -> None:
        self._model = None
        self._use_coco_fallback = False
        self._load(model_path)

    def _load(self, model_path: Path) -> None:
        try:
            from ultralytics import YOLO  # type: ignore
        except ImportError:
            logger.warning("ultralytics not installed — YOLO detector disabled")
            return

        if model_path.exists():
            logger.info(f"Loading custom YOLO model: {model_path}")
            self._model = YOLO(str(model_path))
        else:
            # Fall back to YOLOv8n base (COCO) and filter to sports ball class
            logger.warning(
                f"Custom model not found at {model_path}. "
                "Falling back to YOLOv8n COCO (sports ball class)."
            )
            try:
                self._model = YOLO("yolov8n.pt")
                self._use_coco_fallback = True
            except Exception as e:
                logger.error(f"YOLO load failed: {e}")
                self._model = None

    @property
    def available(self) -> bool:
        return self._model is not None

    def detect(self, frame: np.ndarray) -> tuple[int, int, int, float] | None:
        """
        Run YOLO on a single BGR frame.

        Returns (cx, cy, radius, confidence) or None if no ball found.
        Radius is approximated from the bounding-box diagonal.
        """
        if not self.available:
            return None

        classes = [SPORTS_BALL_CLASS] if self._use_coco_fallback else None

        try:
            results = self._model(
                frame,
                classes=classes,
                conf=MIN_CONF,
                verbose=False,
                imgsz=640,
            )
        except Exception as e:
            logger.error(f"YOLO inference error: {e}")
            return None

        boxes = results[0].boxes
        if boxes is None or len(boxes) == 0:
            return None

        # Pick highest-confidence detection
        confs  = boxes.conf.cpu().numpy()
        best_i = int(np.argmax(confs))
        conf   = float(confs[best_i])

        if conf < MIN_CONF:
            return None

        xyxy = boxes.xyxy[best_i].cpu().numpy()
        x1, y1, x2, y2 = xyxy

        cx = int((x1 + x2) / 2)
        cy = int((y1 + y2) / 2)

        # Approximate radius from shorter side of bounding box
        r = int(min(x2 - x1, y2 - y1) / 2)
        r = max(r, 5)   # floor at 5px

        return cx, cy, r, conf
