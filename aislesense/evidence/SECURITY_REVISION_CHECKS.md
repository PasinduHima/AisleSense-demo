# Security revision checks — 9 November 2026

## Working and checked
- 29 automated tests passed, including read-only diagnostics, visibility-loss reset and same-wrist ordered dwell. See test-results.xml. Production TypeScript/Vite build passed; the existing large-bundle advisory remains.
- Browser: Camera & alert, presenter mode, scripted sequence, normal-shopping comparison, recorded analysis, review modal, model-detail disclosure, Detection flow and Store walkthrough all opened successfully. No browser warning/error messages were recorded in the final check.
- Scripted sequence reached Assist with one event; pause worked at 12 seconds. Earlier in this revision the sequence reached Verify and its trace opened in the review modal. These are authored explanation checks, not real-video accuracy tests.
- Ordinary authored shopping completed at 28 seconds with zero current-session review events.
- Detection flow advanced from step 1 to step 4 and paused. Security store exposed four relevant physical hotspots and seven context/software detail entries; decorative hardware proxies are omitted from that view.
- Presenter layout visually inspected at 1366 x 768. Smaller layout inspected at 714 x 850: document/body width 699px within the 714px viewport, with stacked camera and alert. Viewport override reset after checks.
- Final genuine recorded run: 71 processed frames, 71 frames with pose, one neutral region-entry observation, mean model inference 19.5863ms, total worker time 13.5104s. Not an accuracy score or full alert-latency benchmark. Full result: security-recorded-run-v3.json.
- Final automatic evidence clip 354c49dba56b.mp4 loaded in the browser review modal: readyState 4, duration 6.08s, no media error. Current recorded desk showed the actual landmark count, dwell state, clip-ready status and latest measured model time.
- Smart Lighting A2 scenario triggered through the UI; subsequent local API check confirmed A1=30%, A2=100% with one occupant, A3=30%. Captured in security-final-state.json. Existing lighting tests also passed.
- Screenshots: security-recorded-v3.png (genuine inference); security-illustration-v3.png (authored pose-style explanation and model details).

## Boundaries and unresolved work
- Representative real concealment-positive and independent negative evaluation footage remains missing. The experimental wrist rule is not a validated theft classifier.
- The LinkedIn reference's playback was blocked; no exact visual reproduction or viewing claim is made.
- Live CCTV/NVR, POS/payment integration, production staff authentication and physical circuits are not implemented. Energy remains an estimate from configured assumptions.
- Presentation script and older recorded backup are unchanged at the user's request. The older backup does not show this revision.

## Next
Use Start Business Dashboard.cmd, then Security. Play security sequence explains the intended workflow; Analyse recorded sample shows genuine local analysis. SECURITY_MODEL.md records the model and rule details. Further functionality should be added only on user request; evaluation footage and production integration remain separate follow-up work.
