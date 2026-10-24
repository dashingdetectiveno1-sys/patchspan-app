import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scrapOutline } from '../src/vision.js';
import { area } from '../src/geometry.js';

// Photo-like scene: lighting gradient, sensor noise, soft shadow edge, patterned scrap (10 px/cm). Expected scrap 18x12 cm = 216 cm2.
function scene(seed = 1) {
  let s = seed; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const w = 480, h = 360, d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, g = 175 + (x / w) * 35 - (y / h) * 15; // lighting gradient on table
    let r = g, gg = g - 2, b = g - 6;
    const inScrap = x >= 60 && x < 240 && y >= 90 && y < 210;
    const inCard = x >= 300 && x < 386 && y >= 120 && y < 174;
    if (inScrap) { const stripe = ((x + y) >> 3) & 1; r = stripe ? 150 : 90; gg = stripe ? 60 : 55; b = stripe ? 70 : 120; } // striped print
    if (inCard) { r = 40; gg = 60; b = 140; }
    const n = (rnd() - 0.5) * 14;
    d[i] = r + n; d[i + 1] = gg + n; d[i + 2] = b + n; d[i + 3] = 255;
  }
  return { d, w, h, corners: [{ x: 300, y: 120 }, { x: 386, y: 120 }, { x: 386, y: 174 }, { x: 300, y: 174 }] };
}

test('striped print scrap under gradient light + noise: area within 12%', () => {
  const { d, w, h, corners } = scene();
  const a = area(scrapOutline(d, w, h, corners).outlineCm);
  assert.ok(Math.abs(a - 216) / 216 < 0.12, `area ${a.toFixed(1)} vs 216`);
});
