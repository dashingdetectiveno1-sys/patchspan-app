// Beginner-friendly pieces, drawn fresh for PatchSpan. Dimensions in cm, finished size plus seam allowance included.
const rect = (w, h) => [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
const hexagon = (r) => Array.from({ length: 6 }, (_, i) => ({ x: r + r * Math.cos((i * Math.PI) / 3), y: r + r * Math.sin((i * Math.PI) / 3) }));
const circle = (r, n = 24) => Array.from({ length: n }, (_, i) => ({ x: r + r * Math.cos((2 * Math.PI * i) / n), y: r + r * Math.sin((2 * Math.PI * i) / n) }));
const pocket = (w, h) => [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h * 0.7 }, { x: w / 2, y: h }, { x: 0, y: h * 0.7 }];

export const PROJECTS = [
  {
    id: 'scrunchie', name: 'Scrunchies', blurb: 'Two bands per scrunchie, fits thin offcuts.',
    pieces: [
      { id: 'band-a', name: 'Band', poly: rect(36, 9), count: 2 },
    ],
  },
  {
    id: 'coasters', name: 'Coaster set', blurb: 'Four round coasters from small scraps.',
    pieces: [{ id: 'coaster', name: 'Coaster', poly: circle(5.5), count: 4 }],
  },
  {
    id: 'pouch', name: 'Zip pouch', blurb: 'Front, back and two lining panels.',
    pieces: [
      { id: 'outer', name: 'Outer panel', poly: rect(22, 15), count: 2 },
      { id: 'lining', name: 'Lining panel', poly: rect(22, 15), count: 2 },
    ],
  },
  {
    id: 'pocket', name: 'Patch pockets', blurb: 'Pockets for kurtas and school bags.',
    pieces: [{ id: 'pocket', name: 'Pocket', poly: pocket(13, 15), count: 3 }],
  },
  {
    id: 'hex', name: 'Hexagon patchwork', blurb: 'Quilt hexagons for a cushion cover.',
    pieces: [{ id: 'hex', name: 'Hexagon', poly: hexagon(6), count: 6 }],
  },
];

export function expandPieces(project) {
  const out = [];
  for (const p of project.pieces) for (let i = 1; i <= p.count; i++) out.push({ id: `${p.id}-${i}`, name: `${p.name} ${i}`, poly: p.poly });
  return out;
}
