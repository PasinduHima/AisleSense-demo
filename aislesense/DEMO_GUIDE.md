# AisleSense final-round walkthrough · Everguard

Prepared 8 November 2026 for the 11 November final. Presenters: you and Pasindu. Wear the black blazers requested by the competition.

## Open and operate

1. Double-click **Start 3D Simulation.cmd**. The prepared application opens locally; keep its launcher window open.
2. Choose **Presenter view** to hide dashboard navigation. Drag the store to rotate, scroll to zoom, and use Change store viewpoint for the overhead angle.
3. Hover a numbered component or its 3D object: the object enlarges and a short signal path appears. Click it to pin the detailed panel.
4. Rotate the cutaway. Choose a numbered layer, or use **Assemble parts / Explode parts**. Read the short explanation at the bottom when practising.
5. **Locate in 2D flow** shows its place in the system. Every node opens its corresponding panel. The supply has a separate power path.
6. **Guided tour** provides seven steps. Next/previous steps are under your control; scenes continue until you pause or change them. **Pause story** is useful while explaining.
7. For the working dashboard, leave Presenter view and select **Control room** or **Video analysis**. Alternatively open **Start Control Room.cmd**. Both launchers use the same local system and saved history.
8. Escape closes a component panel; Escape outside a panel leaves Presenter view. You can use the component buttons below the store instead of aiming at a hotspot.

The 12 components are CCTV, local network, analysis engine, shelf/shopper, checkout, exit, staff review, evidence storage, virtual ESP32, driver, aisle light and supply/measurement. Hardware illustrations show the planned architecture, not equipment physically assembled by the team.

## Easy four-minute script

### You — introduction and security story

“We are Team Everguard. This is AisleSense. Last round you asked for a working system. Today, we can run the workflow and show its outputs.”

[Open Presenter view. Hover the camera, then click it.]

“One camera view supports two jobs: staff review and smarter lighting. Here is the planned camera path: lens, sensor, video processing and the local network.”

[Close the panel. Open the AisleSense engine, then show 2D system flow.]

“The software reads the images and looks for visible movement. This flow shows the two paths: an event can go to staff review, while occupancy controls the lights.”

[Return to 3D store. Run Concealment story. At 8 seconds Assist appears; at 14 seconds Verify appears.]

“This scripted scene explains the security response. The shopper picks an item, places it in a bag and approaches the exit. AisleSense asks staff to review the sequence.”

[Pause story. Open the current-session event, enter a short note and choose Need more.]

“The staff member sees the reason and saves a decision. The system does not make an accusation.”

### Pasindu — green technology and real input

[Close review. Run Empty aisles. Wait about seven seconds. Open Aisle lighting, then Virtual ESP32 and Dimming driver.]

“When an aisle is empty, a short delay starts. The light then dims. When someone enters, it becomes bright again. A stationary shopper also keeps the light on.”

“The virtual controller and the store use the same state. This is the planned hardware path: controller, dimming driver and LED. The light has a separate power supply.”

[Show the energy counter or power component.]

“The counter estimates the difference between always-on lighting and adaptive lighting. The power assumptions and system overhead are visible.”

[Leave Presenter view. Open Video analysis. Select normal-shopping.mp4 and Zone entry · movement test. Click Analyse video.]

“Now this is real recorded footage processed on this laptop. The model detects a person. The region rule creates an observation automatically.”

[Wait about 12–20 seconds. Open the newest recorded-video event in Review history and play its clip.]

“This clip was created by the analysis pipeline. We can review it and save our decision. It shows ordinary movement, not theft.”

### You — close

“AisleSense brings camera observations, human review and occupancy-based lighting together in one local system. We can demonstrate the complete workflow today. Representative action testing and physical energy measurement are the next validation steps.”

## Short Q&A answers

**What did you actually build?** “The interactive 3D and 2D walkthrough, local video analysis, automatic region observations and clips, saved review decisions, and connected lighting control simulation.”

**Does the animation prove that the AI detects concealment?** “The animation explains the sequence. The real video tool runs actual pose inference. Concealment recognition still needs representative evaluation.”

**What makes the idea useful?** “It combines staff review and lighting decisions around the same camera input, so the security and green-technology paths can share observations.”

**Is the circuit assembled?** “No physical circuit is connected. The cutaways show the planned components and control path. The software controller is working.”

**Can the ESP32 power the LED directly?** “No. It provides a control signal. The driver and a suitable separate supply handle the lighting power.”

**How much energy does it save?** “The display is an estimate based on the shown assumptions. Actual savings require a real installation and a power meter.”

**What if the camera fails?** “The software returns the light to normal brightness and marks presence as unknown.”

**What if the person stands still?** “Presence keeps the light bright; movement is not required.”

**Does visiting checkout prove payment?** “No. Payment verification would need a point-of-sale integration.”

**Does it use the cloud?** “This prepared demonstration runs on the laptop using cached software, model and footage. No cloud service is needed.”

**Are the reviews saved?** “Yes. Decisions and notes remain after restarting the application. Scene reset does not erase history.”

## Backup and recovery

A recorded scripted-story backup is in **presentation/AisleSense-scripted-demo-backup.mp4**. It is explicitly labelled as a recorded simulation. It is not a recording of real-video detection. The existing event clips can also be played from Review history as previously processed results.

The **Record 32s backup** button starts the concealment story and records the store canvas with a labelled status panel. Keep the 3D view open until it finishes. The WebM file downloads locally; it records this application canvas, not your desktop or microphone.

Before presenting, connect laptop power, close unnecessary heavy apps and run one complete rehearsal. If disconnected, restart with the launcher. If 3D fails in the browser, use the 2D flow and recorded backup. Do not change configurations or install updates immediately before judging.
