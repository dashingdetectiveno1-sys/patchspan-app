import { area, bbox, rotate, translate, contains, overlaps, shrinkTowardCentroid, centroid } from './geometry.js';

// Rotation tiers, tried in order: on-grain first (fabric pieces should be cut on grain),
// bias (45) next, then free angles only when nothing else fits. First tier with a fit wins.
const ROTATION_TIERS = [
  [0, 90, 180, 270],
  [45, 135, 225, 315],
  [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5],
];

/**
 * Greedy fit. scrap: polygon (cm). pieces: [{id,name,poly}]. opts: { gap (cm between pieces), edge (cm kept from scrap edge), step (cm grid), rotationTiers }.
 * Returns { placed: [{id,name,poly,rotation}], skipped: [ids], used (cm2), scrapArea, utilization }
 */
export function fitPieces(scrap, pieces, opts = {}) {
  // Greedy is sensitive to the scan direction, so run it twice - stacking rows (y-first)
  // and filling columns (x-first) - and keep the better layout.
  const a = greedyFit(scrap, pieces, opts, (x, y) => y * 1000 + x);
  const b = greedyFit(scrap, pieces, opts, (x, y) => x * 1000 + y);
  if (b.placed.length > a.placed.length) return b;
  if (b.placed.length === a.placed.length && b.utilization > a.utilization) return b;
  return a;
}

function greedyFit(scrap, pieces, opts, scoreFn) {
  const gap = opts.gap ?? 0.3, edge = opts.edge ?? 0.5, step = opts.step ?? 0.4;
  const tiers = opts.rotationTiers ?? (opts.rotations ? [opts.rotations] : ROTATION_TIERS);
  const usable = edge > 0 ? shrinkTowardCentroid(scrap, edge) : scrap;
  const sb = bbox(usable);
  const placed = [], skipped = [];
  const sorted = [...pieces].sort((a, b) => area(b.poly) - area(a.poly));
  for (const piece of sorted) {
    let best = null;
    for (const tier of tiers) {
      for (const rot of tier) {
        const base = rotate(piece.poly, rot, centroid(piece.poly));
        const bb = bbox(base);
        const norm = translate(base, -bb.minX, -bb.minY);
        if (bb.w > sb.w + 1e-6 || bb.h > sb.h + 1e-6) continue;
        for (let y = sb.minY; y + bb.h <= sb.maxY + 1e-6; y += step) {
          for (let x = sb.minX; x + bb.w <= sb.maxX + 1e-6; x += step) {
            const cand = translate(norm, x, y);
            if (!contains(usable, cand)) continue;
            const grown = gap > 0 ? growAbout(cand, gap) : cand;
            if (placed.some((p) => overlaps(grown, p.poly))) continue;
            const score = scoreFn(x, y);
            if (!best || score < best.score) best = { score, poly: cand, rotation: rot };
            break; // first valid x on this row for this rotation
          }
          if (best && best.rotation === rot) break; // first valid row for this rotation
        }
      }
      if (best) break; // on-grain beats bias beats free angle
    }
    if (best) placed.push({ id: piece.id, name: piece.name, poly: best.poly, rotation: best.rotation });
    else skipped.push(piece.name);
  }
  const used = placed.reduce((s, p) => s + area(p.poly), 0);
  const scrapArea = area(scrap);
  return { placed, skipped, used, scrapArea, utilization: scrapArea ? used / scrapArea : 0 };
}

function growAbout(poly, d) {
  const c = centroid(poly);
  return poly.map((p) => {
    const vx = p.x - c.x, vy = p.y - c.y, len = Math.hypot(vx, vy) || 1;
    const k = (len + d) / len;
    return { x: c.x + vx * k, y: c.y + vy * k };
  });
}

/** Which projects can this scrap fully cover? Returns [{project, result}] sorted by utilization desc. */
export function suggestProjects(scrap, projects, expand, opts) {
  return projects
    .map((project) => ({ project, result: fitPieces(scrap, expand(project), opts) }))
    .filter((r) => r.result.skipped.length === 0)
    .sort((a, b) => b.result.utilization - a.result.utilization);
}
