# Weblink on LG webOS — recommendations

Prepared for the client. Covers what the TV build already does, and what we
recommend next to make it feel like a product built for a television rather than
a phone app on a big screen.

Effort is rough developer time, not calendar time.

---

## 1. Already in place

Worth stating, because most of it is invisible when it works.

| | |
|---|---|
| **Remote-control navigation** | Arrow keys move focus spatially — the app picks the control that is actually in that direction, not the next one in the DOM. Focus is trapped inside dialogs so it cannot wander behind them. |
| **Back button** | The remote's Back closes an open dialog first, then pops one screen, then exits the app — the behaviour LG expects. |
| **Ten-foot scale** | The whole UI is scaled 1.5× for sofa viewing, using a layout-level zoom so text is re-rendered sharp rather than stretched. |
| **Cash-only ordering** | Online payment is hidden on TV; orders are placed directly as cash on delivery with no extra confirmation step. |
| **Phone-only features hidden** | The Quick Calls row is not shown — its actions dial a phone number, which a TV cannot do. |
| **On-screen error reporting** | If something fails, the TV shows the actual error instead of a black screen. This is a development aid and should be reviewed before public release (see §5). |
| **Old-browser support** | TVs run a much older browser than phones. Compatibility polyfills are bundled, which is what fixed the crashes on Food, Facilities and Services. |

---

## 2. Recommended — correctness

These are defects or omissions we found, not opinions.

| # | Recommendation | Why | Effort |
|---|---|---|---|
| 2.1 | **Fix the tab bar height on TV** | The code asks React Native whether it is on a TV, but that check is always `false` on webOS. The TV currently gets the 64px phone tab bar instead of the intended 84px, making the bottom row harder to hit with a remote. One-line fix. | 15 min |
| 2.2 | **Handle the app being backgrounded** | There is currently no handling for the guest switching TV input or opening another app. The live connection and the order-status polling keep running indefinitely on a device that is powered on for days. Should pause on hide and reconnect on return. | 0.5 day |
| 2.3 | **Drop the unused animation library from the TV build** | A 168-module animation library is still bundled. It fails to initialise on webOS and is silently swallowed, so nothing can safely use it. It is dead weight and a trap for the next developer. | 0.5 day |

---

## 3. Recommended — TV user experience

Ordered by how much a guest would notice.

| # | Recommendation | Why | Effort |
|---|---|---|---|
| 3.1 | **Minimise typing** | Text entry with a remote is the single worst part of any TV app. Login, search, coupon codes and feedback all currently require it. Suggested: stay signed in between sessions, and log in by room number + short PIN, or a QR code the guest scans with their phone. | 1–3 days depending on approach |
| 3.2 | **Set the starting focus on every screen** | Today the first arrow press picks whatever element happens to be first. Each screen should decide what is highlighted on arrival, so the guest always sees where they are. | 1 day |
| 3.3 | **Replace pull-to-refresh** | Pull-to-refresh cannot be performed with a remote at all. Where it is the only way to refresh, add a visible Refresh button. | 0.5 day |
| 3.4 | **Audit focus visibility** | Every control a guest can reach must visibly light up. We already found one — the dashboard's three-dot menu — that was reachable but drew no highlight. A full pass is worth doing. | 0.5 day |
| 3.5 | **Return to the dashboard when idle** | Hotel TVs are shared and guests walk away mid-task. After a few minutes of no input, return to the dashboard so the next person starts from a clean state. | 0.5 day |
| 3.6 | **Check for overscan clipping** | Some TVs crop the edges of the picture. The app currently insets content by 24px; older panels can crop closer to 50px. Needs checking on the actual models in the hotel. | Testing only |
| 3.7 | **Review horizontal rows** | Side-scrolling rows are natural with a finger and awkward with a remote. Worth confirming each one steps predictably left/right. | 0.5 day |

---

## 4. Recommended — because it lives in a hotel room

| # | Recommendation | Why | Effort |
|---|---|---|---|
| 4.1 | **Protect against screen burn-in** | The app can sit on screen for hours. On OLED panels, static bright areas — the header and tab bar in the light theme — can permanently mark the screen. Recommend dimming or a screensaver after inactivity. | 0.5 day |
| 4.2 | **Clear the session at checkout** | The next guest must not see the previous guest's name, room, orders or feedback. Needs a defined trigger — checkout from the hotel system, or a housekeeping reset. | Needs a decision first |
| 4.3 | **Decide the behaviour when the network drops** | Hotel Wi-Fi is unreliable. The app should say so plainly rather than appearing broken. | 0.5 day |

---

## 5. Before going live

| # | Recommendation | Why |
|---|---|---|
| 5.1 | **Agree the distribution route** | The current install works because the TV is in Developer Mode, which **expires roughly every 50 hours**. That is fine for development and unusable in a hotel. Production needs either LG Content Store publication or an LG commercial/hospitality deployment (Pro:Centric). Both involve LG certification and lead time, and should be started early — this is the single biggest schedule risk. |
| 5.2 | **Confirm the exact TV models** | webOS versions ship very different browser engines. Our compatibility target is a 2018-era browser; older models may need more. This must be tested on the real hardware in the hotel, not only on the development set. |
| 5.3 | **Review the on-screen error display** | Showing a technical error is right during development but wrong for a guest. Recommend keeping the safety net but replacing the message with something friendly and reporting the detail somewhere the hotel can see it. |
| 5.4 | **Version discipline** | Each release must increment the version in the app manifest, or TVs may not recognise it as an update. |

---

## 6. Known platform limits

Not fixable in the app — stated so expectations are set.

- **webOS gives web apps a 1920×1080 surface.** On a 4K television the TV upscales that. Some softness is unavoidable; larger, heavier text is the practical mitigation and is already applied.
- **The TV's own picture settings affect sharpness.** Sharpness and any energy-saving or motion-smoothing modes change how the app looks and are outside the app's control.
- **A television has no haptics and no touch.** Every interaction has to be legible visually, at distance, with a five-button remote.

---

## 7. Suggested order of work

1. §2 correctness fixes — small, and 2.2 matters on an always-on device.
2. §3.1 typing and §3.2 starting focus — the two the guest feels most.
3. §5.1 distribution route — start the LG conversation early, it gates launch.
4. §4 hotel-specific behaviour, once the client has decided the checkout trigger.
5. Remaining §3 polish.
