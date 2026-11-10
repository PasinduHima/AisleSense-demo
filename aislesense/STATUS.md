# AisleSense implementation checkpoint

## Demo upgrade — 10 November 2026
- New one-click **Run demo scenario** (`demo`): four ordinary shoppers, one scripted concealment sequence, a cashier and a guard on a deterministic 52-second timeline. Risk escalates Level 1 low (lingering, looking around) → Level 2 medium (item into bag, alert to floor staff) → Level 3 high (passes checkout, guard walks to the exit and speaks with the shopper). One event is created and upgraded, never duplicated.
- Demo controls over the 3D store and on the Security desk: run/restart, play/pause, reset, 0.5×/1×/2× speed (`POST /api/speed`), viewpoint presets (overview, top-down, aisle, CCTV), live risk banner, five-step alert flow and an energy-saved indicator.
- Lighting in the demo scenario uses three levels: 30% empty, 80% occupied, 100% cooler-white "Evidence boost" on the aisle holding a person of interest. All other scenarios keep the original 30/100 behaviour.
- Simulated camera view: COCO-style 17-keypoint skeleton in neon green (#39FF14) with glow for every person in view, person box and `ID · score · risk` label coloured by risk, date/time stamp, camera picker, light sensor grain. Scores are illustrative values on a scripted scene, not model output; the view stays labelled as simulated.
- People: eight appearances, per-bone merged meshes, eased walking with rounded corners, shelf-facing pick/browse/look-around/conceal/checkout/talk poses. The short normal and concealment scenes now enter through the entrance, walk round the shelving and face the shelf and checkout.
- Checks: 31 Python tests (two new: demo order/determinism/no-clipping/no-collision, and lighting levels) plus 4 cost tests pass; production build passes; demo played through in the browser with no console errors. Frame rate could not be confirmed at 60 fps in the embedded preview on the Intel UHD 620 laptop (about 30 fps observed while the pane was throttled; measured frame cost 6–12 ms). Check on the presentation display.
- Not updated: DEMO_GUIDE.md, PROJECT_GUIDE.md, the recorded backup video and the recovery archive still describe the earlier interface. Previous sources are in `.backup/2026-11-10-before-demo-upgrade`.

Updated: 9 November 2026. Security explanation revised at the user's request. Smart Lighting behaviour retained. Representative concealment accuracy remains unvalidated. The user deferred script work; the script has not been changed.

## Latest final check — LKR 300 per electricity unit
- Default cost input is now the user's illustrative LKR 300 per kWh (one electricity unit). Central default is shared with its regression test. Project guide uses the updated figures.
- One occupied aisle at 100% and two at 30%, 60W/aisle plus 15W overhead, 12h/day and 30 days/month: baseline LKR 19,440/month; adaptive plus overhead LKR 11,988/month; net saving LKR 7,452/month or LKR 89,424/year. Energy saving remains 24.84kWh/month; power reduction 69W / 38.3%.
- Full check passed: 29 Python integration/controller/rule tests plus 4 cost tests; production build; current real-video run; playable automatic clip; saved review survives browser reload; normal shopping has no event; security reaches Verify; six-step flow completes; simulation-only full screen; A2 occupancy and selected circuit synchronization; input-loss safe brightness; Operations, Video analysis, Business overview and Demo evidence navigation; launcher health and retained backup decoding. No browser warnings/errors captured.
- Evidence: evidence/FINAL_300_CHECKS.md, evidence/final-test-results.xml, evidence/final-300-video-run.json and evidence/final-cost-300.png. Archive regenerated after these checks; see evidence/package-check.json for CRC/hash result. No new server was started or stopped; reused the existing local service.
- No blockers found within the implemented demo scope. Representative concealment accuracy, live CCTV/POS integration, physical hardware and measured savings remain outside the verified scope. Script and older recording stay unchanged until requested.

## Simulation full screen and owner savings — 9 November
- Added Full screen demo toggle to the 3D store toolbar in the complete simulator, Security store and Smart Lighting. Following the user's clarification, only the 3D scene fills the screen. Dashboard, savings, scenario controls and other panels stay hidden. Exit button/Escape restore the workspace; component cutaways still work. Fullscreen API is requested when available, with a viewport-filling fallback.
- Prominent power, monthly energy and LKR cost example cards on Business overview, Smart Lighting and complete simulator. Editable dummy tariff and operating hours/days; overhead deducted; negative savings displayed as extra consumption/cost.
- Default illustrative assumptions (updated at user request): LKR 300/kWh, 12h/day, 30 days/month. Current configured power is 60W per aisle with 15W system overhead. One aisle at 100%, others at 30% gives 69W net reduction, 24.84kWh/month and LKR 7,452/month if that pattern persisted. These are not measured store savings or a verified tariff.
- Three new calculation tests passed and production build passed. Browser checks covered simulation-only full screen, exit/Escape, component inspection, return to 2D, editable price doubling, 1366x768 and 714x850 layouts; no captured browser errors/warnings. See evidence/FULLSCREEN_SAVINGS_CHECKS.md.
- No backend, model, lighting-control rule, script or recorded-backup change in this increment. Existing server was already running and was left running.

## Security revision on 9 November
- Security now opens a dedicated Camera & alert desk with a labelled pose-style authored camera illustration and a genuine recorded-analysis option.
- Large response-level, person, review-count and timing numbers; staff alert card opens the existing evidence/review modal. Source labels distinguish authored explanation from real model output.
- Real video now draws visible landmark points and a landmark-derived body extent box. Read-only rule diagnostics report actual visible-point count, dwell state and thresholds alongside measured inference time.
- Explicit model: MediaPipe Pose Landmarker Lite. Algorithm: timed region-state machine with dwell/order/visibility rules. No YOLO integration or theft-accuracy claim was added. SECURITY_MODEL.md records the implementation and its limits.
- Existing CCTV/NVR/network versus AisleSense software additions are separated. Decorative hardware proxy boxes are removed from the security store; only relevant context/components remain there.
- LinkedIn's post title was accessible, but its video was blocked by a security check. No reference video was downloaded or copied. The user clarified that the reference was a visual guide, not an exact recreation request.
- 29 automated tests passed, including new read-only rule-explanation checks. Production build passed. Browser and current recorded-run evidence are in evidence/SECURITY_REVISION_CHECKS.md.

## Latest revision
- Business overview with two service entrances and a separate Start Business Dashboard.cmd launcher.
- Security workspace: response levels, scenario controls, current event review and dedicated explanation.
- Smart Lighting workspace: simulated camera-zone map, per-aisle readings, one-customer examples in A1/A2/A3 and a 55-second journey between all three aisles.
- Three aisle regions now correspond to Produce, Essentials and Household. Checkout/front circulation is separate. Empty aisles begin dimmed in the dedicated lighting examples; departure delay and fade still apply during the journey. Each aisle's circuit can be selected separately.
- Remodelled store with back-wall refrigeration, trim, planters, longer LED fixtures, spot lighting, clear dim/bright floor strips, customer marker and projected brightness labels. Retained generic component cutaways.
- Two six-step flow paths with moving arrows, play/pause, previous/next, restart, node selection and component inspection. Step playback is explanatory and separate from the store simulation clock.
- 26 automated tests passed, including one-customer isolation in all three aisles and a complete zone journey. Production build passed. UI checks and new screenshots are recorded in evidence/REVISION_2_CHECKS.md.
- Read PROJECT_GUIDE.md for the current navigation. The older recorded backup and script reflect the earlier interface; they are retained, not presented as newly updated artifacts.
- Final UI verified A3 circuit selection, Level 3 review opening, complete 55-second lighting journey, six-step auto-stop and manual flow controls. Active arrows reported flowArrow / 1.5s with a changing transform; paused arrows reported no animation. Compact page width stayed within the viewport. Final inspected console was clear.
- Recovery archive is regenerated with this revision and checked by CRC and critical-asset hashes. The earlier extracted-startup report is historical to the first build; this revision's actual working-folder startup and browser checks are current.

## User priorities
- Judges asked for a working system or evidence demonstrating the concept.
- A rotatable Three.js supermarket is approved, with labelled scripted scenarios.
- Smart lighting and the planned circuit are simulated; no hardware build required.
- Revised deadline: finish and package today, 8 November; presentation 11 November. This supersedes the earlier 9–10 November implementation schedule.
- Team members should wear black blazers (competition instruction).
- Use the friend's System Design PDF as design input, not proof of implemented capabilities.

## Working now
- Interactive Three.js walkthrough: 12 hover/focus previews, enlarged objects, clickable detailed panels, rotatable component cutaways, selectable layers, assemble/explode, and two-dimensional signal paths.
- Connected 2D system map with live values, separate power branch, seven-step guided tour, presenter view and five scene controls.
- Separate 3D and control-room launchers use the same backend and persistent review history.
- Updated simple two-person script and Q&A, verified 31.8-second recorded simulation backup (MP4 and WebM), plus same-laptop recovery packaging script.
- Local FastAPI/SQLite backend + React/Three.js dashboard in this folder.
- Five scripted scenes: normal shopper, concealment Assist → Verify, empty store, stationary shopper, input failure.
- Persistent review notes/decisions and automatically generated clips from real recorded-video region observations.
- Shared occupancy controller, 5-second empty delay, 30% dim level, immediate brightening, 60-second manual override, review hold and safe fallback.
- Planned circuit view and assumption-based energy comparison, including separate system overhead.
- Cached local MediaPipe model and licensed ordinary-shopping video with provenance. Single-person pose inference measured at about 20 ms/frame; full 11.24-second sample analysed in about 12 seconds in the final region run.
- Double-click `Start AisleSense.cmd`, source/license notes, and simple two-person `DEMO_GUIDE.md`.

## Checked
- All 12 component panels opened in the actual browser; camera assembly controls, selectable layers, guided-tour steps and 2D component navigation checked.
- Presenter layout inspected at 1366 × 768; narrow component panel fits without horizontal overflow. Final browser log contained no warnings or errors.
- Interactive store rendered at about 30 fps in the preview (651 draw calls); this is an observed sample, not a long-duration or cross-device benchmark.
- Final real-video run processed 71 frames, generated one neutral zone-entry observation and a 6.08-second playable clip. Mean model inference 17.53 ms, total run 11.74 seconds.
- 22 automated core/API tests passed; production UI build passed; dependency consistency check passed.
- Actual browser tested: scripted escalation, decision notes, real-video generation, six-second clip playback, restart persistence, stationary occupancy and circuit dimming.
- Fixed visibility-loss action carry-over, stale presence labels, end-of-video clock/safe-state behaviour, dependency duplication and deprecated Three.js shadow setting.
- See `evidence/CHECKS.md`, JSON benchmark files, XML test report and screenshots for exact boundaries.

## Unresolved / main risk
There is no representative authorized staged concealment video or separate held-out set yet. The Pexels clip only shows ordinary shopping and must remain neutral. The real working region-entry observation is a movement test, not theft detection. The shelf-to-bag rule exists but is not established on real representative footage. Do not substitute the authored 3D sequence as detection evidence.

## Next / freeze instructions
No scheduled feature changes after this release. Reopen only on a new user request or a reported blocker. The presenters should rehearse DEMO_GUIDE.md on the actual laptop and presentation display. A network-disconnected rehearsal, long-duration soak and another browser have not been performed. Further representative footage/evaluation is future validation, not part of the demonstrated accuracy claim. Preserve review history and provenance.

Recovery archive: ../outputs/AisleSense_Final_Round_Demo.zip. Packaging records CRC and critical-asset SHA verification in evidence/package-check.json. This is a prepared-laptop backup, not a universal installer.
The extracted archive successfully started using its own environment on this laptop, reported a cached model and served the production UI. See evidence/recovery-start-check.json. All temporary local servers were stopped after verification.

## Running / restart notes
The test server is started by `launch.py --no-browser` and is local-only on port 8765. At the end of the run it is stopped; use Start AisleSense.cmd to reopen. The launcher does not download or install anything. This is a prepared-laptop build, not a portable installer. Do not blindly stop an unrelated process if port 8765 is occupied.

Tests use their own temporary database; current presentation history contains clearly labelled QA examples. Reset demo preserves that history. `requirements-lock.txt` and `package-lock.json` preserve installed versions. In restricted tool execution, loopback access may require permission; pytest API checks otherwise hang. Set TEMP/TMP to this folder's `.tmp` if the default temporary folder gives permission errors.

## Evidence boundaries
Scripted animations do not establish AI detection accuracy. Energy values are estimates based on stated assumptions, not physical measurements. Checkout passage is not proof of payment. No automatic retraining, physical MQTT device or production security is claimed.
