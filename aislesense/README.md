# AisleSense · Team Everguard

Local working demonstration for GreenEXE 4.0. Check `STATUS.md` for the latest verified boundary and unfinished work.

## Open on this laptop

**Latest revision:** use **Start Business Dashboard.cmd** for the business overview, then choose **Security** or **Smart Lighting**. See PROJECT_GUIDE.md for the new aisle-to-aisle demonstration and animated step-by-step 2D flow. The 3D simulator now has distinct aisle lighting, a more detailed store and projected brightness labels. The existing script and older backup recording have not been revised.

Double-click **Start 3D Simulation.cmd** for the interactive walkthrough or **Start Control Room.cmd** for the working dashboard. **Start AisleSense.cmd** also opens the walkthrough. Wait for “Ready”; the dashboard opens at <http://127.0.0.1:8765>. Keep the small launcher window open while presenting. Press Ctrl+C in that window to stop. Closing a browser tab alone does not stop the server.

The prepared build, model, shopping sample and Python environment are stored locally. The running demo needs no cloud account or internet. It is not yet a portable installer: copying the folder to another laptop requires rebuilding the Python environment. Use a WebGL-capable modern browser.

## Interactive presentation

Hover or click any of 12 components to inspect its role, enlarge its cutaway and see a 2D path. The seven-step guided tour and Presenter view help explain the idea. 3D, 2D and Control room share the same backend state. Hardware cutaways are conceptual, and software modules are represented as logical layers. The two-person guide and recorded backup are in `DEMO_GUIDE.md` and `presentation/`.

## What works

- Rotatable Three.js supermarket with five clearly labelled scenarios.
- Assist → Verify review workflow; notes and decisions persist in SQLite.
- Real local pose inference from recorded MP4 input; automatic movement-region observation with a reviewable clip.
- Occupancy-controlled lighting with delay, fade, manual override, review hold and safe brightness on lost input.
- Planned circuit view uses the same controller values as the store view.
- Energy comparison integrates stated wattage/brightness assumptions over time. Overhead is shown separately.

The concealment animation is an authored scenario. The shelf-to-bag pose rule is experimental and has not been validated on representative footage. The supplied Pexels sample is ordinary shopping, used only for occupancy and neutral movement observations. Do not present the actor as committing misconduct. See `SOURCES.md`.

## Files and recovery

- `data/events.sqlite3`: review history. Reset scene preserves it.
- `data/clips`: automatically generated event clips.
- `data/sources`: local video inputs and provenance manifest.
- `models`: cached pose model.
- `evidence`: saved run statistics and verification notes.
- `logs/server.log`: startup or analysis errors.
- `DEMO_GUIDE.md`: short two-presenter walkthrough.

If the dashboard says disconnected, use the launcher. If a port conflict occurs, inspect the log rather than stopping an unknown process. Reset scene starts a new current-session queue; earlier reviews remain in Demo evidence. Uploaded footage stays on this laptop. The local demo has no accounts, production access control or guaranteed anonymization; do not expose its server publicly.

## Development setup (only if rebuilding)

Python 3.13 and Node 24 were used on the presentation laptop. Create `.venv`, install `requirements-lock.txt` with pip, then run `npm ci` and `npm run build`. `requirements.txt` records direct dependencies. Install only one OpenCV distribution: `opencv-contrib-python`; MediaPipe requires it. Model and video URLs are in `SOURCES.md`; download and prepare them before going offline.

Run `.venv\Scripts\python.exe -m pytest -q` for tests, `npm run build` for the UI build, and `.venv\Scripts\python.exe launch.py --no-browser` to run without opening a tab. Tests use an isolated database and do not modify presentation history. Some restricted execution environments require loopback permission for API tests.

There are no physical devices, payment integration, identity recognition or trained retail theft classifier in this build.
