# 3D technique view

The view stays off unless `NEXT_PUBLIC_3D_TECHNIQUE_ENABLED` is exactly `true`. With the flag off, Analyse does not show the 3D panel and `/api/analysis/technique-pose` answers 404.

It has two parts:

- The player's own clip. MediaPipe Pose Landmarker (`pose_landmarker_full`) runs in the browser. World landmarks for each sampled frame are stored for that account only.
- Reference actions drawn by SHIFTUP: a fast bowling action, an in-swinging yorker, a front-foot drive and a back-foot defence. The JSON keyframes in `src/lib/technique3d/references/` come from joint angles in `author.ts`. They are not traced from anyone's footage. Do not replace them with the private YouTube clips or any other recording of a player.

The player can rotate the skeleton, play it, slow it to half or quarter speed, and scrub. The skeleton stays on the same moment as the clip, and the scrubber moves the video frame with it. The camera frames the drawn figure, including the head and the limb thickness, for the moment on the scrubber. That flat box sits in the middle. On a phone the margin is 4% of the shorter side, and a wide pose uses about 90% of the width. On a wider screen the same framing as before is kept. The zoom eases when a wide pose needs a smaller scale, and it never comes close enough to clip. On a phone the canvas is the full width of the card and about 60% of the screen tall, and the clip sits under it in a strip that follows the video's shape, capped at 9rem. On a wider screen the clip stays in the side column. Sampling covers the whole clip. Each frame stands with its lowest foot on the ground grid. The picture's own pose is kept, so a forward lean stays leaned and a left-handed or front-on clip is not mirrored away from the video. A joint is repaired only when its length collapses. The figure is drawn with solid limbs, joints, a head and a ground grid. Side by side and overlay line the reference up with the player on back-foot contact, release, or bat-ball contact. Phase names come from the reference.

Angles shown for the player's skeleton are the front elbow, the front knee and the shoulder-hip separation. The screen says: "Estimate from one phone video, not a lab measurement." These are not lab numbers and they are not an injury assessment.

## Who can see a saved estimate

`technique_pose_frames` is readable, insertable and deletable only by the account that owns the row. A coach, a club admin and every other member get nothing, including when the owner is a junior. The date of birth is not stored in this table.

## Preview

1. Leave the migration unapplied on production. For a local database, apply `supabase/migrations/20261129000001_technique_pose_frames.sql` yourself.
2. Set `NEXT_PUBLIC_3D_TECHNIQUE_ENABLED=true` and restart the app. The flag is read when the app is built.
3. Sign in, open Analyse, and choose a bowling or batting clip you filmed yourself.
4. After the usual analysis, use "Build 3D estimate". The first run downloads the pose model in the browser.
5. Saving needs the migration. If the table is not there, the skeleton still shows on that device and the panel says it could not be saved.

No other environment variable is required. The model file is loaded from Google's MediaPipe storage by the browser, not by the server.

## Notices

MediaPipe Pose Landmarker (`@mediapipe/tasks-vision`, model `pose_landmarker_full`) is Copyright Google LLC and licensed under the Apache License, Version 2.0. The licence is in `node_modules/@mediapipe/tasks-vision`. https://www.apache.org/licenses/LICENSE-2.0

`three` and `@react-three/fiber` are licensed under the MIT License. Their licence files ship with the packages.
