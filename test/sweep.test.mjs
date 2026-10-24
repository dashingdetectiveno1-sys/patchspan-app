import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scrapOutline } from '../src/vision.js';
import { area } from '../src/geometry.js';

// Deep synthetic sweep: photo-like scenes (lighting gradient, sensor noise, striped/dark prints)
// across scrap sizes, shapes, positions, noise levels and gradient directions. 10 px/cm scale.
const PX = 10;
function scene({ seed = 1, noise = 14, flip = false, scrap = [60, 90, 180, 120], notch = null, dark = false }) {
  let s = seed; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const w = 480, h = 360, d = new Uint8ClampedArray(w * h * 4);
  const [sx, sy, sw, sh] = scrap;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const g = 175 + ((flip ? w - x : x) / w) * 35 - (y / h) * 15;
    let r = g, gg = g - 2, b = g - 6;
    let inScrap = x >= sx && x < sx + sw && y >= sy && y < sy + sh;
    if (inScrap && notch && x >= sx + sw - notch[0] && y >= sy + sh - notch[1]) inScrap = false;
    const inCard = x >= 300 && x < 386 && y >= 120 && y < 174;
    if (inScrap) {
      if (dark) { r = 70; gg = 60; b = 85; }
      else { const stripe = ((x + y) >> 3) & 1; r = stripe ? 150 : 90; gg = stripe ? 60 : 55; b = stripe ? 70 : 120; }
    }
    if (inCard) { r = 40; gg = 60; b = 140; }
    const n = (rnd() - 0.5) * noise;
    d[i] = r + n; d[i + 1] = gg + n; d[i + 2] = b + n; d[i + 3] = 255;
  }
  return { d, w, h, corners: [{ x: 300, y: 120 }, { x: 386, y: 120 }, { x: 386, y: 174 }, { x: 300, y: 174 }] };
}
const cmArea = (cfg) => {
  const { d, w, h, corners } = scene(cfg);
  return area(scrapOutline(d, w, h, corners).outlineCm);
};
const expected = ([, , sw, sh], notch) => (sw * sh - (notch ? notch[0] * notch[1] : 0)) / (PX * PX);

const cases = [];
for (const noise of [14, 26]) for (const flip of [false, true]) for (const dark of [false, true])
  for (const scrap of [[60, 90, 180, 120], [40, 120, 240, 90], [80, 60, 120, 120]])
    for (const seed of [1, 2, 3, 4, 5])
      cases.push({ seed, noise, flip, dark, scrap });
// L-shaped scraps (notched) at both noise levels
for (const noise of [14, 26]) for (const seed of [1, 2, 3])
  cases.push({ seed, noise, scrap: [60, 90, 180, 120], notch: [60, 60] });

test(`deep vision sweep: ${cases.length} synthetic scenes, area error stats`, () => {
  const errs = cases.map((c) => {
    const exp = expected(c.scrap, c.notch);
    const got = cmArea(c);
    return Math.abs(got - exp) / exp;
  });
  const mean = errs.reduce((a, b) => a + b, 0) / errs.length;
  const max = Math.max(...errs);
  const p90 = errs.sort((a, b) => a - b)[Math.floor(errs.length * 0.9)];
  console.log(`sweep n=${errs.length} mean=${(mean * 100).toFixed(1)}% p90=${(p90 * 100).toFixed(1)}% max=${(max * 100).toFixed(1)}%`);
  assert.ok(mean < 0.08, `mean error ${(mean * 100).toFixed(1)}% >= 8%`);
  assert.ok(max < 0.15, `worst error ${(max * 100).toFixed(1)}% >= 15%`);
});
