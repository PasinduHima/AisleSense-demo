# Final implemented-demo check — 9 November 2026

## Current costing
User-selected illustrative rate: **LKR 300 for one unit = 1 kWh**. It is not a claim about the current electricity tariff.

For three 60W aisles at 30%, 100%, 30% plus 15W system overhead:
- Always-on baseline: 180W; adaptive lighting: 96W; adaptive including overhead: 111W.
- Net reduction: 69W (38.3%). At 12h/day and 30 days/month: 24.84kWh net saving.
- Baseline: LKR 19,440/month. Adaptive + overhead: LKR 11,988/month.
- Net example saving: **LKR 7,452/month; LKR 89,424/year**.
- Values assume the current brightness pattern continues. No installation costs, taxes or other charges included. Full-brightness operation instead shows 15W extra and LKR 1,620/month extra, rather than a fabricated saving.

## Checks performed
- Production TypeScript/Vite build passed. Existing large-bundle advisory only.
- Python suite: 29 passed in 6.50s, one existing Starlette test-client deprecation warning. Initial restricted run stalled in the local test-client setup; stopped and reran with local execution access. Current report: final-test-results.xml.
- Cost suite: 4 passed, including exact LKR 300 monthly/yearly figures, unit conversion, system overhead, negative savings and tariff/hour scaling.
- Business overview displayed the new rate and monthly/annual values. Smart Lighting showed the same numbers for one customer in A2; A1 and A3 remained at 30% while A2 was 100%. Screenshot: final-cost-300.png.
- Security scripted sequence reached L3 Verify with one event and a reviewable authored trace. Saved a clearly labelled final-QA false-alarm decision; after browser reload its status and note persisted.
- Normal-shopping scripted comparison reached 39s with no current-session event. This is an authored negative workflow check, not real detection accuracy evidence.
- Genuine recorded run: 71 frames processed, 71 with pose, one neutral zone-entry observation; mean inference 16.3859ms, wall time 13.2945s. Source normal-shopping.mp4; no concealment accuracy claim. Full report: final-300-video-run.json.
- Automatic clip 8d0131089b97.mp4 loaded with browser readyState 4, 6.08s duration and no media error.
- Security 3D simulation-only full-screen view rendered and exited correctly. Six-step animated security flow reached step 6 and stopped.
- Circuit selector A3 showed dimmed 30%; after starting one customer in A2, selecting A2 showed one person, occupied, 100% command and 100% lamp. Input-failure scenario showed all three aisles at safe 100% with input-unavailable status.
- Operations, Video analysis, Business overview and Demo evidence pages opened. Video source/rule controls and saved review history were visible. No browser warning/error messages captured.
- Launcher health returned AisleSense ready. Existing service reused, not restarted. Retained older scripted backup MP4 decoded its first frame and reported 31.79s; this is not a new recording of the current layout.
- User-created events/history retained. No public deployment, network footage upload or new external resource used. Test browser tab closed.

## Scope and next use
No unresolved blocker was found in the implemented paths checked above. Live CCTV/POS, production authentication, physical circuits, representative concealment evaluation and measured energy savings remain unimplemented/unvalidated as documented in STATUS.md. The script and older recorded backup were intentionally retained. The recovery archive is rebuilt and checked separately by scripts/package_demo.py; evidence/package-check.json records its result.

Open Start Business Dashboard.cmd and refresh an already-open page. Use Smart Lighting → One customer in A2 to reproduce the cost example. The Full screen demo button enlarges only the 3D simulation. No further change is required for this request.
