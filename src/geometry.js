// Polygon helpers. Points are {x, y} in centimetres. Polygons are arrays of points (no repeated closing point).
export const EPS = 1e-9;

export function area(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

export function bbox(poly) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of poly) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

export function centroid(poly) {
  let cx = 0, cy = 0, a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const f = p.x * q.y - q.x * p.y;
    a += f; cx += (p.x + q.x) * f; cy += (p.y + q.y) * f;
  }
  if (Math.abs(a) < EPS) return { x: poly[0].x, y: poly[0].y };
  return { x: cx / (3 * a), y: cy / (3 * a) };
}

export function rotate(poly, deg, about = { x: 0, y: 0 }) {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return poly.map((p) => ({
    x: about.x + (p.x - about.x) * c - (p.y - about.y) * s,
    y: about.y + (p.x - about.x) * s + (p.y - about.y) * c,
  }));
}

export function translate(poly, dx, dy) {
  return poly.map((p) => ({ x: p.x + dx, y: p.y + dy }));
}

export function pointInPolygon(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function orient(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

// True only for a proper crossing (interiors of both segments cross).
export function segmentsCross(a, b, c, d) {
  const o1 = orient(a, b, c), o2 = orient(a, b, d), o3 = orient(c, d, a), o4 = orient(c, d, b);
  return ((o1 > EPS && o2 < -EPS) || (o1 < -EPS && o2 > EPS)) && ((o3 > EPS && o4 < -EPS) || (o3 < -EPS && o4 > EPS));
}

export function edgesCross(p, q) {
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    for (let j = 0; j < q.length; j++) {
      if (segmentsCross(a, b, q[j], q[(j + 1) % q.length])) return true;
    }
  }
  return false;
}

// Is `inner` fully inside `outer`? Vertices inside (or on boundary tolerance) and no proper edge crossings.
export function contains(outer, inner) {
  for (const p of inner) if (!pointInPolygon(p, outer) && !onBoundary(p, outer)) return false;
  if (edgesCross(outer, inner)) return false;
  // midpoints guard against a concave outer notch cutting through an edge between two inside vertices
  for (let i = 0; i < inner.length; i++) {
    const a = inner[i], b = inner[(i + 1) % inner.length];
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (!pointInPolygon(m, outer) && !onBoundary(m, outer)) return false;
  }
  return true;
}

export function onBoundary(pt, poly, tol = 1e-6) {
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    if (l < EPS) continue;
    if (Math.abs(orient(a, b, pt)) / l < tol) {
      const t = ((pt.x - a.x) * (b.x - a.x) + (pt.y - a.y) * (b.y - a.y)) / (l * l);
      if (t >= -tol && t <= 1 + tol) return true;
    }
  }
  return false;
}

// Do two polygons overlap in area? (touching edges is fine)
export function overlaps(p, q) {
  const bp = bbox(p), bq = bbox(q);
  if (bp.maxX <= bq.minX || bq.maxX <= bp.minX || bp.maxY <= bq.minY || bq.maxY <= bp.minY) return false;
  if (edgesCross(p, q)) return true;
  const cp = centroid(p), cq = centroid(q);
  if (pointInPolygon(cp, q) || pointInPolygon(cq, p)) return true;
  // identical / nested shapes whose vertices all lie on each other's boundary
  for (const a of p) if (pointInPolygon(a, q) && !onBoundary(a, q)) return true;
  for (const a of q) if (pointInPolygon(a, p) && !onBoundary(a, p)) return true;
  // midpoint test catches shared-vertex overlaps
  for (let i = 0; i < p.length; i++) {
    const m = { x: (p[i].x + p[(i + 1) % p.length].x) / 2, y: (p[i].y + p[(i + 1) % p.length].y) / 2 };
    if (pointInPolygon(m, q) && !onBoundary(m, q)) return true;
  }
  return false;
}

// Inset a convex-or-simple polygon toward its centroid by `d` cm (cheap seam-allowance model for scrap edges).
export function shrinkTowardCentroid(poly, d) {
  const c = centroid(poly);
  return poly.map((p) => {
    const vx = p.x - c.x, vy = p.y - c.y, len = Math.hypot(vx, vy) || 1;
    const k = Math.max(0, len - d) / len;
    return { x: c.x + vx * k, y: c.y + vy * k };
  });
}
