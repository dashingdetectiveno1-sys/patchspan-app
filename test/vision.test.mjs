import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scrapOutline, homographyFromCard, CARD_W_CM } from '../src/vision.js';
import { area } from '../src/geometry.js';

// Synthetic photo: 400x300, 10 px per cm. Grey table, card 8.56x5.4 cm, a 20x14 cm blue rectangular scrap.
function scene() {
  const w = 400, h = 300, d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { d[i * 4] = 190; d[i * 4 + 1] = 188; d[i * 4 + 2] = 185; d[i * 4 + 3] = 255; }
  const box = (x0, y0, x1, y1, c) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * w + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; } };
  box(40, 60, 240, 200, [40, 70, 160]);            // scrap 200x140 px = 20x14 cm
  box(280, 100, 280 + 86, 100 + 54, [235, 235, 235]); // card ~ 86x54 px
  return { d, w, h, corners: [{ x: 280, y: 100 }, { x: 366, y: 100 }, { x: 366, y: 154 }, { x: 280, y: 154 }] };
}

test('homography maps card corners to card size', () => {
  const { corners } = scene();
  const H = homographyFromCard(corners);
  const br = H(366, 154);
  assert.ok(Math.abs(br.x - CARD_W_CM) < 1e-6 && Math.abs(br.y - 5.4) < 1e-6);
});

test('scrap area is recovered within 8% from a synthetic photo', () => {
  const { d, w, h, corners } = scene();
  const { outlineCm } = scrapOutline(d, w, h, corners);
  const a = area(outlineCm);
  assert.ok(Math.abs(a - 280) / 280 < 0.08, `area ${a.toFixed(1)} vs 280`);
});

test('blank table raises a clear error', () => {
  const w = 200, h = 150, d = new Uint8ClampedArray(w * h * 4).fill(180);
  assert.throws(() => scrapOutline(d, w, h, [{ x: 10, y: 10 }, { x: 96, y: 10 }, { x: 96, y: 64 }, { x: 10, y: 64 }]), /Could not find a scrap/);
});
