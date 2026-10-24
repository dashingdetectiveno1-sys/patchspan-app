import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPages, PAGE } from '../src/print.js';

const rect = (x, y, w, h) => [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
const W = PAGE.w - 2 * PAGE.margin, H = PAGE.h - 2 * PAGE.margin;

test('small layout fits on one page', () => {
  const r = buildPages([{ name: 'a', poly: rect(1, 1, 8, 6) }], { minX: 0, minY: 0, w: 15, h: 20 });
  assert.equal(r.pages.length, 1);
  assert.equal(r.tooBig.length, 0);
});

test('large layout: every piece assigned exactly once, none split', () => {
  const placed = [
    { name: 'tl', poly: rect(1, 1, 6, 5) },
    { name: 'tr', poly: rect(30, 1, 6, 5) },
    { name: 'bl', poly: rect(1, 36, 6, 5) },
    { name: 'br', poly: rect(30, 36, 6, 5) },
    { name: 'straddle', poly: rect(W - 1, 1, 3, 4) },
  ];
  const r = buildPages(placed, { minX: 0, minY: 0, w: 36.7, h: 41.8 });
  const seen = new Map();
  for (const pg of r.pages) for (const { p } of pg.items) seen.set(p.name, (seen.get(p.name) || 0) + 1);
  for (const { name } of placed) assert.equal(seen.get(name), 1, `${name} exactly once`);
  for (const pg of r.pages) {
    if (pg.kind !== 'grid') continue;
    for (const { p } of pg.items) {
      const xs = p.poly.map((q) => q.x), ys = p.poly.map((q) => q.y);
      assert.ok(Math.min(...xs) >= pg.wx0 && Math.max(...xs) <= pg.wx0 + W, 'x inside window');
      assert.ok(Math.min(...ys) >= pg.wy0 && Math.max(...ys) <= pg.wy0 + H, 'y inside window');
    }
  }
  const straddle = r.pages.find((pg) => pg.items[0]?.p.name === 'straddle');
  assert.equal(straddle.kind, 'loose');
});

test('piece bigger than a page is flagged for large-format', () => {
  const r = buildPages([{ name: 'huge', poly: rect(0, 0, W + 5, 10) }], { minX: 0, minY: 0, w: 40, h: 20 });
  assert.deepEqual(r.tooBig, ['huge']);
  assert.equal(r.pages.length, 1);
  assert.equal(r.pages[0].kind, 'loose');
});
