# Verification checkpoint — 8 November 2026

## Automated checks

- 22 tests passed after final backend and dependency changes; XML in `test-results.xml`.
- Covers delay/fade, stationary occupancy, safe fallback, manual override expiry, review hold, time-based energy accounting, normal/no-alert and scripted escalation, reset/history separation, action dwell/order/visibility loss, local upload validation, path validation, settings reset and video stop.
- Tests use fixtures or an isolated API database. They are **not real-video detection accuracy tests**.
- TypeScript and Vite production build passed. Final JS bundle is about 855.5 KB (232.3 KB compressed); the size warning is not a failure.
- pip dependency check passed. Duplicate OpenCV package removed; only opencv-contrib-python 5.0.0.93 remains. Python and npm versions are locked.
- Starlette emits an httpx TestClient deprecation warning; current route tests pass. No reason to upgrade the test stack before the demo solely for that warning.

## Genuine recorded-video runs

Input: licensed ordinary-shopping development clip, 11.24 seconds, 25 fps; sampled at about 6.25 fps at 640-pixel analysis width. CPU inference using MediaPipe Pose Landmarker Lite.

| Run | Processed frames | Frames with pose | Observations | Mean inference | Wall time |
|---|---:|---:|---:|---:|---:|
| Occupancy development | 71 | 71 | 0 | 20.25 ms | 11.24 s |
| Region-entry development | 71 | 71 | 1 | 19.33 ms | 13.19 s |
| Region-entry after cleanup/fixes | 71 | 71 | 1 | 20.12 ms | 12.23 s |
| Final integrated walkthrough build | 71 | 71 | 1 | 17.53 ms | 11.74 s |

Saved raw results: `occupancy-development-run.json`, `zone-entry-development-run.json`, `zone-entry-final-run.json`. These use the same development input and are repeated pipeline checks, not independent evaluation takes. The model's average inference cost is not total application latency or an accuracy rate.

The first region event produced a 6.08-second H.264 clip. Browser loaded it with readyState 4 and no media error; playing reached the end at 6.08 seconds. A staff confirmation and explanatory note survived a full backend restart. The final region run generated another event after dependency cleanup and fixes.

## Actual UI checks

- Inspected the responsive layout at the default approximately 699-pixel-wide preview and at 1366 × 768. Desktop page width matched viewport (no horizontal page overflow).
- Store is rendered in WebGL with shelves, checkout, cameras and a shopper.
- Concealment scenario progressed to Level 3 with one event; review modal shows its scripted trace. Saved Need more decision remained after restart.
- Empty scene reached 30% in the circuit command and zone state. Stationary shopper kept A2 at 100% while A1/A3 dimmed.
- Recorded-video completion now stops the energy clock, shows Presence unknown and sets the light/circuit to 100% Input unavailable.
- Video tab generated events by inference without a manual alert trigger. Clip playback and review were tested.
- Launcher started the local backend and readiness check passed. Cached model, built frontend and prepared video are local.
- A deprecated Three.js shadow setting was found in browser warnings and replaced with its supported equivalent.

Screenshots: `store-checkpoint.jpg`, `video-checkpoint.jpg`. Console errors were not observed in the inspected log; an earlier Three.js warning was corrected.

## Still unverified / incomplete

- Representative real concealment/shelf-to-bag detection, separate negative takes and held-out evaluation.
- Multiple shoppers, occlusion, wide surveillance viewpoints, identity association and payment checks.
- RAM measurement, long-duration soak test, unplugged/network-disconnected rehearsal and a second browser.
- An electrical circuit, MQTT/ESP32 commands and measured energy savings.
- Portable distribution to a different computer and complete binary redistribution review for public distribution. The recovery archive is private, for this prepared laptop.

The current desktop launcher uses the prepared environment on this laptop. Do not describe it as an install-free package for every laptop.

## Final interactive presentation checks

- Opened all 12 detail panels in the browser and inspected their distinct illustrative cutaways. Camera Assemble/Explode and layer selection worked. Keyboard focus opened the camera hover preview and enlarged its scene objects; a separate physical mouse-hover test was not performed.
- Traversed all seven guided-tour steps. Opened Virtual ESP32 through the 2D flow and confirmed its 30% value agreed with the controller and lamp. Power supply is a separate branch.
- Presenter view and Escape behaviour worked. Desktop screenshots at 1366 × 768: final-3d-preview.jpg, final-camera-cutaway.jpg, final-2d-flow.jpg. Narrow detail panel also inspected with no page-width overflow.
- Observed about 30 rendered fps, 651 draw calls and a 1280 × 438 canvas during the interactive preview. No final browser console errors/warnings observed. This does not establish performance on other devices or sustained load.
- Navigated from the walkthrough into real video analysis. The final run produced a new event automatically. Its H.264 clip loaded at readyState 4, duration 6.08 seconds, no media error. Raw run: final-integrated-video-run.json. Prior full playback and restart-persistence checks remain applicable; backend unchanged.
- Recorded the application canvas and status overlay, saved WebM, converted to MP4 and decoded 465 frames at approximately 14.625 fps (31.795 seconds). Inspected frame at 16 seconds: Level 3 and review hold visible with explicit recorded-scripted-simulation label. See recording-check.json and backup-frame.jpg. The backup predates the final camera zoom/crop polish; it still accurately shows the workflow.
- Recorded backup contains no microphone audio or desktop capture. It proves the authored story can be replayed, not real-video concealment accuracy.
- Local asset packaging and CRC checks are recorded separately in package-check.json. Extracted the full archive, launched its own Python environment and backend on temporary local port 8767, and verified health, cached model and the current production UI response. See recovery-start-check.json. The server was stopped afterwards. The archive was then regenerated only to include the verification notes; application assets were unchanged. Actual network-disconnected rehearsal is not claimed.
