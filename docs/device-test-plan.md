# Actual-device photo test plan (real phone + real fabric)

Goal: prove the camera pipeline works on a real photo, not only the built-in sample scene. One session, about 20 minutes. [[Owner: the user - the only step that needs their hands]]

## Where the app runs during the test
- Preferred: the public demo URL (GitHub Pages). Status: publish is PENDING approval - do not publish without the go-ahead.
- Fallback if Pages is not approved in time: on a family laptop run `python3 -m http.server 8123` in the repo folder, then open `http://<laptop-ip>:8123` on the phone (same Wi-Fi). Opening index.html directly as a file will NOT work (the browser blocks module scripts from file://).

## Setup
1. A plain table or floor (solid colour, no pattern). A bedsheet or chart paper works if the table is busy.
2. Daylight near a window, or a bright room light. No harsh shadow of the phone on the fabric.
3. 2-3 real scraps: one large (a kurta/shirt offcut), one medium, one tiny. Different colours from the table.
4. Any bank/ID/metro card (standard 8.6 x 5.4 cm).

## Test cases (note the result of each)
| # | Case | Steps | Pass if |
|---|------|-------|---------|
| 1 | Scale sanity | Photograph card + a ruler/measuring tape beside it; tap corners; trace any scrap | The app area is within ~10% of width x height measured with the ruler |
| 2 | Plain scrap, good light | Medium scrap, top-down photo | Outline hugs the fabric edge; area plausible |
| 3 | Printed/patterned scrap | Same as 2 with a busy print | Outline still correct (pattern should not confuse it) |
| 4 | Bad light / shadow | Deliberately dim or shadowed photo | App either traces OK after "Trace more/less" or fails with a clear message, not garbage |
| 5 | Outline editing | After any trace, drag 2-3 handles off and back | cm2 number updates, fit still works after editing |
| 6 | Full flow | Pick a project -> photo -> trace -> fit -> export -> save to box | No freezes; layout appears; scrap box shows the saved scrap |
| 7 | "What fits" | Use the "__any" path on a real scrap | Suggestion list with percentages appears |
| 8 | Offline | Turn on airplane mode, reload the page, repeat case 6 | App still works (service worker) |

## What to send back
- The original photos used (so the trace can be debugged), plus a screenshot of any screen that looked wrong.
- For case 1: the ruler measurement and the app's cm2 number.
- One line per case: pass/fail + what happened.

## Safety/privacy for the repo
- Test photos stay local (the app uploads nothing). Do not commit real photos with faces, documents, or house interiors to the repo.
