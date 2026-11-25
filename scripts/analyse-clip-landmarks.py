"""Read every frame's poses, with the real timestamps. Prints one JSON object.

Requires: pip install mediapipe opencv-python-headless
Arguments: video path, lite model path, optional heavy model path.

A person shorter than 256px is cropped and enlarged, then read again with the
heavy model when that file is present. World landmarks are included so a
foreshortened elbow can be measured in metres. Background shift is labelled
still, pan or zoom.
"""
import json
import sys

import cv2
import mediapipe as mp
import numpy as np

video = sys.argv[1]
model = sys.argv[2]
heavy_path = sys.argv[3] if len(sys.argv) > 3 else ''
cap = cv2.VideoCapture(video)
if not cap.isOpened():
    sys.stderr.write('Could not open the video.\n')
    sys.exit(1)
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 1
fps = cap.get(cv2.CAP_PROP_FPS) or 30


def landmarker(path, mode):
    options = mp.tasks.vision.PoseLandmarkerOptions(
        base_options=mp.tasks.BaseOptions(model_asset_path=path),
        running_mode=mode,
        num_poses=3,
    )
    return mp.tasks.vision.PoseLandmarker.create_from_options(options)


lite = landmarker(model, mp.tasks.vision.RunningMode.VIDEO)
heavy = None
try:
    if heavy_path:
        # IMAGE mode has no clock, so a second read of a small person cannot
        # reuse a timestamp the video tracker has already seen.
        heavy = landmarker(heavy_path, mp.tasks.vision.RunningMode.IMAGE)
except Exception:
    heavy = None


def pack(pose):
    return [
        {'x': point.x, 'y': point.y, 'z': point.z, 'visibility': point.visibility or 0}
        for point in pose
    ]


def person_box(pose, frame_w, frame_h):
    xs = [point.x for point in pose if (point.visibility or 0) >= 0.5]
    ys = [point.y for point in pose if (point.visibility or 0) >= 0.5]
    if len(xs) < 4:
        return None
    x0, x1 = min(xs) * frame_w, max(xs) * frame_w
    y0, y1 = min(ys) * frame_h, max(ys) * frame_h
    return x0, y0, max(1.0, x1 - x0), max(1.0, y1 - y0)


def map_back(pose, crop, frame_w, frame_h):
    x0, y0, crop_w, crop_h = crop
    return [
        {
            'x': (x0 + point.x * crop_w) / frame_w,
            'y': (y0 + point.y * crop_h) / frame_h,
            'z': point.z,
            'visibility': point.visibility or 0,
        }
        for point in pose
    ]


def enlarge(frame, box):
    frame_h, frame_w = frame.shape[:2]
    x, y, bw, bh = box
    pad = 0.35
    x0 = max(0, int(x - bw * pad))
    y0 = max(0, int(y - bh * pad))
    x1 = min(frame_w, int(x + bw * (1 + pad)))
    y1 = min(frame_h, int(y + bh * (1 + pad)))
    crop = frame[y0:y1, x0:x1]
    if crop.size == 0:
        return None
    scale = max(1.0, 256.0 / max(bh, 1.0))
    big = cv2.resize(crop, (max(1, int(crop.shape[1] * scale)), max(1, int(crop.shape[0] * scale))), interpolation=cv2.INTER_CUBIC)
    return big, (x0, y0, x1 - x0, y1 - y0)


def detect(marker, frame, timestamp, image_mode=False):
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    if image_mode:
        return marker.detect(image)
    return marker.detect_for_video(image, timestamp)


def border_shift(prev, curr):
    """Shift of the top background strip, in pixels of a small picture, and whether the sides move apart."""
    a = cv2.resize(cv2.cvtColor(prev, cv2.COLOR_BGR2GRAY), (80, 45)).astype(np.float32)
    b = cv2.resize(cv2.cvtColor(curr, cv2.COLOR_BGR2GRAY), (80, 45)).astype(np.float32)
    top_shift, _ = cv2.phaseCorrelate(a[:8, :], b[:8, :])
    left, _ = cv2.phaseCorrelate(a[:, :10], b[:, :10])
    right, _ = cv2.phaseCorrelate(a[:, -10:], b[:, -10:])
    # phaseCorrelate returns (x, y) of how curr moved relative to prev
    pan = float(top_shift[0])
    zoom = float(right[0] - left[0])
    return pan, zoom


frames = []
world = []
timestamps = []
pans = []
zooms = []
index = 0
previous = None
while True:
    ok, frame = cap.read()
    if not ok:
        break
    frame_h, frame_w = frame.shape[:2]
    if frame_h < 480:
        scale = 480.0 / frame_h
        frame = cv2.resize(frame, (int(frame_w * scale), 480), interpolation=cv2.INTER_CUBIC)
        frame_h, frame_w = frame.shape[:2]
    timestamp = int(round(index * 1000 / fps))
    if timestamps and timestamp <= int(round(timestamps[-1] * 1000)):
        timestamp = int(round(timestamps[-1] * 1000)) + 1
    result = detect(lite, frame, timestamp)
    people = []
    worlds = []
    worlds_in = list(result.pose_world_landmarks or [])
    for pose_index, pose in enumerate(result.pose_landmarks):
        box = person_box(pose, frame_w, frame_h)
        image_pose = pack(pose)
        world_pose = worlds_in[pose_index] if pose_index < len(worlds_in) else None
        world_out = pack(world_pose) if world_pose is not None else image_pose
        if box and box[3] < 256 and heavy is not None:
            enlarged = enlarge(frame, box)
            if enlarged is not None:
                big, crop = enlarged
                again = detect(heavy, big, timestamp, True)
                if again.pose_landmarks:
                    best_at = max(range(len(again.pose_landmarks)), key=lambda item: max(point.y for point in again.pose_landmarks[item]) - min(point.y for point in again.pose_landmarks[item]))
                    image_pose = map_back(again.pose_landmarks[best_at], crop, frame_w, frame_h)
                    if again.pose_world_landmarks and best_at < len(again.pose_world_landmarks):
                        world_out = pack(again.pose_world_landmarks[best_at])
        people.append(image_pose)
        worlds.append(world_out)
    # Landmarks were measured on a possibly upscaled frame. They are already normalised.
    if previous is not None:
        pan, zoom = border_shift(previous, frame)
        pans.append(pan)
        zooms.append(zoom)
    previous = frame
    frames.append(people)
    world.append(worlds)
    timestamps.append(timestamp / 1000)
    index += 1
cap.release()
lite.close()
if heavy is not None:
    heavy.close()

motion = 'still'
if pans:
    med_pan = float(np.median(np.abs(pans)))
    med_zoom = float(np.median(np.abs(zooms)))
    if med_zoom > 0.8:
        motion = 'zoom'
    elif med_pan > 0.6:
        motion = 'pan'

json.dump({
    'width': width,
    'height': height,
    'fps': fps,
    'timestamps': timestamps,
    'frames': frames,
    'world': world,
    'motion': motion,
}, sys.stdout)
