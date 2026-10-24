# PatchSpan

Every scrap, fitted. A phone-first web app that measures a leftover piece of fabric with the camera (using a bank card for scale) and shows which sewing pieces still fit on it, at real size.

Built for Neighborhood Hacks 2026 (Oct 16-23). All code in this repository was written during the hacking period.

## Run
Static site, no build step: serve the folder (`python3 -m http.server`) and open on a phone. Tests: `npm test` (or `node --test test/*.test.mjs`).

## How it works
Photograph the scrap next to a bank card and tap the card's 4 corners - that gives real-world scale. The app traces the scrap edge; you can drag the outline handles to correct it before fitting. A greedy packing engine (on-grain rotations first, then bias, then free angles; scanned row-wise and column-wise, best layout kept) places the pieces without overlap. Export prints a real-size cutting layout (print at exactly 100%, card coplanar with the fabric, photo from straight above). Layouts bigger than one A4 sheet split across several pages - no piece is cut across a page, pieces too big for A4 are flagged for large-format printing - and every page carries a 10 cm check bar to verify print scale with a ruler.

Docs: `docs/demo-script.md` (video plan), `docs/device-test-plan.md` (real-phone test), `docs/submission-checklist.md`, `docs/evidence-notes.md` (problem evidence).

## AI and libraries disclosure
- Code written with AI coding assistance working from the builder's direction.
- Type: system font stack (San Francisco on iPhone); no webfont downloads, so the app works fully offline.
- No other libraries. Image analysis and fitting are plain JavaScript in `src/`.
