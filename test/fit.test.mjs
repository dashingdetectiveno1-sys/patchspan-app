import assert from 'node:assert/strict';
import { test } from 'node:test';
import { area, overlaps, contains } from '../src/geometry.js';
import { fitPieces, suggestProjects } from '../src/fit.js';
import { PROJECTS, expandPieces } from '../src/patterns.js';

const rect = (w, h) => [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];

test('placed pieces stay inside scrap and never overlap', () => {
  const scrap = rect(40, 30);
  const hex = PROJECTS.find((p) => p.id === 'hex');
  const r = fitPieces(scrap, expandPieces(hex));
  for (const p of r.placed) assert.ok(contains(scrap, p.poly), `${p.id} inside`);
  for (let i = 0; i < r.placed.length; i++) for (let j = i + 1; j < r.placed.length; j++) assert.ok(!overlaps(r.placed[i].poly, r.placed[j].poly), `${r.placed[i].id}/${r.placed[j].id}`);
  assert.ok(r.utilization > 0 && r.utilization <= 1);
});

test('too-small scrap skips pieces instead of cheating', () => {
  const r = fitPieces(rect(10, 10), expandPieces(PROJECTS.find((p) => p.id === 'pouch')));
  assert.equal(r.placed.length, 0);
  assert.equal(r.skipped.length, 4);
});

test('two identical pieces do not stack', () => {
  const r = fitPieces(rect(25, 40), [{ id: 'a', name: 'a', poly: rect(20, 15) }, { id: 'b', name: 'b', poly: rect(20, 15) }]);
  assert.equal(r.placed.length, 2);
  assert.ok(!overlaps(r.placed[0].poly, r.placed[1].poly));
});

test('suggestions only include projects that fully fit', () => {
  const s = suggestProjects(rect(60, 45), PROJECTS, expandPieces);
  assert.ok(s.length >= 1);
  for (const x of s) assert.equal(x.result.skipped.length, 0);
});

test('non-rectangular (L-shaped) scrap respected', () => {
  const L = [{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 10 }, { x: 10, y: 10 }, { x: 10, y: 30 }, { x: 0, y: 30 }];
  const r = fitPieces(L, [{ id: 'sq', name: 'sq', poly: rect(14, 14) }]);
  assert.equal(r.placed.length, 0); // 14x14 cannot fit in a 10-wide L arm
  const r2 = fitPieces(L, [{ id: 'sq', name: 'sq', poly: rect(8, 8) }]);
  assert.equal(r2.placed.length, 1);
  assert.ok(contains(L, r2.placed[0].poly));
});
