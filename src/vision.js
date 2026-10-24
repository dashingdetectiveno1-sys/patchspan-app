// Camera image -> scrap outline in centimetres. Works on RGBA pixel arrays (ImageData.data), so it runs in the browser and in node tests.
// Scale comes from a reference card (ID-1 size, 8.56 x 5.40 cm) whose 4 corners are confirmed by the user.
export const CARD_W_CM = 8.56, CARD_H_CM = 5.4;

/** Homography from 4 image points (tl,tr,br,bl) to card-plane cm. Returns function (x,y)->{x,y} in cm. */
export function homographyFromCard(corners, w = CARD_W_CM, h = CARD_H_CM) {
  const dst = [[0, 0], [w, 0], [w, h], [0, h]];
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = [corners[i].x, corners[i].y], [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  const s = solve(A, b);
  return (x, y) => {
    const d = s[6] * x + s[7] * y + 1;
    return { x: (s[0] * x + s[1] * y + s[2]) / d, y: (s[3] * x + s[4] * y + s[5]) / d };
  };
}

function solve(A, b) {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) throw new Error('Card corners are degenerate - retake the photo');
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}

/**
 * Segment the scrap: everything that differs from the background colour (median of the image border) by more than a threshold.
 * Returns { mask: Uint8Array(w*h), threshold }.
 */
export function segment(rgba, w, h, opts = {}) {
  const border = [];
  const bw = Math.max(2, Math.round(Math.min(w, h) * 0.03));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (x < bw || y < bw || x >= w - bw || y >= h - bw) border.push((y * w + x) * 4);
  }
  const med = (ch) => { const v = border.map((i) => rgba[i + ch]).sort((a, b) => a - b); return v[v.length >> 1]; };
  const bg = [med(0), med(1), med(2)];
  const dist = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const dr = rgba[i * 4] - bg[0], dg = rgba[i * 4 + 1] - bg[1], db = rgba[i * 4 + 2] - bg[2];
    dist[i] = Math.sqrt(dr * dr + dg * dg + db * db);
  }
  const threshold = opts.threshold ?? otsu(dist);
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = dist[i] > threshold ? 1 : 0;
  return { mask, threshold, bg };
}

function otsu(values) {
  const hist = new Array(256).fill(0);
  let max = 0;
  for (const v of values) if (v > max) max = v;
  const scale = max > 0 ? 255 / max : 1;
  for (const v of values) hist[Math.min(255, Math.floor(v * scale))]++;
  const total = values.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, thr = 0;
  for (let i = 0; i < 256; i++) {
    wB += hist[i];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += i * hist[i];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) { best = between; thr = i; }
  }
  return Math.max(12, thr / scale);
}

/** Remove specks (erode+dilate with a square radius r), then keep the largest 4-connected blob. */
export function largestBlob(mask, w, h, r = 2, exclude = null) {
  let m = mask;
  if (exclude) { m = Uint8Array.from(mask); for (let i = 0; i < m.length; i++) if (exclude[i]) m[i] = 0; }
  m = morph(m, w, h, r, true); m = morph(m, w, h, r, false);
  const label = new Int32Array(w * h);
  let best = { id: 0, size: 0 }, id = 0;
  const stack = [];
  for (let s = 0; s < w * h; s++) {
    if (!m[s] || label[s]) continue;
    id++; let size = 0; stack.push(s); label[s] = id;
    while (stack.length) {
      const p = stack.pop(); size++;
      const x = p % w, y = (p / w) | 0;
      if (x > 0 && m[p - 1] && !label[p - 1]) { label[p - 1] = id; stack.push(p - 1); }
      if (x < w - 1 && m[p + 1] && !label[p + 1]) { label[p + 1] = id; stack.push(p + 1); }
      if (y > 0 && m[p - w] && !label[p - w]) { label[p - w] = id; stack.push(p - w); }
      if (y < h - 1 && m[p + w] && !label[p + w]) { label[p + w] = id; stack.push(p + w); }
    }
    if (size > best.size) best = { id, size };
  }
  const out = new Uint8Array(w * h);
  if (best.id) for (let i = 0; i < w * h; i++) if (label[i] === best.id) out[i] = 1;
  return { blob: out, size: best.size };
}

function morph(m, w, h, r, erode) {
  const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = erode ? 1 : 0;
    for (let k = -r; k <= r; k++) {
      const xx = x + k; const a = xx >= 0 && xx < w ? m[y * w + xx] : 0;
      if (erode ? !a : a) { v = erode ? 0 : 1; break; }
    }
    tmp[y * w + x] = v;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = erode ? 1 : 0;
    for (let k = -r; k <= r; k++) {
      const yy = y + k; const a = yy >= 0 && yy < h ? tmp[yy * w + x] : 0;
      if (erode ? !a : a) { v = erode ? 0 : 1; break; }
    }
    out[y * w + x] = v;
  }
  return out;
}

/** Trace the outer boundary of a blob (Moore neighbour). Returns array of {x,y} pixel points. */
export function traceBoundary(blob, w, h) {
  let start = -1;
  for (let i = 0; i < w * h; i++) if (blob[i]) { start = i; break; }
  if (start < 0) return [];
  const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const at = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? blob[y * w + x] : 0);
  const sx = start % w, sy = (start / w) | 0;
  const pts = [{ x: sx, y: sy }];
  let x = sx, y = sy, d = 6; // came from above-left in scan order
  for (let guard = 0; guard < w * h * 2; guard++) {
    let found = false;
    for (let k = 0; k < 8; k++) {
      const nd = (d + 6 + k) % 8; // start search just after backtrack direction
      const nx = x + dirs[nd][0], ny = y + dirs[nd][1];
      if (at(nx, ny)) { x = nx; y = ny; d = nd; found = true; break; }
    }
    if (!found) break;
    if (x === sx && y === sy) break;
    pts.push({ x, y });
  }
  return pts;
}

/** Ramer-Douglas-Peucker on a closed loop. */
export function simplify(points, eps) {
  if (points.length < 4) return points;
  // split at the two farthest-apart points so a closed loop simplifies cleanly
  let a = 0, b = 0, md = -1;
  for (let i = 1; i < points.length; i++) { const d = dist2(points[0], points[i]); if (d > md) { md = d; b = i; } }
  const half1 = rdp(points.slice(0, b + 1), eps), half2 = rdp(points.slice(b).concat([points[0]]), eps);
  return half1.slice(0, -1).concat(half2.slice(0, -1));
}
const dist2 = (p, q) => (p.x - q.x) ** 2 + (p.y - q.y) ** 2;
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const a = pts[0], b = pts[pts.length - 1];
  let idx = -1, md = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perp(pts[i], a, b);
    if (d > md) { md = d; idx = i; }
  }
  if (md > eps) return rdp(pts.slice(0, idx + 1), eps).slice(0, -1).concat(rdp(pts.slice(idx), eps));
  return [a, b];
}
function perp(p, a, b) {
  const l = Math.hypot(b.x - a.x, b.y - a.y);
  if (l === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / l;
}

/** Full pipeline. corners: card corners (px) tl,tr,br,bl. Returns { outlineCm, outlinePx, areaCm2 }. */
export function scrapOutline(rgba, w, h, corners, opts = {}) {
  const { mask, threshold } = segment(rgba, w, h, opts);
  const cardMask = new Uint8Array(w * h);
  fillPoly(cardMask, w, h, corners, 6);
  const { blob, size } = largestBlob(mask, w, h, opts.cleanup ?? 2, cardMask);
  if (size < 400) throw new Error('Could not find a scrap. Use a plain, contrasting surface and good light.');
  const raw = traceBoundary(blob, w, h);
  const outlinePx = simplify(raw, opts.simplify ?? Math.max(2, Math.min(w, h) * 0.006));
  const H = homographyFromCard(corners);
  const outlineCm = outlinePx.map((p) => H(p.x, p.y));
  return { outlinePx, outlineCm, threshold };
}

function fillPoly(buf, w, h, poly, grow = 0) {
  const cx = poly.reduce((s, p) => s + p.x, 0) / poly.length, cy = poly.reduce((s, p) => s + p.y, 0) / poly.length;
  const g = poly.map((p) => { const l = Math.hypot(p.x - cx, p.y - cy) || 1; return { x: p.x + ((p.x - cx) / l) * grow, y: p.y + ((p.y - cy) / l) * grow }; });
  const ys = g.map((p) => p.y);
  for (let y = Math.max(0, Math.floor(Math.min(...ys))); y <= Math.min(h - 1, Math.ceil(Math.max(...ys))); y++) {
    const xs = [];
    for (let i = 0; i < g.length; i++) {
      const a = g[i], b = g[(i + 1) % g.length];
      if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.max(0, Math.ceil(xs[i])); x <= Math.min(w - 1, Math.floor(xs[i + 1])); x++) buf[y * w + x] = 1;
  }
}
