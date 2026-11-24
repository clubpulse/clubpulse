"""Read pose landmarks from a video. Prints one JSON object to stdout.

Requires: pip install mediapipe opencv-python-headless
The model file path is the first argument, the video path the second.
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
step = max(1, int(round(fps / 10)))

options = mp.tasks.vision.PoseLandmarkerOptions(
    base_options=mp.tasks.BaseOptions(model_asset_path=model),
    running_mode=mp.tasks.vision.RunningMode.VIDEO,
    num_poses=1,
)
landmarker = mp.tasks.vision.PoseLandmarker.create_from_options(options)
frames = []
index = 0
timestamp = 0
while True:
    ok, frame = cap.read()
    if not ok:
        break
    if index % step == 0:
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = landmarker.detect_for_video(image, timestamp)
        timestamp += int(1000 / 10)
        if result.pose_landmarks:
            frames.append([
                {'x': p.x, 'y': p.y, 'z': p.z, 'visibility': p.visibility}
                for p in result.pose_landmarks[0]
            ])
    index += 1
cap.release()
landmarker.close()
json.dump({'width': width, 'height': height, 'frames': frames}, sys.stdout)
