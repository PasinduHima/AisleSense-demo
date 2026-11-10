# AisleSense security: implemented model and algorithm

Updated 9 November 2026. This is a technical fact sheet, not a presentation script.

**Model:** MediaPipe Pose Landmarker Lite, using its cached local model bundle. It outputs 33 body landmarks. This build configures one person per frame and runs on the laptop CPU.

**Decision algorithm:** a timed region-state machine. Pose estimation locates body points; the rule layer checks spatial regions, dwell times, observation visibility and action order. It does not directly classify a person as a thief.

| Rule | Implementation | Evidence boundary |
|---|---|---|
| Presence | At least two sufficiently visible torso landmarks | Visible-person observation, not identity |
| Zone entry | Torso centre inside the configured rectangle for 0.75 seconds; one event per entry | Demonstrated on ordinary-shopping footage; neutral movement observation |
| Shelf-to-bag-area movement | Same visible wrist dwells in shelf region for 0.35s, enters bag region within 4s, then dwells there for 0.35s | Implemented experimental rule; representative concealment evaluation is still missing |
| Visibility handling | Torso visibility >0.50; wrist visibility >=0.60; lost observation for >0.8s cancels partial state | Observability thresholds, not theft probabilities |
| Repeated action | 8-second shelf-to-bag event cooldown | Avoids repeated observations from one sequence |
| Evidence | Rolling video context aims for 3 seconds before and after the event; staff decision saved locally | Actual clip duration depends on available footage |

The displayed person box encloses visible pose landmarks; it is not a separate object detector. POSE 01 is a local single-pose label, not a persistent person identity or biometric match. The dashboard's landmark count is the number passing the visibility threshold in that processed frame.

The authored camera illustration explains shelf interaction, bag-area movement, exit approach and staff response. Its points, boxes and timing are simulated. Its four response levels are not model confidence percentages. The scripted Assist/Verify events and the real region-entry observations remain explicitly separated.

## Why this model
It already runs locally on the presentation laptop with measured per-frame inference time. It supplies body points that can be inspected and explained without introducing an untested heavyweight stack immediately before the final. Performance results are saved under evidence; inference time excludes decoding, drawing, storage and other application work.

YOLO11 pose is an alternative for future comparison, not the implementation being shown. The official YOLO11 documentation lists pose support and its licensing options. No YOLO model, new training dataset or commercial licence was added in this revision.

## Existing-shop integration
The intended inputs are compatible existing CCTV/NVR and the store's network. AisleSense adds local analysis and a staff review dashboard. A suitable existing computer may be used; otherwise an edge computer is needed. The demonstration uses local recorded video, so live camera connection, credentials and deployment integration remain future work. POS/payment verification is not implemented. No extra physical security sensor is claimed or required for this demonstration.

Sources: [Google Pose Landmarker documentation](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker), [official MediaPipe implementation](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/python/vision/pose_landmarker.py), [Ultralytics YOLO11 documentation](https://docs.ultralytics.com/models/yolo11).

Reference handling: the requested LinkedIn link exposed a title about computer vision, YOLO11, pose estimation and retail tracking, but playback was blocked by a security check. The reference video was not viewed, copied or downloaded. This revision is an original AisleSense explanation of the requested visual approach.
