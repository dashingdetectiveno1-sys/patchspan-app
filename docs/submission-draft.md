# PatchSpan - Devpost submission draft v4 (complete; an optional first-hand observation from the user can still be added to the problem section - never invented)

**Project name:** PatchSpan
**Elevator pitch:** PatchSpan uses your phone camera and any standard ID-1 size card (a metro or membership card - only its size matters) as a scale reference to measure a leftover piece of fabric, then shows which sewing pieces fit on it, so small scraps become useful things instead of waste.

## What is the specific problem, and how do you know it's real?
The problem: in Ludhiana, a major textile city that the CEEW study's research partner describes as India's largest textile manufacturing hub - leftover fabric pieces from cutting ("katran") pile up at factories, tailor shops and homes. Each piece looks too small to bother with, so it is sold by the kilo as scrap, thrown away, or burnt.

How I know it is real - what data I found (the rules allow answering with data; I did not run my own interviews, and I say so):
- A 2023 peer-reviewed survey of 10 knitwear units in Ludhiana (Kaur, Yadav, Rose & Bisht, Pollution Research 42(1):110-115, https://www.envirobiotechjournals.com/PR/vol42issue1/Poll%20Res-17.pdf) found cutting left-overs are a main waste stream in the cutting/stitching sections. All 10 units sell waste fabric to rag collectors; 4 of the 10 "either dispose off or burn the waste to get rid of it". Most telling for this project: the top barrier to using the waste fabric was lack of designing knowledge (80% of units), ahead of shortage of time (70%) and inadequate skills (60%).
- Ludhiana's problem is big enough to be studied on its own: a baseline assessment of pre-consumer textile waste for the Council on Energy, Environment and Water (CEEW) surveyed roughly 350-400 textile units across Ludhiana (https://www.briefindia.com/baseline-assessment-of-pre-consumer-textile-waste-management-ludhiana/).
- The scrap trade is visible locally: IndiaMART lists Ludhiana hosiery cutting waste openly, sold by weight (https://dir.indiamart.com/ludhiana/hosiery-waste.html).
- National context: India generates about 792 kilotonnes of garment cutting waste a year, mostly small pieces (katran/chindi) (Saahas Zero Waste, "Sorting for Circularity: Wealth in Waste", https://www.saahaszerowaste.com/explore/reports-and-case-study/Sorting-for-Circularity-Wealth-in-Waste.pdf), and about 900,000 tonnes of textile cutting waste a year, with 73% of textile waste ending in landfill (GIZ factsheet, https://www.giz.de/en/downloads/giz2023-en-factsheet-building-an-inclusive-and-circular-textile-waste-value-chain-in-india.pdf).

Stated limits: the national figures are India-wide, not Ludhiana counts; the Ludhiana survey covered 10 units; trade listings show the scrap trade exists, not its size. I have not yet verified demand with Ludhiana tailors first-hand - that remains an optional next step, not a claim I make here.

Where PatchSpan fits: in that Ludhiana survey, the most common barrier to reusing waste fabric was lack of designing knowledge (8 of 10 units) - the units did not know what they could make from the pieces they had. PatchSpan is built for that gap: it shows what one specific scrap can still become. The survey is evidence the problem exists in those 10 units, not proof of wider demand; validating demand with Ludhiana tailors is a next step, stated openly rather than claimed.

## What it does / how it works
Lay the scrap and a standard ID-1 size card (a metro or membership card, 8.56 x 5.40 cm - only its size matters, never its number) flat on the same plain surface and photograph them from straight above. Tap the card's 4 corners; because the card and scrap lie on the same plane, that gives the photo real scale. The app traces the scrap outline - and lets you drag the outline handles to correct it - then a fitting engine tries on-grain and rotated placements to fit project pieces without overlap. You get a cutting layout that prints at true scale when printed at 100%, with a 10 cm check bar on the page to confirm the scale before cutting, and a Scrap box to remember what you have. There is no account and no server: photos and measurements never leave the phone. After the first load the app also works fully offline (verified with an automated offline test; without internet only the fonts fall back to system ones). Accuracy note: the measurement pipeline is tested on 126 synthetic, computer-generated scenes (varied sensor noise, lighting gradients, scrap sizes, shapes and prints), with the card corners supplied exactly, the same taps a user makes. In those idealized scenes the measured area stays within 2-3% of the true value. Accuracy on real phone photos is untested, so real measurements may be off by more. The 10 cm check bar on every print only confirms the printout's scale; it does not check the photo measurement.

## Demo video
The demo video (2 min 20 s) shows the complete flow using the app's built-in sample image - a drawn test scene standing in for a real fabric photo. Every screen is shown working, including manual outline correction and the fitting engine; it is not a real-phone camera recording.

## Built with
Plain JavaScript (no frameworks), HTML/CSS, SVG, service worker (PWA). Type: system font stack. Tests with node:test (13 automated tests, including the 126-scene measurement sweep).
**AI disclosure:** code was written with AI coding assistance under the builder's direction, and research used web search. No frameworks, libraries or paid APIs - plain JavaScript throughout.

## Challenges
Getting scale from a card, outlines from noisy photos (lighting gradients, printed fabric), and a packing search that never overlaps pieces.

## Next
Auto-detect the card, seam-allowance control, more patterns, multi-scrap combining, a shared "scrap swap" for tailors in the neighbourhood.
