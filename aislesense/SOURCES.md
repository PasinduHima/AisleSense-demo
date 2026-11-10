# Resource provenance and permitted use

Reviewed 8 November 2026. Keep this file with the demonstration.

## Normal-shopping development video

- Title: **Man Looking at a Product Inside a Supermarket**.
- Creator: **Kampus Production**, via Pexels.
- Source: https://www.pexels.com/video/man-looking-at-a-product-inside-a-supermarket-8420776/
- Official media URL: https://videos.pexels.com/video-files/8420776/8420776-uhd_3840_2160_25fps.mp4
- Terms: https://www.pexels.com/license/ — free use and modification, subject to Pexels restrictions. Attribution is provided voluntarily in the app and here. Do not portray identifiable people in an offensive/bad light, imply endorsement, or redistribute as a stock service.
- Local file: `data/sources/normal-shopping.mp4`; 11.24 seconds, 25 fps, 960 × 540, audio removed. Original download is retained alongside it.
- SHA-256: `993195f7a489b7c3bad39082089a5a16fc6b82d704385f606d55b89ab920a593`.
- Purpose: **ordinary shopping, occupancy and neutral region-entry development tests only**. This person is not being presented as a thief or as demonstrating concealment.
- This clip is development material, not a held-out evaluation. Region selection and pipeline debugging used it. Pose presence counts are not accuracy measurements.
- Generated review clips are derived from this footage. Retain this credit and the same purpose limitation when presenting them.

## Pose model

- Google MediaPipe Pose Landmarker Lite / BlazePose GHUM.
- Cached file: `models/pose_landmarker_lite.task`.
- Official download: https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task
- Python documentation: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/python
- Model card: https://storage.googleapis.com/mediapipe-assets/Model%20Card%20BlazePose%20GHUM%203D.pdf
- Model card states Apache License 2.0. It describes fitness-oriented use and limitations; surveillance/identity-sensitive uses are not established capabilities. Our controlled local prototype does not validate a deployable retail surveillance product.
- Outputs are body landmarks. AisleSense adds transparent geometric rules; the model does not recognize theft, payment or an item being hidden. Only one person is supported in the demonstration.

## Frontend and processing libraries

- Three.js: MIT, https://github.com/mrdoob/three.js/blob/dev/LICENSE
- React / React DOM: MIT, https://github.com/facebook/react/blob/main/LICENSE
- Lucide icons: ISC, https://github.com/lucide-icons/lucide/blob/main/LICENSE
- MediaPipe: Apache 2.0, https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE
- OpenCV Python distributions: Apache 2.0 package terms and third-party notices, https://github.com/opencv/opencv-python/blob/4.x/LICENSE.txt
- FastAPI: MIT, https://github.com/fastapi/fastapi/blob/master/LICENSE
- imageio-ffmpeg wrapper: BSD-2-Clause, https://github.com/imageio/imageio-ffmpeg/blob/main/LICENSE
- The bundled FFmpeg executable has its own compiled-code license terms, which must be checked and included before distributing a portable binary package. Current use is local on the presentation laptop; no binary redistribution is approved or completed.

Direct dependencies are in `requirements.txt` and `package.json`; the exact installed versions are in `requirements-lock.txt` and `package-lock.json`. Installed packages retain their license metadata. Selected frontend notices are copied to `licenses` for the local built assets.

## Project design

The user's supplied **AisleSense — System Design.pdf**, 16 pages, informed the risk stages, staff review and lighting-control path. Its architecture and legal/security statements are design suggestions rather than proof of features. The local build deliberately uses a smaller FastAPI/SQLite stack for the deadline.

## Footage still needed

Representative, explicitly authorized staged shelf-to-bag interactions and negative examples from separate takes, plus a separate evaluation split. Do not substitute the 3D scenario or the neutral Pexels shopper as real concealment evidence. Time-box further sourcing on 9 November; document any narrower event selected for the final demo.


## Interactive hardware explanation references

- Three.js picking / raycasting: https://threejs.org/manual/pages/picking.html and https://threejs.org/docs/pages/Raycaster — used for selecting scene components.
- ESP32 LEDC documentation: https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/ledc.html — basis for the planned PWM explanation. No firmware is running on a physical ESP32.
- Example IP-camera documentation: https://help.axis.com/en-us/axis-p1367 — lens/sensor/network/PoE context only. The generic cutaway is our own illustration and does not reproduce this camera's internal design.
- The source design proposes ESP32, a compatible low-voltage MOSFET stage, 12 V LED/supply and a future current sensor. Exact electrical ratings and protection are not specified or validated by this demo.

## Additional footage search, 8 November

The official RetailS repository (https://github.com/TeCSAR-UNCC/RetailS) describes releasing anonymized pose sequences rather than raw video pixels. It therefore does not supply the raw-video proof required by this pipeline. A Pexels bag-handling candidate (https://www.pexels.com/video/salesperson-putting-a-bag-inside-a-shopping-bag-9595337/) was located, but no representative staged concealment-positive input was obtained in this sourcing pass. No accuracy claim is based on these candidates. No dataset agreement was accepted and no private footage was published.

## 8 November visual revision
Three.js SpotLight API documentation consulted for the aisle illumination: https://threejs.org/docs/pages/SpotLight.html . All new store objects, materials, zone labels and diagrams are locally authored code; no external 3D assets or new footage were added. Light shading is illustrative, not an energy or photometric measurement.

## 9 November security explanation revision
- Google Pose Landmarker: https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker and official implementation https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/python/vision/pose_landmarker.py . Used to verify the implemented Lite model's 33-landmark output and explain body-point observations.
- YOLO11 official documentation: https://docs.ultralytics.com/models/yolo11 . Comparison only; YOLO is not running in this project.
- User's visual reference: https://www.linkedin.com/posts/computervision-yolo11-poseestimation-ugcPost-7525060731323740160-yyX4 . Public title was visible, but playback was blocked by a security check. No CAPTCHA bypass, sign-in, copying or download occurred. The user requested a suitable adaptation rather than an exact reproduction.
- Camera illustration, body-point graphics, region overlays and dashboard layout are original code. Recorded imagery remains the previously attributed Kampus Production / Pexels sample. Scripted graphics are not inference evidence.
