# AisleSense: explore the project

Updated 9 November 2026. This is an operating guide, not a presentation script.

## Open
Double-click **Start Business Dashboard.cmd** in this folder. Keep the launcher window open. The browser opens the business overview with two services: Security and Smart Lighting. Start Control Room.cmd opens the same overview. Start 3D Simulation.cmd opens the complete installation walkthrough.

If the page was already open during an update, refresh it. The local address is http://127.0.0.1:8765/?view=system.

## Smart Lighting: see the core idea
**Full screen:** choose a scenario, then press **Full screen demo** above the 3D store. Only the simulation fills the screen. Orbit, zoom and component inspection remain available. Use **Exit full screen** or Escape to return. The same control is available in Security → Store walkthrough and the complete 3D simulator. Presenter view is a separate dashboard layout.

**Owner savings:** the large green cards compare the current brightness with always-on lighting, including assumed system overhead. Open **Adjust example price & opening hours** to change the dummy LKR price, hours/day or days/month. The monthly/yearly figures assume the current brightness pattern continues, rather than extrapolating measured occupancy. The default one-customer example shows 69W net saving, 24.84kWh/month and LKR 7,452/month (LKR 89,424/year) using LKR 300/kWh, 12h/day and 30 days/month. The always-on example costs LKR 19,440/month; adaptive lighting plus overhead costs LKR 11,988/month. Taxes, installation costs and other charges are excluded. Costs are illustrative and not a real tariff or guarantee.

1. Select **Smart Lighting**, then **Presenter view**.
2. Choose **One customer in A2**. The simulated camera map shows one person in A2. A2 reaches 100%; A1 and A3 stay at the configured dim setting (30% by default). The customer and bright aisle are visible in the 3D store.
3. Try A1 and A3. These buttons start separate stationary examples with the empty aisles already dimmed.
4. Choose **Play aisle-to-aisle journey** to see actual transitions over about 55 seconds. The shopper enters A1, walks through the front passage to A2, then A3, then leaves. The newly occupied aisle brightens immediately. The old aisle waits for the configured empty delay, then fades. Briefly, both may be bright during that delay; this prevents flicker.
5. Empty aisles, Stationary shopper and Input failure are additional checks. Input failure returns lighting to safe normal brightness. The front circulation/checkout space is separate from the three illustrated aisle zones.
6. Exit Presenter view, open **Lighting circuit**, and select A1/A2/A3. Each circuit shows that aisle's own state.

The camera-zone map in this walkthrough is simulated. Real recorded-video inference is available in Video analysis and currently supports one calibrated zone. Do not describe the animated shopper as computer-vision evidence.

## Security: see the response
**9 November update:** Security now opens **Camera & alert**. Choose **Play security sequence** for the labelled camera illustration with a pose outline, highlighted regions, event sequence and staff alert card. **Normal-shopping comparison** runs the ordinary authored sequence without a security event. **Analyse recorded sample** runs genuine local pose inference and the neutral region-entry rule directly from this screen. Large numbers show response level, current person observation, queue count and measured model time (or authored scene time). Open **Show the details judges may ask** for model/rule settings, or read SECURITY_MODEL.md.

**Store walkthrough** keeps the rotatable store and relevant existing-shop/software components. **Detection flow** opens the animated 2D security path. The security store no longer contains decorative proxy boxes for the network, phone, archive or lighting controller. Smart Lighting retains its own dedicated demonstration.

Choose **Play security sequence** on the camera desk, or **Run security story** inside Store walkthrough. The labelled authored story progresses from Watch to Assist at about 8 seconds and Verify at about 14 seconds. Open the current event and inspect its reason or save a review decision. Escalate is explained as a planned staff process, not automatically executed.

The real Video analysis pipeline remains available separately. Its demonstrated rule is a neutral zone-entry observation with an automatic clip. Real concealment accuracy remains unvalidated.

## Clear 2D flow
Select **2D system flow**. A shared camera input branches into Security review and Smart lighting. Choose a path and press **Play step by step**. Every 3.5 seconds the next numbered node becomes active; the outgoing arrows move. Pause, previous, next and restart controls allow manual explanation. The final step stops automatically. Clicking a node selects that step; Look inside opens the component details.

Flow playback explains the architecture and does not trigger detections or change the running store scene. The displayed brightness values still come from the working controller.

## 3D controls and implementation boundary
Drag the store to rotate, scroll to zoom, hover to highlight and click to inspect. The complete 3D simulator contains all 12 components. Dedicated service views show fewer hotspots to reduce clutter. Cutaways show generic planned hardware and logical software components; no physical circuit is connected.

This is a local demonstration edition packaged around business tasks. It does not include live CCTV integration, authenticated staff roles, production deployment or measured electricity savings. All saved reviews and previous clips remain available.

The earlier recorded security backup in presentation/ is retained as a fallback from the first visual version. It does not show this revised interface. The script is intentionally unchanged until requested.
