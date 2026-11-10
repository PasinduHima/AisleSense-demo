# Simulation-only full screen and owner savings — 9 November 2026

Historical check at the earlier LKR 50 example rate. The user subsequently changed the default to LKR 300 per unit. See FINAL_300_CHECKS.md for the current costs and final checks.

## Verified
- Production TypeScript/Vite build succeeded. Existing large-bundle advisory only.
- `node --experimental-strip-types --test tests/savings.test.mjs`: 3 passed. Checks cover watts-to-kWh-to-cost conversion including overhead; full-brightness extra cost rather than false savings; tariff/hours scaling.
- Browser on latest build: Smart Lighting and Security store full-screen controls work. 3D canvas occupies full viewport height (768px at 1366x768; approximately 850px at 714x850). Savings cards are absent from full screen. Source label, Exit button, orbit/zoom hints and scene hotspots remain.
- CCTV cutaway opens inside full screen. Close and Exit work. Escape exits full screen. Locate in 2D flow from an inspected component restores the regular workspace and shows the flow.
- One-customer A2 state: 30/100/30 brightness, 69.0W net reduction, 38.3% less power, 24.84kWh monthly example, LKR 1,242 monthly / LKR 14,904 yearly saving. Includes 15W overhead. Always-on/adaptive examples LKR 3,240 / LKR 1,998 per month.
- Editing example tariff from 50 to 100 doubled monthly savings to LKR 2,484; power and energy unchanged. Restored 50 afterward.
- Responsive document width 699px within a 714px viewport. Viewport override reset after checking. No captured browser warning/error messages.
- Screenshots: simulation-only-fullscreen-v4.png and owner-savings-v4.png. Final minor changes after these captures only handled missing connection and leaving full screen when navigating from a cutaway to 2D; both included in the final production build.
- Existing local server was reused; no new server was owned by this check, and the existing service was left running.

## Boundaries / next
Example electricity rate and opening hours are dummy inputs, not sourced real tariff data. Linear brightness-to-power assumption is retained. Monthly/yearly calculations hold the current instantaneous brightness pattern constant and exclude installation costs, taxes and other charges. No measured energy-saving or commercial ROI claim is made. Real detection limitations remain as recorded in STATUS.md. Script and older backup are unchanged. Use the existing launcher and refresh any already-open page. No additional feature work pending for this request.
