import { scrapOutline, homographyFromCard } from './vision.js';
import { fitPieces, suggestProjects } from './fit.js';
import { PROJECTS, expandPieces } from './patterns.js';
import { area, bbox, translate } from './geometry.js';
import { buildPages, PAGE, HEADER } from './print.js';

const $app = document.getElementById('app');
const state = { screen: 'welcome', project: null, img: null, w: 0, h: 0, rgba: null, corners: [], outline: null, outlinePx: null, H: null, baseThr: 0, sens: 1, result: null, error: '' };
const BOX_KEY = 'patchspan.scraps.v1';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const loadBox = () => { try { return JSON.parse(localStorage.getItem(BOX_KEY)) || []; } catch { return []; } };
const saveBox = (b) => localStorage.setItem(BOX_KEY, JSON.stringify(b));

function go(screen) { state.screen = screen; state.error = ''; render(); document.querySelector("main").scrollTop = 0; }
document.querySelectorAll('#tabs [data-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));

const screens = {
  welcome() {
    return `<div class="stack hero"><img src="assets/logo.svg" width="64" height="64" alt="" style="margin-top:18px">
      <p class="eyebrow">Neighborhood Hacks 2026</p>
      <h1>Every scrap, fitted.</h1>
      <p class="muted">Lay a leftover piece of fabric next to any standard card. PatchSpan measures it with your camera and shows what you can still sew from it.</p>
      <div class="steps">
        <div class="step"><b>1</b><span>Photograph the scrap next to a card</span></div>
        <div class="step"><b>2</b><span>Trace and adjust the outline</span></div>
        <div class="step"><b>3</b><span>See what fits, print, cut</span></div>
      </div>
      <button data-act="start">Start with a scrap</button>
      <p class="muted" style="text-align:center;font-size:.85rem">Photos stay on your phone. Nothing is uploaded.</p></div>`;
  },
  pick() {
    return `<div class="stack"><h2>What do you want to make?</h2>
      ${PROJECTS.map((p) => `<button class="proj" data-project="${p.id}"><span>${esc(p.name)}<small>${esc(p.blurb)} (${expandPieces(p).length} pieces)</small></span><span class="chev">&rsaquo;</span></button>`).join('')}
      <button class="ghost" data-project="__any">Not sure - show me what fits</button></div>`;
  },
  card() {
    return `<div class="stack"><h2>Place the card</h2>
      <p>Put the scrap flat on a plain table. Lay any standard ID-size card (bank, metro or membership, 8.6 x 5.4 cm) next to it, not touching. Only its size matters - never its number. Take the photo from straight above, in good light.</p>
      <label class="btn">Take or choose photo<input id="file" type="file" accept="image/*" capture="environment" hidden></label>
      <button class="ghost" data-act="sample">No fabric handy? Try a sample photo</button>
      <button class="ghost" data-go="pick">Back</button>${state.error ? `<p class="err">${esc(state.error)}</p>` : ''}</div>`;
  },
  scan() {
    const n = state.corners.length;
    const prompts = ['Tap the card\'s top-left corner', 'Now the top-right corner', 'Now the bottom-right corner', 'Now the bottom-left corner', 'Card marked. Trace the scrap.'];
    let scaleNote = '';
    if (n === 4) {
      const d = Math.hypot(state.corners[2].x - state.corners[0].x, state.corners[2].y - state.corners[0].y);
      const pxcm = d / Math.hypot(8.56, 5.4);
      scaleNote = `<p class="muted">Card scale: ${pxcm.toFixed(1)} px/cm. If the card looks mis-marked, use Redo corners.</p>`;
    }
    return `<div class="stack"><h2>Scan</h2><p>${prompts[n]}</p>${scaleNote}
      <div class="stage" id="stage"><canvas id="photo"></canvas>${state.corners.map((c, i) => `<i class="dot" style="left:${(c.x / state.w) * 100}%;top:${(c.y / state.h) * 100}%"></i>`).join('')}</div>
      <div class="row"><button class="ghost" data-act="reset-corners">Redo corners</button><button data-act="trace" ${n < 4 ? 'disabled' : ''}>Trace scrap</button></div>
      ${state.error ? `<p class="err">${esc(state.error)}</p>` : ''}</div>`;
  },
  review() {
    const a = state.outline ? area(state.outline) : 0;
    return `<div class="stack"><h2>Check the outline</h2>
      <p>Drag the blue handles to fix the edge, then fit the pieces. If the trace missed fabric or caught the table, adjust sensitivity and re-trace.</p>
      <div class="stage" id="stage"><canvas id="photo"></canvas><svg id="overlay" viewBox="0 0 ${state.w} ${state.h}"></svg></div>
      <p class="muted">Outline: <b id="area-readout">${a.toFixed(0)}</b> cm2 of fabric.</p>
      <button data-act="use-outline">Looks right - fit pieces</button>
      <div class="row"><button class="ghost" data-act="sens-down">Trace more</button><button class="ghost" data-act="sens-up">Trace less</button></div>
      <button class="ghost" data-go="card">Retake photo</button>
      ${state.error ? `<p class="err">${esc(state.error)}</p>` : ''}</div>`;
  },
  fit() {
    return `<div class="stack"><h2>Fitting pieces</h2><p class="muted">Trying rotations and positions...</p></div>`;
  },
  result() {
    const r = state.result, scrapA = area(state.outline), pr = state.project;
    const sug = pr && pr.id !== '__any' ? [] : state.suggest || [];
    return `<div class="stack"><h2>${pr && pr.id !== '__any' ? esc(pr.name) : 'What fits'}</h2>
      <div class="stage printarea">${fitSvg(r, state.outline, false)}</div>
      ${pr && pr.id !== '__any' ? `<div class="card"><div class="stat">${r.placed.length} of ${r.placed.length + r.skipped.length} pieces fit</div>
        <p class="muted">Scrap ${scrapA.toFixed(0)} cm2. Pieces use ${(r.utilization * 100).toFixed(0)}% of it.</p>
        ${r.skipped.length ? `<p class="warn">Does not fit: ${r.skipped.map(esc).join(', ')}. Try another project or combine with a second scrap.</p>` : '<p class="sage">Everything fits.</p>'}</div>`
      : sug.length ? sug.map((s, i) => `<button class="proj" data-suggest="${i}"><span>${esc(s.project.name)}<small>${(s.result.utilization * 100).toFixed(0)}% of the scrap used</small></span><span class="chev">&rsaquo;</span></button>`).join('') : '<div class="card"><p>No full project fits this scrap. Try a smaller project or a bigger piece.</p></div>'}
      <button data-act="save">Save to scrap box</button>
      <button class="ghost" data-act="export">Export real-size cutting layout</button>
      <button class="ghost" data-go="pick">Try another project</button></div>`;
  },
  box() {
    const box = loadBox();
    return `<div class="stack"><h2>Scrap box</h2>${box.length ? box.map((s, i) => `<div class="card row"><div class="thumb">${outlineSvg(s.outline)}</div><div><b>${esc(s.name)}</b><br><span class="muted">${s.areaCm2.toFixed(0)} cm2, ${esc(s.date)}</span></div><div><button data-use="${i}">Use</button></div></div>`).join('') : '<p class="muted">Nothing saved yet. Fit a scrap and tap Save.</p>'}
      <button data-go="pick">Fit a new scrap</button></div>`;
  },
  export() {
    const pag = buildPages(state.result.placed, bbox(state.outline));
    const n = pag.pages.length;
    return `<div class="stack"><h2 class="noprint">Cutting layout</h2><p class="muted noprint">Print at 100% scale (no fit-to-page).${n > 1 ? ` This layout is bigger than one A4 sheet, so it prints on ${n} pages - every piece stays whole on one page; match pieces by name.` : ''} The grey box is a 10 cm check: measure it with a ruler before you cut.${pag.tooBig.length ? ` <b>${pag.tooBig.map(esc).join(', ')}</b> is larger than one A4 page - print that piece on large-format paper.` : ''}</p>
      <div class="printarea">${fitSvg(state.result, state.outline, true)}</div>
      <div id="printpages" aria-hidden="true">${pag.pages.map((pg, idx) => pageSvg(pg, state.outline, idx + 1, n)).join('')}</div>
      <button data-act="print" class="noprint">Print or save PDF</button>
      <button data-act="svg" class="ghost noprint">Download SVG</button>
      <button data-go="result" class="ghost noprint">Back</button></div>`;
  },
};

function outlineSvg(poly) {
  const b = bbox(poly), pad = 1;
  return `<svg viewBox="${b.minX - pad} ${b.minY - pad} ${b.w + 2 * pad} ${b.h + 2 * pad}" width="72" height="72"><polygon points="${poly.map((p) => `${p.x},${p.y}`).join(' ')}" fill="#D6E4F7" stroke="#0071E3" stroke-width=".4"/></svg>`;
}

const COLORS = ['#F2C9B8', '#C9D6E8', '#DDE5C9', '#F0DDA8', '#E3C6E0', '#C7E0DA'];
function fitSvg(r, scrap, real) {
  const b = bbox(scrap), pad = 1.5, extra = real ? 3 : 0;
  const vw = b.w + 2 * pad, vh = b.h + 2 * pad + extra, x0 = b.minX - pad, y0 = b.minY - pad;
  const size = real ? `width="${vw}cm" height="${vh}cm"` : 'width="100%"';
  const pts = (poly) => poly.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" ${size} viewBox="${x0} ${y0} ${vw} ${vh}" style="background:#F5F5F7">
    <polygon points="${pts(scrap)}" fill="#FFFFFF" stroke="#86868B" stroke-width=".25" stroke-dasharray=".8 .5"/>
    ${r.placed.map((p, i) => `<g><polygon points="${pts(p.poly)}" fill="${COLORS[i % COLORS.length]}" stroke="#0071E3" stroke-width=".3" stroke-dasharray=".7 .4"/>${labelText(p, i)}</g>`).join('')}
    ${real ? `<rect x="${x0 + 0.5}" y="${y0 + b.h + 2 * pad + 0.3}" width="10" height="1" fill="#E8E8ED" stroke="#1D1D1F" stroke-width=".1"/><text x="${x0 + 11}" y="${y0 + b.h + 2 * pad + 1.1}" font-size=".9" fill="#1D1D1F">10 cm</text>` : ''}
  </svg>`;
}
function pageSvg(pg, scrap, num, total) {
  const M = PAGE.margin;
  const pts = (poly) => poly.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  let vb, label;
  if (pg.kind === 'grid') {
    vb = `${pg.wx0 - M} ${pg.wy0 - HEADER} ${PAGE.w} ${PAGE.h}`;
    label = `Page ${num}/${total} - column ${pg.col + 1}, row ${pg.row + 1}`;
  } else {
    const b = bbox(pg.items[0].p.poly);
    const w = Math.max(Math.min(PAGE.w, b.w + 2 * M), 15.5), h = Math.min(PAGE.h, b.h + HEADER + 2 * M);
    vb = `${((b.minX + b.maxX) / 2 - w / 2).toFixed(2)} ${(b.minY - HEADER - M).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`;
    label = `Page ${num}/${total} - single piece`;
  }
  const [vx, vy, vw, vh] = vb.split(' ').map(Number);
  const cx = vx + 0.4, cy = vy + 1.5;
  return `<div class="pg"><svg xmlns="http://www.w3.org/2000/svg" width="${vw.toFixed(1)}cm" height="${vh.toFixed(1)}cm" viewBox="${vb}">
    <text x="${vx + 0.4}" y="${vy + 0.9}" font-size=".9" fill="#1D1D1F">${esc(label)}</text>
    <rect x="${cx}" y="${cy}" width="10" height="1" fill="#E8E8ED" stroke="#1D1D1F" stroke-width=".1"/><text x="${cx + 10.5}" y="${cy + 0.8}" font-size=".8" fill="#1D1D1F">10 cm</text>
    <polygon points="${pts(scrap)}" fill="none" stroke="#C7C7CC" stroke-width=".15" stroke-dasharray=".8 .5"/>
    ${pg.items.map(({ p, i }) => `<g><polygon points="${pts(p.poly)}" fill="${COLORS[i % COLORS.length]}" stroke="#0071E3" stroke-width=".25"/>${labelText(p, i)}</g>`).join('')}
  </svg></div>`;
}

function labelText(p, i) {
  const b = bbox(p.poly);
  return `<text x="${(b.minX + b.maxX) / 2}" y="${(b.minY + b.maxY) / 2}" font-size="1.1" text-anchor="middle" fill="#1D1D1F">${esc(p.name)}</text>`;
}

function render() {
  document.querySelectorAll('#tabs [data-go]').forEach((b) => { const on = (b.dataset.go === 'box') === (state.screen === 'box'); b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  $app.innerHTML = screens[state.screen]();
  if (state.screen === 'scan') drawPhoto();
  if (state.screen === 'review') { drawPhoto(); drawOverlay(); }
  if (state.screen === 'fit') setTimeout(runFit, 30);
  const file = document.getElementById('file');
  if (file) file.addEventListener('change', onFile);
  const stage = document.getElementById('stage');
  if (stage) stage.addEventListener('pointerdown', onStageTap);
}

function drawPhoto() {
  const c = document.getElementById('photo');
  c.width = state.w; c.height = state.h;
  c.getContext('2d').drawImage(state.img, 0, 0, state.w, state.h);
}

function drawOverlay() {
  const svg = document.getElementById('overlay');
  if (!svg || !state.outlinePx) return;
  const pts = () => state.outlinePx.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  svg.innerHTML = `<polygon id="ovpoly" points="${pts()}" fill="rgba(0,113,227,.14)" stroke="#0071E3" stroke-width="3" stroke-linejoin="round"/>
    ${state.outlinePx.map((p, i) => `<circle class="ov" data-i="${i}" cx="${p.x}" cy="${p.y}" r="14" fill="rgba(255,255,255,.92)" stroke="#0071E3" stroke-width="4"/>`).join('')}`;
  let drag = -1;
  const toPhoto = (e) => {
    const r = svg.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * state.w, y: ((e.clientY - r.top) / r.height) * state.h };
  };
  svg.addEventListener('pointerdown', (e) => {
    const c = e.target.closest('circle.ov');
    if (!c) return;
    drag = +c.dataset.i;
    try { svg.setPointerCapture(e.pointerId); } catch { /* synthetic pointers may not be capturable */ }
  });
  svg.addEventListener('pointermove', (e) => {
    if (drag < 0) return;
    const p = toPhoto(e);
    state.outlinePx[drag] = { x: Math.max(0, Math.min(state.w, p.x)), y: Math.max(0, Math.min(state.h, p.y)) };
    const c = svg.querySelector(`circle.ov[data-i="${drag}"]`);
    c.setAttribute('cx', state.outlinePx[drag].x); c.setAttribute('cy', state.outlinePx[drag].y);
    svg.querySelector('#ovpoly').setAttribute('points', pts());
  });
  svg.addEventListener('pointerup', () => {
    if (drag < 0) return;
    drag = -1;
    state.outline = state.outlinePx.map((p) => state.H(p.x, p.y));
    const el = document.getElementById('area-readout');
    if (el) el.textContent = area(state.outline).toFixed(0);
  });
}

function retrace() {
  try {
    const o = scrapOutline(state.rgba, state.w, state.h, state.corners, { threshold: state.baseThr * state.sens });
    state.outlinePx = o.outlinePx;
    state.H = homographyFromCard(state.corners);
    state.outline = o.outlineCm;
    state.error = '';
  } catch (err) { state.error = err.message; }
  render();
}

function onFile(e) {
  const f = e.target.files[0];
  if (!f) return;
  const img = new Image();
  img.onload = () => {
    const max = 900, k = Math.min(1, max / Math.max(img.width, img.height));
    state.img = img; state.w = Math.round(img.width * k); state.h = Math.round(img.height * k);
    const c = document.createElement('canvas'); c.width = state.w; c.height = state.h;
    const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0, state.w, state.h);
    state.rgba = ctx.getImageData(0, 0, state.w, state.h).data;
    state.corners = []; go('scan');
  };
  img.onerror = () => { state.error = 'Could not open that photo.'; render(); };
  img.src = URL.createObjectURL(f);
}

// A drawn sample scene (not a real photo) so the flow can be tried without fabric: 10 px per cm.
// Deliberately photo-like: woven texture, printed pattern, a lighting gradient and a soft shadow,
// so the demo exercises the same pipeline stresses as a real snapshot.
function loadSample() {
  const c = document.createElement('canvas'); c.width = 640; c.height = 480;
  const x = c.getContext('2d', { willReadFrequently: true });
  const poly = [[60, 90], [330, 60], [400, 190], [360, 400], [150, 420], [70, 280]];
  // table: warm grey with a soft lighting gradient and fine grain
  const grd = x.createLinearGradient(0, 0, 640, 480);
  grd.addColorStop(0, '#DCDCE0'); grd.addColorStop(1, '#C6C6CC');
  x.fillStyle = grd; x.fillRect(0, 0, 640, 480);
  for (let i = 0; i < 2600; i++) {
    const gx = (i * 73) % 640, gy = (i * 131) % 480;
    x.fillStyle = i % 2 ? 'rgba(0,0,0,.03)' : 'rgba(255,255,255,.03)';
    x.fillRect(gx, gy, 2, 2);
  }
  // soft shadow under the scrap
  x.save(); x.translate(7, 9); x.beginPath();
  poly.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b)));
  x.closePath(); x.fillStyle = 'rgba(60,55,45,.28)'; x.filter = 'blur(6px)'; x.fill(); x.restore();
  // scrap: indigo cotton with a woven texture and a madder print
  x.save(); x.beginPath();
  poly.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b)));
  x.closePath(); x.clip();
  x.fillStyle = '#33549b'; x.fillRect(0, 0, 640, 480);
  for (let wy = 55; wy < 430; wy += 3) { x.fillStyle = wy % 6 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.06)'; x.fillRect(50, wy, 370, 1); }
  for (let wx = 55; wx < 420; wx += 3) { x.fillStyle = wx % 6 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.05)'; x.fillRect(wx, 50, 1, 380); }
  x.fillStyle = 'rgba(200,85,61,.75)';
  for (let py = 95; py < 420; py += 46) for (let px = 80 + ((py / 46) % 2) * 22; px < 400; px += 44) {
    x.beginPath(); x.arc(px, py, 5, 0, 7); x.fill();
  }
  x.restore();
  // card: rounded, off-white with print lines, like a metro card
  x.save();
  x.fillStyle = 'rgba(60,55,45,.25)'; x.filter = 'blur(3px)';
  x.beginPath(); x.roundRect(473, 123, 86, 54, 7); x.fill(); x.restore();
  x.fillStyle = '#f4f1ea'; x.beginPath(); x.roundRect(470, 120, 86, 54, 7); x.fill();
  x.fillStyle = '#2F7DE1'; x.fillRect(478, 128, 24, 6);
  x.fillStyle = 'rgba(29,29,31,.5)';
  x.fillRect(478, 140, 70, 3); x.fillRect(478, 147, 54, 3); x.fillRect(478, 154, 62, 3);
  x.fillStyle = 'rgba(29,29,31,.28)'; x.fillRect(478, 163, 30, 5);
  state.img = c; state.w = 640; state.h = 480;
  state.rgba = x.getImageData(0, 0, 640, 480).data;
  state.corners = [{ x: 470, y: 120 }, { x: 556, y: 120 }, { x: 556, y: 174 }, { x: 470, y: 174 }];
  go('scan');
}

function onStageTap(e) {
  if (state.corners.length >= 4) return;
  const r = e.currentTarget.getBoundingClientRect();
  state.corners.push({ x: ((e.clientX - r.left) / r.width) * state.w, y: ((e.clientY - r.top) / r.height) * state.h });
  render();
}

function runFit() {
  const pr = state.project;
  if (pr && pr.id !== '__any') state.result = fitPieces(state.outline, expandPieces(pr));
  else { state.suggest = suggestProjects(state.outline, PROJECTS, expandPieces); state.result = state.suggest[0] ? state.suggest[0].result : { placed: [], skipped: [], utilization: 0 }; }
  go('result');
}

$app.addEventListener('click', (e) => {
  const t = e.target.closest('button,[data-go],[data-project]');
  if (!t) return;
  if (t.dataset.go) return go(t.dataset.go);
  if (t.dataset.project) { state.project = t.dataset.project === '__any' ? { id: '__any' } : PROJECTS.find((p) => p.id === t.dataset.project); return go('card'); }
  if (t.dataset.suggest) { const s = state.suggest[+t.dataset.suggest]; state.project = s.project; state.result = s.result; return go('result'); }
  if (t.dataset.use) { const s = loadBox()[+t.dataset.use]; state.outline = s.outline; state.project = null; state.img = null; return go('pick_for_box'); }
  switch (t.dataset.act) {
    case 'start': return go('pick');
    case 'sample': return loadSample();
    case 'reset-corners': state.corners = []; return render();
    case 'trace':
      try {
        const o = scrapOutline(state.rgba, state.w, state.h, state.corners);
        state.outlinePx = o.outlinePx; state.baseThr = o.threshold; state.sens = 1;
        state.H = homographyFromCard(state.corners); state.outline = o.outlineCm;
        go('review');
      } catch (err) { state.error = err.message; render(); }
      return;
    case 'sens-down': state.sens = Math.max(0.3, state.sens * 0.8); return retrace();
    case 'sens-up': state.sens = Math.min(3, state.sens * 1.25); return retrace();
    case 'use-outline': normalise(); return go('fit');
    case 'save': {
      const box = loadBox(); box.unshift({ name: `Scrap ${box.length + 1}`, outline: state.outline, areaCm2: area(state.outline), date: new Date().toISOString().slice(0, 10) });
      saveBox(box.slice(0, 30)); t.textContent = 'Saved'; return;
    }
    case 'export': return go('export');
    case 'print': return window.print();
    case 'svg': return downloadSvg();
  }
});
screens.pick_for_box = () => screens.pick();

function normalise() { const b = bbox(state.outline); state.outline = translate(state.outline, -b.minX, -b.minY); }

function downloadSvg() {
  const svg = document.querySelector('.printarea svg').outerHTML;
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })); a.download = 'patchspan-layout.svg'; a.click();
}

// Scrap box "Use": pick a project, then skip the photo and fit straight away.
const origGo = go;
$app.addEventListener('click', (e) => {
  const t = e.target.closest('[data-project]');
  if (t && state.outline && !state.img && state.screen === 'pick_for_box') { setTimeout(() => origGo('fit'), 0); e.stopImmediatePropagation(); }
}, true);

render();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
