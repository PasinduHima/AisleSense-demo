# AisleSense · Live Demo Script

**Team Everguard · GreenEXE 4.0 · 17 minutes, strict**
Speakers: **Kisara** (12 min) and **Pasindu** (5 min)

How to read this script:

- **SCREEN** lines say what to show and click. Times in brackets are the clock for the whole demo.
- Lines in a quote block (starting with `>`) are the **spoken words**. Everything else is for you, not for the audience.
- `[FILL IN]` marks a detail the app does not contain. Decide it before the day, or skip the sentence.
- Numbers in this script come from the app. Energy and money figures are the app's **illustrative example** (a dummy price of LKR 300 per kWh). Always say "example" when you quote them.

| # | Time | Speaker | Part | Tab |
|---|------|---------|------|-----|
| 1 | 0:00–3:00 | Kisara | Introduction + Business Overview | Business overview |
| 2 | 3:00–8:00 | Kisara | Security | Security |
| 3 | 8:00–13:00 | Pasindu | Smart Lighting | Smart Lighting |
| 4 | 13:00–16:00 | Kisara | 3D Simulator | 3D simulator |
| 5 | 16:00–17:00 | Kisara | Closing | Business overview (bottom of page) |

The sidebar tabs, in order: **Business overview, Security, Smart Lighting, 3D simulator, Operations, Video analysis, Lighting circuit, Demo evidence.** The script uses the first four.

---

## Part 1 — Kisara — Introduction + Business Overview — 0:00–3:00

**Spoken words: 333 (about 111 a minute, leaving time for scrolling).**

**SCREEN**

- **[0:00]** Business overview tab, top of the page. The dark green hero is showing: "You can't watch every aisle. Your cameras can."
- **[0:35]** Point at the big number on the right: **38.3%** lighting power saved in our example.
- **[0:55]** Scroll down to **"Stock walks out. Lights burn over empty aisles."** (three cards).
- **[1:25]** Scroll to **"How AisleSense works, in four steps"** and the four response levels under it.
- **[2:00]** Scroll to **"When does it pay for itself?"** (the calculator). Do not type; just point.
- **[2:30]** Scroll to **"The AisleSense package"** (three plan cards; "Complete store" is marked Recommended).

**SAY**

> Good morning. Imagine you own a supermarket. You have eight aisles and one security guard. He can watch one aisle at a time. While he is watching aisle two, someone in aisle six puts a product into a bag and walks out. You find out weeks later, at stock-take.
>
> And all day, every light in the store burns at full power, even over aisles with nobody in them.
>
> We are Team Everguard. I am Kisara, and this is Pasindu. [FILL IN: university or organisation.]
>
> This is AisleSense. In one sentence: AisleSense uses the CCTV cameras you already own to help your staff spot suspicious behaviour, and to dim the lights over empty aisles.
>
> One camera network. Two smarter store services.
>
> Look at this number. In our example, with one aisle in use and two empty, lighting power drops by thirty-eight percent. I will be honest: that is an illustrative example, not a measured bill. Pasindu will show you where it comes from.
>
> Here is the problem in three cards. Your guard cannot be everywhere. You find the loss only later. And you pay for full lighting all day.
>
> Here is our answer, in four steps. One: your existing CCTV sends video to a computer inside your store. Two: the AI follows body movement. It does not recognise faces. Three: suspicious behaviour goes to staff as an alert, with the footage and a clear reason. Four: a person decides. The system never accuses anyone.
>
> Alerts have four response levels: Watch, Assist, Verify and Escalate. They tell staff what to do next. They are not a verdict.
>
> This is a savings calculator. A store owner types in their own stock loss, their own electricity bill and their quotation, and sees how many months until the system pays for itself. The numbers on screen now are example starting values only.
>
> And this is the package. Security alone, Smart Lighting alone, or the complete store on one camera network. [FILL IN: prices, or say "pricing is confirmed after a free store assessment".]

**Handover (to the next part, same speaker)**

> That is the idea. Now let me show you the security side working.

---

## Part 2 — Kisara — Security — 3:00–8:00

**Spoken words: 544 (about 109 a minute).** The demo scenario is played at **half speed (0.5×)** here, so it lasts about 1 minute 45 seconds and you can describe each moment as it happens. **Set the speed back to 1× before you hand over.**

**SCREEN**

- **[3:00]** Click **Security** in the sidebar. The "Camera & alert" view opens.
- **[3:05]** Point at the strip of three boxes: **Already in the shop → AisleSense adds → Staff keep control**.
- **[3:25]** On the dark control bar, click **0.5×**. Then click the green **Run demo scenario** button. Scroll so the dark **camera view** fills the screen.
- **[3:30–3:55]** Shoppers walk in. Each person gets a faint green skeleton, a box and a label such as "ID S03 · 0.93 · NORMAL".
- **[3:56]** The banner turns to **LEVEL 1 · LOW RISK**. One shopper's box turns yellow.
- **[4:12]** **LEVEL 2 · MEDIUM RISK**. The box turns orange and "BAG-AREA MOTION" appears.
- **[4:29]** **LEVEL 3 · HIGH RISK**. The view switches to **CAM 03** at the exit. The guard walks over.
- **[4:37]** The guard speaks with the shopper.
- **[4:40]** Point at the alert card on the right (**WHAT STAFF RECEIVE**, showing **L3**), then at the six numbered steps under the camera.
- **[5:10]** Click **Open evidence & review**. The review window opens with the timed list of what happened. (The scene finishes by itself at about 5:15.)
- **[5:40]** Type a short note (for example "Guard spoke to shopper"), then click **Confirm event**. Close the window. Step 06 "Staff reviewed" turns green.
- **[6:15]** Scroll down to **"What model are we using?"** (MediaPipe Pose Landmarker Lite).
- **[7:00]** Scroll back up to the camera view. Click **CAM 01**, then **AUTO**.
- **[7:45]** Click **1×** on the control bar so the next part runs at normal speed.

**SAY**

> This is the Security workspace. Notice these three boxes first. What is already in the shop: your CCTV and your local network. What AisleSense adds: analysis and review software. And who stays in control: your staff.
>
> I am going to run one scenario. I want to be clear before I press play. This is a scripted scene in our simulated store. It shows how the system behaves. It is not live AI on a real camera.
>
> Here we go, at half speed so you can follow it. Shoppers come in. Each person gets a faint green skeleton on the body joints: head, hands, feet. No face. No name. Just an ID number.
>
> Most of them are normal shoppers. They pick an item and go to the checkout. Their label says Normal, and nothing happens. A system that alerts on everybody is useless.
>
> Now watch this shopper. He stays at one shelf and keeps looking around. Level one, low risk. Nobody is disturbed. The cameras simply keep watching, and the aisle light is boosted so the footage is clearer.
>
> He picks an item. And now it goes into the bag. Level two, medium risk. Floor staff get an alert with the clip.
>
> He walks past the checkout without stopping. Level three, high risk. The alert goes to the guard, and the guard walks to the exit.
>
> Look at what happens next. The guard speaks with the shopper. A person, not a computer.
>
> On the right is what staff receive. The level, what was seen, which zone, and the evidence. Under the camera you can follow the whole story in six steps, from lingering to staff review.
>
> Let me open the evidence. Here is the timed record of what the system saw, step by step. The staff member can write a note and choose: confirm the event, false alarm, or need more information.
>
> I will confirm it. That decision is saved, with the time and the note. If the system was wrong, staff press False alarm, and that is saved too. Confirming an event records what staff judged. It does not label anyone a thief.
>
> So this is our rule: the AI points, the human decides. No false accusations from a machine.
>
> A word on privacy. The video is analysed on a computer inside the store. Nothing here needs a cloud account or the internet. And we do not do face recognition.
>
> What is under the hood? The model is MediaPipe Pose Landmarker Lite. It is small enough to run on this laptop. On top of it we use simple timed rules: where is the wrist, how long does it stay there, and in what order.
>
> We also want to be honest about limits. On real recorded video, the pose detection and the review workflow are working today. Our shelf-to-bag rule is still experimental. It has not been tested on enough real footage, so we do not claim a theft-detection accuracy yet.
>
> One more thing. Staff can choose a camera, or leave it on Auto, and the view follows the person of interest from aisle to aisle.

**Handover (to Pasindu)**

> So that is how AisleSense protects your stock. But the same cameras can do a second job. Pasindu will now show you how they also cut your electricity bill.

---

## Part 3 — Pasindu — Smart Lighting — 8:00–13:00

**Spoken words: 533 (about 107 a minute).** The aisle-to-aisle journey runs for about 38 seconds; talk over it.

**SCREEN**

- **[8:00]** Click **Smart Lighting** in the sidebar. Heading: "Light follows presence."
- **[8:20]** In the left panel, click **One customer in A1**. Wait two seconds. In the 3D store, A1 turns bright and A2 and A3 stay dark. Their signs read 100%, 30%, 30%.
- **[8:40]** Scroll up a little to the green savings panel, **"Empty aisles use less. Your store spends less."** It now reads **69.0 W** saved, **38.3%** less power, **24.84 kWh** a month and **LKR 7,452** a month (**LKR 89,424** a year). Below it: always-on **LKR 19,440/month** → adaptive **LKR 11,988/month**.
- **[9:30]** Click **One customer in A2**, then **One customer in A3**. Each time only that aisle is bright.
- **[9:55]** Click **Play aisle-to-aisle journey**. Scroll so the 3D store and the **Camera zone view** are both visible.
- **[10:00–10:35]** The customer walks in, goes down A1, along the back wall, up A2, across the front, into A3 and out at the exit. He stops for one second in each aisle. Each aisle brightens when he enters and dims about five seconds after he leaves.
- **[10:40]** The status line reads "Lighting journey complete · all three aisles empty and dimmed".
- **[11:00]** Under the 3D store, click **Input failure**. After four seconds all three aisles go to 100% and the cards read "Input unavailable".
- **[11:40]** Click **Stationary shopper**. A2 stays at 100% while the person stands still.
- **[12:10]** Back at the savings panel, open **"Adjust example price & opening hours"** and point at the three inputs.

**SAY**

> Thank you, Kisara. I am Pasindu, and I will show you the green side of AisleSense.
>
> Think about a supermarket at two in the afternoon. A few customers. Many empty aisles. And every single light at full power. That is wasted energy, and you pay for it.
>
> AisleSense fixes this with the cameras you already have. The camera sees where people are. The lights follow.
>
> Let me put one customer in aisle one. Look at the store. Aisle one is bright. Aisles two and three are dimmed to thirty percent. Not off. Dimmed. The store still looks open and safe.
>
> Now look at the numbers. With one aisle in use, we save sixty-nine watts. That is thirty-eight percent less lighting power, and that already includes the fifteen watts our own system uses.
>
> If that pattern continued for a month, the example saving is about twenty-five units of electricity. At our example price, that is seven thousand four hundred rupees a month, or about eighty-nine thousand rupees a year. This is for a small three-aisle store.
>
> I must be clear. This is an example with a dummy price of three hundred rupees a unit. It is an estimate from a simple model, not a measured bill.
>
> Customer in aisle two. Only aisle two is bright. Aisle three. Only aisle three. Each aisle makes its own decision.
>
> Now watch a customer walk through the whole store.
>
> He comes in. Aisle one brightens the moment he enters. He never waits for the light.
>
> He moves to aisle two. Aisle two is bright. And look at aisle one behind him. It waits five seconds, then fades down smoothly. That short delay stops the lights from flickering when someone steps out for a moment.
>
> Aisle three. Same again. And when he leaves, the whole store settles back to dim.
>
> On the left you can see what the camera reports for each zone: one person detected, or zero. That one simple signal drives the light.
>
> What if the camera fails? Watch. I switch off the input. The system does not guess. All lights go to full brightness. Safety comes first, savings second.
>
> And what if a customer stands still, reading a label? The light stays on. We detect presence, not movement, so nobody is left in the dark.
>
> The lighting also helps security. You saw it in Kisara's demo. When someone is flagged, that aisle goes to full brightness with a cooler white light. We call it evidence boost. Better light means clearer footage for staff to review.
>
> A store owner can change the price per unit, the opening hours and the days per month here, and see their own estimate.
>
> Why does this matter for GreenEXE? Because the greenest unit of electricity is the one you never use. We add no new sensors. No extra devices in every aisle. We reuse the cameras that are already on the ceiling.
>
> One honest note. In this demo the lights are simulated. The controller logic is real and tested, but the physical lighting hardware is our next step.

**Handover (to Kisara)**

> You have seen security, and you have seen lighting. Now Kisara will show you how all the parts fit together inside one store.

---

## Part 4 — Kisara — 3D Simulator — 13:00–16:00

**Spoken words: 320 (about 107 a minute, leaving time for clicks).**

**SCREEN**

- **[13:00]** Click **3D simulator** in the sidebar. Then click the small **panel button at the left of the top bar** to hide the sidebar. Scroll so the 3D store fills the screen.
- **[13:15]** On the bar over the store, click **Run demo scenario**. View: **Overview**.
- **[13:30]** Click **Top-down**.
- **[13:45]** Click **Aisle**.
- **[14:00]** Click **CCTV**.
- **[14:15]** Click **Overview**. Point at the top of the store: the risk banner, the five-step alert flow, and the **"% lighting energy saved"** chip on the right.
- **[14:40]** Click the round **01** marker on the ceiling camera (or the **CCTV camera** button under "The connected parts"). The cutaway panel opens. Click **Explode parts** once.
- **[15:10]** Close the panel (X or Esc). Click **2D system flow** on the toolbar above the store.
- **[15:40]** Click **3D store** to go back.

**SAY**

> This is the whole store in one view. Everything you saw in the last two parts is running here together, from the same system.
>
> I will hide the menu to give us more room, and start the full scenario again.
>
> You can look at the store from any angle. This is the overview. This is top-down, like a floor plan. You can see which aisles are lit and which are dimmed.
>
> This is the aisle view, at eye level, the way a shopper sees it.
>
> And this is the view from the CCTV camera's position.
>
> Back to the overview. Along the top you can follow the alert flow as it happens: camera and pose, risk scored, alert to staff, guard responds, human decision. And on the right, the lighting energy saved so far in this run.
>
> The numbered markers are the parts of the system. There are twelve. The CCTV camera. The local network. The AisleSense engine. The shelf, the checkout and the exit zone. Staff review and the evidence store. Then the lighting side: the controller, the dimming driver, the aisle lights and the power supply.
>
> Let me open one. This is the camera. You can rotate it, pull the parts apart, and read what each layer does. Every part has a panel like this, with a plain explanation.
>
> If you prefer a diagram, this is the same system as a 2D flow. The camera feeds the engine. The engine sends events to staff review, and occupancy to the lighting controller. One input, two services.
>
> I want to be straight about what is real here. The software, the review workflow and the lighting logic are running. The hardware you see, the controller and the driver, is a planned design shown as a simulation. Nothing physical is wired up yet.
>
> But this is exactly how it would sit in a real supermarket.

**Handover (to the closing, same speaker)**

> Let me finish with where this goes next.

---

## Part 5 — Kisara — Closing — 16:00–17:00

**Spoken words: 117.**

**SCREEN**

- **[16:00]** Click the **panel button** in the top bar to show the sidebar again. Click **Business overview**.
- **[16:05]** Scroll to the very bottom: the dark green block **"See what AisleSense would do in your store."** Leave it on screen until the end.

**SAY**

> So, what did you see today?
>
> One camera network doing two jobs. Security that helps your staff see what they would miss, with a human making every decision. And lighting that follows your customers and stops wasting power on empty aisles.
>
> What comes next? Three things. Connecting to live CCTV. Building the physical lighting controller. And testing our detection rules on real store footage, with permission, so we can give you a measured accuracy.
>
> For a store owner in Sri Lanka, this means less stock walking out of the door, and a smaller electricity bill, from equipment you already own.
>
> You can't watch every aisle. Your cameras can.
>
> Thank you. We are happy to take your questions.

---

## Quick cue sheet (keep beside the laptop)

| Time | Who | Tab | Key action |
|------|-----|-----|------------|
| 0:00 | Kisara | Business overview | Hero on screen. Opening story. |
| 0:35 | Kisara | Business overview | Point at **38.3%**. Say "example". |
| 0:55 | Kisara | Business overview | Scroll: problem cards. |
| 1:25 | Kisara | Business overview | Scroll: four steps + four response levels. |
| 2:00 | Kisara | Business overview | Scroll: payback calculator. Do not type. |
| 2:30 | Kisara | Business overview | Scroll: three plans. |
| 3:00 | Kisara | **Security** | Three boxes: shop / AisleSense / staff. |
| 3:25 | Kisara | Security | Click **0.5×**, then **Run demo scenario**. Scroll to camera view. |
| 3:56 | Kisara | Security | Level 1 (yellow). |
| 4:12 | Kisara | Security | Level 2 (orange), item into bag. |
| 4:29 | Kisara | Security | Level 3 (red), CAM 03, guard walks over. |
| 4:40 | Kisara | Security | Alert card + six steps. |
| 5:10 | Kisara | Security | Click **Open evidence & review**. |
| 5:40 | Kisara | Security | Type note, click **Confirm event**, close. |
| 6:15 | Kisara | Security | Scroll: model card. Privacy and limits. |
| 7:00 | Kisara | Security | CAM 01 → AUTO. |
| 7:45 | Kisara | Security | **Click 1×.** Hand over. |
| 8:00 | Pasindu | **Smart Lighting** | Open tab. |
| 8:20 | Pasindu | Smart Lighting | Click **One customer in A1**. |
| 8:40 | Pasindu | Smart Lighting | Savings panel: 69 W, 38.3%, LKR 7,452. |
| 9:30 | Pasindu | Smart Lighting | **One customer in A2**, then **A3**. |
| 9:55 | Pasindu | Smart Lighting | Click **Play aisle-to-aisle journey** (38 s). |
| 11:00 | Pasindu | Smart Lighting | Click **Input failure** (wait 4 s). |
| 11:40 | Pasindu | Smart Lighting | Click **Stationary shopper**. |
| 12:10 | Pasindu | Smart Lighting | Open "Adjust example price & opening hours". Hand over. |
| 13:00 | Kisara | **3D simulator** | Hide sidebar. Scroll to store. |
| 13:15 | Kisara | 3D simulator | Click **Run demo scenario**. |
| 13:30 | Kisara | 3D simulator | **Top-down** → 13:45 **Aisle** → 14:00 **CCTV** → 14:15 **Overview**. |
| 14:40 | Kisara | 3D simulator | Click marker **01** (camera). **Explode parts**. |
| 15:10 | Kisara | 3D simulator | Close. Click **2D system flow**. |
| 15:40 | Kisara | 3D simulator | Click **3D store**. |
| 16:00 | Kisara | Business overview | Show sidebar. Scroll to the bottom block. |
| 16:50 | Kisara | Business overview | "Thank you. We are happy to take your questions." |

**If you are running late:** in Part 2 skip the model card (6:15) and say only the privacy sentence. In Part 3 skip Stationary shopper. In Part 4 skip the 2D system flow.

---

## Backup plan

| If this happens | Do this | Say this |
|-----------------|---------|----------|
| The 3D view is slow or jerky | Keep going. Leave the speed buttons alone. If it is very slow, switch to the **Top-down** view, which is lighter. | "The store is drawn live on this laptop, so let me use the simpler view." |
| A scenario does not start | Click the button once more. If it still does not start, click the round **reset arrow** next to it, then the button again. | "Let me restart that scene." |
| The camera view on Security is blank | Click **Store walkthrough** at the top of the Security page; the same scenario plays in the 3D store. | "Here is the same scene in the store view." |
| The page says "Local service unavailable" | The server has stopped. Double-click **Start Business Dashboard.cmd**, wait for "Ready", press **Ctrl+R** in the browser. About 15 seconds. The other speaker keeps talking (see filler lines below). | "We are restarting the local system. Everything runs on this laptop, with no internet." |
| The browser crashes or freezes | Reopen the browser and go to `http://127.0.0.1:8765/?view=system`. | Same as above. |
| The laptop cannot recover | Open the screenshots in the `evidence` folder and talk through them. There is also a recorded video in the `presentation` folder, but it shows an **older version of the interface**, so say so. | "This is a recording of an earlier build. The flow is the same." |
| A number on screen differs from the script | Read the number on the screen. | "As you can see here, the example shows…" |

**Filler lines for the other speaker during a restart (about 20 seconds):**

> While that restarts: everything you are seeing runs on this one laptop. No cloud account and no internet connection. That is a design choice. A store's camera video should stay inside the store.

**Never do these on stage:** do not open Demo settings (applying it resets the scene), do not press the 2× speed button (the Security timings assume 0.5× and every other part assumes 1×; the speed setting carries over between tabs), and do not use "Analyse recorded sample" unless you rehearsed it (it takes about 12 seconds to finish).

---

## Pre-demo checklist

**The night before**

- [ ] Laptop fully charged, and the **charger in the bag**. Run the demo plugged in; the graphics are slower on battery.
- [ ] Rehearse the whole 17 minutes once with a timer, on the same laptop.
- [ ] Decide every `[FILL IN]` item (list at the end).

**30 minutes before**

- [ ] Plug in the charger. Connect the projector and set it to **duplicate** the screen.
- [ ] Close every other program and every other browser tab. Turn off notifications.
- [ ] Double-click **Start Business Dashboard.cmd**. Wait for "Ready". **Keep the small black launcher window open** (you can minimise it).
- [ ] Internet is **not** needed. Turn Wi-Fi off if you like; the demo still works.
- [ ] Browser zoom at **100%** (Ctrl+0). Press **F11** for full screen.
- [ ] Sidebar is **showing** (the panel button at the left of the top bar toggles it).
- [ ] Click through the four tabs once so each has loaded: Business overview, Security, Smart Lighting, 3D simulator.
- [ ] On Security, click the round **reset arrow** so no old scene is running. Speed shows **1×** (Kisara switches to 0.5× on stage and back to 1× before handing over).
- [ ] On Security, the camera picker is on **AUTO**.
- [ ] On 3D simulator, the view preset is **Overview**.
- [ ] Finish on the **Business overview** tab, scrolled to the top.
- [ ] A printed copy of the cue sheet beside the laptop. A phone timer in front of the speaker.

**Who clicks:** the person speaking operates the laptop. At each handover, step aside and let the next speaker take the mouse.

---

## Likely judge questions

**1. How accurate is the theft detection?**

> We do not have a measured accuracy yet, and we will not invent one. What works today is the pose detection on real recorded video, the timed rules, the alert and the staff review. The shelf-to-bag rule is still experimental. Our next step is to test it on real store footage, recorded with permission. Until then, a person reviews every alert.

**2. What about privacy? Are you recording and identifying customers?**

> We do not recognise faces or identities. The system looks at body position and movement, and each person is only an ID number. The video is analysed on a computer inside the store, with no cloud account. This demo has no user accounts or access control yet, so those are things we would add before a real installation.

**3. What happens if the AI gets it wrong?**

> Nothing happens automatically. The alert goes to staff with the footage and the reason. Staff can mark it as a false alarm, and that decision is saved. The response levels tell staff what to do next. They are not an accusation.

**4. Are the energy savings real?**

> They are an estimate from a simple model, not a meter reading. The example assumes sixty watts per aisle, fifteen watts for our system, twelve hours a day, and a dummy price of three hundred rupees a unit. With one of three aisles occupied, that gives thirty-eight percent less lighting power. A store owner can change the price and the hours on screen. Real savings depend on how busy the store is.

**5. Does it work with the cameras a shop already has?**

> That is the design: reuse a compatible CCTV feed and the shop network, with no extra sensors in the aisles. Today the demo analyses recorded video. The live camera connection is not built yet. It is the first item on our roadmap.

**6. What does it cost, and who pays for it?**

> [FILL IN: pricing and business model.] If you have not decided: "We have three packages: Security, Smart Lighting, or both on one camera network. We confirm the price after a free store assessment, because it depends on the number of aisles and cameras."

**7. Which AI model do you use, and why?**

> MediaPipe Pose Landmarker Lite. It gives thirty-three body landmarks and it is light enough to run on an ordinary laptop, about twenty milliseconds per frame in our test. That keeps the video inside the store. A detector like YOLO is a possible alternative later, but it is not what runs in this build.

**8. What hardware does the lighting need?**

> A small controller, a dimming driver for each aisle circuit, and dimmable LED lights. In this demo that hardware is simulated. The control logic is real and tested: a five-second delay before dimming, a smooth fade, and full brightness if the camera input is lost.

---

## [FILL IN] items to complete before the day

| # | Where | What is needed |
|---|-------|----------------|
| 1 | Part 1, introduction | Your university or organisation, and any roles you want to mention. |
| 2 | Part 1, plans | Plan prices, or use the fallback line ("confirmed after a free store assessment"). The page itself shows "Price to be confirmed". |
| 3 | Question 6 | Pricing and business model (one-time, monthly, or both). |
| 4 | Business overview page (not spoken) | Contact email and phone, installation time, support hours and pilot offer still show as placeholders on the page. Judges may see them when you scroll. |
| 5 | Optional, Part 1 | A real statistic on retail stock loss, with its source, if you want one in the opening. The app has none, so the script uses a story instead. |
