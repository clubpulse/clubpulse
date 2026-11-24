"""Read every frame's poses, with the real timestamps. Prints one JSON object.

Requires: pip install mediapipe opencv-python-headless
Arguments: video path, model path.
"""
import json
import sys

import cv2
import mediapipe as mp

video = sys.argv[1]
model = sys.argv[2]
cap = cv2.VideoCapture(video)
if not cap.isOpened():
    sys.stderr.write('Could not open the video.\n')
    sys.exit(1)
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 1
fps = cap.get(cv2.CAP_PROP_FPS) or 30

options = mp.tasks.vision.PoseLandmarkerOptions(
    base_options=mp.tasks.BaseOptions(model_asset_path=model),
    running_mode=mp.tasks.vision.RunningMode.VIDEO,
    num_poses=3,
)
landmarker = mp.tasks.vision.PoseLandmarker.create_from_options(options)
frames = []
timestamps = []
index = 0
while True:
    ok, frame = cap.read()
    if not ok:
        break
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    timestamp = int(round(index * 1000 / fps))
    # detect_for_video requires a strictly increasing timestamp
    if timestamps and timestamp <= timestamps[-1]:
        timestamp = timestamps[-1] + 1
    result = landmarker.detect_for_video(image, timestamp)
    people = []
    for pose in result.pose_landmarks:
        people.append([
            {'x': point.x, 'y': point.y, 'z': point.z, 'visibility': point.visibility or 0}
            for point in pose
        ])
    frames.append(people)
    timestamps.append(timestamp / 1000)
    index += 1
cap.release()
landmarker.close()
json.dump({'width': width, 'height': height, 'fps': fps, 'timestamps': timestamps, 'frames': frames}, sys.stdout)
