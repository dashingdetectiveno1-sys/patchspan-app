// A4 print pagination for real-size cutting layouts.
// A layout bigger than one A4 page is split across pages; a piece is never
// cut across a page boundary. Pieces that straddle every page window get
// their own centered page. Pieces too big for A4 are flagged.

export const PAGE = { w: 18.6, h: 27.3, margin: 0.3 }; // sized to fit inside A4's printable area (19 x 27.7 cm with default 1 cm margins)
export const HEADER = 3.2; // top band on every printed page: page label + 10 cm check bar, never covered by pieces

const bof = (poly) => poly.reduce((b, p) => ({ minX: Math.min(b.minX, p.x), minY: Math.min(b.minY, p.y), maxX: Math.max(b.maxX, p.x), maxY: Math.max(b.maxY, p.y) }), { minX: 1e9, minY: 1e9, maxX: -1e9, maxY: -1e9 });

export function buildPages(placed, scrapBox) {
  const { w: PW, h: PH, margin: M } = PAGE;
  const W = PW - 2 * M, H = PH - HEADER - 2 * M; // usable window per page, below the header band
  const x0 = scrapBox.minX, y0 = scrapBox.minY;
  const cols = Math.max(1, Math.ceil(scrapBox.w / W));
  const rows = Math.max(1, Math.ceil(scrapBox.h / H));
  const grid = new Map(); // "c,r" -> [{p,i}]
  const loose = [];
  const tooBig = [];
  placed.forEach((p, i) => {
    const b = bof(p.poly);
    if (b.maxX - b.minX > W || b.maxY - b.minY > H) { tooBig.push(p.name); loose.push({ p, i, centered: true }); return; }
    let done = false;
    for (let c = 0; c < cols && !done; c++)
      for (let r = 0; r < rows && !done; r++) {
        const wx0 = x0 + c * W, wy0 = y0 + r * H;
        if (b.minX >= wx0 && b.maxX <= wx0 + W && b.minY >= wy0 && b.maxY <= wy0 + H) {
          const k = c + ',' + r;
          if (!grid.has(k)) grid.set(k, []);
          grid.get(k).push({ p, i });
          done = true;
        }
      }
    if (!done) loose.push({ p, i, centered: true });
  });
  const pages = [];
  [...grid.keys()].sort().forEach((k) => {
    const [c, r] = k.split(',').map(Number);
    pages.push({ kind: 'grid', col: c, row: r, wx0: x0 + c * W, wy0: y0 + r * H, items: grid.get(k) });
  });
  loose.forEach((l) => pages.push({ kind: 'loose', items: [l] }));
  return { pages, tooBig, cols, rows, window: { w: W, h: H } };
}
