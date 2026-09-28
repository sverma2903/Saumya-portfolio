#!/usr/bin/env node
/**
 * tools/siteplan-svg.mjs · OWNER: WP2 (SPEC SM1 "Fallbacks"). `npm run gen`
 *
 * Generates src/components/home/SitePlanFallback.astro: the static drawing of the cover sheet, shown with no JS, no
 * WebGL2, reduced motion / Motion off, Save-Data, low memory, a lost context, in print and in forced colours.
 * It imports the SAME height function as the live hero (src/lib/terrain.js) and draws the rest pose of the canonical
 * layouts — so the static sheet and the settled live sheet are the same drawing:
 *   · contours every 1.25 m (every 5th heavier), found by marching squares and simplified by Douglas–Peucker (ε 0.6 px),
 *     faded where they crowd, as the shader does;
 *   · slope hatching lit by the sun at 17:24 (45°, and the cross-hatch in deep shade) as filled iso-regions;
 *   · the rust isoline at +12.00 and the rust poché above +12;
 *   · cut A–A at 55% with its section heads, the survey crosses, the centre lines, the north arrow, the leaders;
 *   · Section A–A at true scale: cut profile, earth poché, three "beyond" profiles with hidden-line removal, datum, the
 *     projector to +12.00, and the graphic scale.
 * Numbers are HTML (fixed 11.5–12px, so they never scale below the minimum text size with the drawing); words come
 * from chrome.ts. Two variants: wide (≥ 768px: the 1440 × 900 desktop column) and narrow (the 390px phone block).
 * Budget (SPEC): ≤ 30 KB raw / ≤ 9 KB gzip for the drawing — enforced below (the run fails when exceeded).
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import {
  Hpx, base, layoutPrimitives, landforms, restPose, sectionScale, sunDir, formatLevel, intervalFor,
  INDEX_EVERY, REST_FOCUS,
} from '../src/lib/terrain.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src/components/home/SitePlanFallback.astro');
const BUDGET_RAW = 30 * 1024, BUDGET_GZ = 9 * 1024;
const SUN_HOUR = 17.4; // 17:24 — the spec's night fallback and its mockup's ☀ 17:24

/**
 * Canonical layouts (css px, relative to the GL frame), from CoverSheet.astro's CSS:
 *  wide   — 1440 × 900: cover 704 (clamp(620, 900 − 56 − 140, 820)); padding 56; 12 cols of 88.67 + 24 gaps;
 *           drawing = cols 6–12 → x 619.33, w 764.67; plan 8%→64% of 704; section 70%→86%.
 *  narrow — 390 × 844: the frame is the drawing block bled to the viewport edges; hint 15.6 + 16; plan 358 × 358;
 *           section 32 below, 120 tall; legend 16 + 48 below it.
 */
const VARIANTS = [
  {
    id: 'w', frame: { x: 0, y: 0, w: 1440, h: 704 },
    plan: { x: 619.33, y: 56.32, w: 764.67, h: 394.24 }, sect: { x: 619.33, y: 492.8, w: 764.67, h: 112.64 },
    cell: 3, leaders: true,
  },
  {
    id: 'n', frame: { x: 0, y: 0, w: 390, h: 605.6 },
    plan: { x: 16, y: 31.6, w: 358, h: 358 }, sect: { x: 16, y: 421.6, w: 358, h: 120 },
    cell: 2.4, leaders: false,
  },
];

// ───────────────────────────── geometry helpers ─────────────────────────────
const f1 = (v) => {
  const r = Math.round(v * 10) / 10;
  const s = (Object.is(r, -0) ? 0 : r).toString();
  return s.replace(/^(-?)0\./, '$1.');
};
/** polyline → compact path data (absolute M, then relative l with 0.1 px precision) */
function pathOf(pts, close = false) {
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  let px = Math.round(pts[0][0] * 10), py = Math.round(pts[0][1] * 10);
  let seg = 'l';
  for (let i = 1; i < pts.length; i++) {
    const X = Math.round(pts[i][0] * 10), Y = Math.round(pts[i][1] * 10);
    const dx = (X - px) / 10, dy = (Y - py) / 10;
    if (!dx && !dy) continue;
    const a = f1(dx), b = f1(dy);
    seg += (seg.length > 1 && !a.startsWith('-') ? ' ' : '') + a + (b.startsWith('-') ? '' : ' ') + b;
    px = X; py = Y;
  }
  return d + (seg.length > 1 ? seg : '') + (close ? 'z' : '');
}

/** Douglas–Peucker */
function simplify(pts, eps) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    let best = -1, bi = -1;
    for (let i = a + 1; i < b; i++) {
      // a closed loop starts and ends on the same point: measure to that point, not to a zero-length chord
      const d = len < 1e-6 ? Math.hypot(pts[i][0] - ax, pts[i][1] - ay) : Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len;
      if (d > best) { best = d; bi = i; }
    }
    if (best > eps) { keep[bi] = 1; stack.push([a, bi], [bi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

/**
 * Marching squares on a sampled field (row-major, nx × ny samples at x0 + i·dx, y0 + j·dy).
 * Returns polylines (closed ones repeat their first point at the end). Saddles resolved by the cell's mean.
 */
function marching(field, nx, ny, x0, y0, dx, dy, level) {
  const V = (i, j) => field[j * nx + i];
  const pt = new Map();
  const edgePoint = (key, ax, ay, av, bx, by, bv) => {
    let p = pt.get(key);
    if (!p) { const t = (level - av) / (bv - av); p = [ax + (bx - ax) * t, ay + (by - ay) * t]; pt.set(key, p); }
    return p;
  };
  const segs = [];
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = V(i, j), b = V(i + 1, j), c = V(i + 1, j + 1), d = V(i, j + 1);
    const code = (a > level ? 1 : 0) | (b > level ? 2 : 0) | (c > level ? 4 : 0) | (d > level ? 8 : 0);
    if (code === 0 || code === 15) continue;
    const X = x0 + i * dx, Y = y0 + j * dy;
    const top = () => [`h${i},${j}`, () => edgePoint(`h${i},${j}`, X, Y, a, X + dx, Y, b)];
    const right = () => [`v${i + 1},${j}`, () => edgePoint(`v${i + 1},${j}`, X + dx, Y, b, X + dx, Y + dy, c)];
    const bottom = () => [`h${i},${j + 1}`, () => edgePoint(`h${i},${j + 1}`, X, Y + dy, d, X + dx, Y + dy, c)];
    const left = () => [`v${i},${j}`, () => edgePoint(`v${i},${j}`, X, Y, a, X, Y + dy, d)];
    const add = (p, q) => segs.push([p, q]);
    const mid = (a + b + c + d) / 4 > level;
    switch (code) {
      case 1: case 14: add(left(), top()); break;
      case 2: case 13: add(top(), right()); break;
      case 3: case 12: add(left(), right()); break;
      case 4: case 11: add(right(), bottom()); break;
      case 6: case 9: add(top(), bottom()); break;
      case 7: case 8: add(left(), bottom()); break;
      case 5: if (mid) { add(left(), top()); add(right(), bottom()); } else { add(left(), bottom()); add(top(), right()); } break;
      case 10: if (mid) { add(top(), right()); add(left(), bottom()); } else { add(left(), top()); add(right(), bottom()); } break;
    }
  }
  // stitch segments into polylines by shared edge keys
  const ends = new Map();
  const segList = segs.map(([p, q]) => ({ a: p[0], b: q[0], pa: p[1](), pb: q[1](), used: false }));
  for (const s of segList) {
    for (const k of [s.a, s.b]) { const l = ends.get(k); if (l) l.push(s); else ends.set(k, [s]); }
  }
  const lines = [];
  for (const s0 of segList) {
    if (s0.used) continue;
    s0.used = true;
    const keys = [s0.a, s0.b], pts = [s0.pa, s0.pb];
    for (const dir of [1, 0]) {
      for (;;) {
        const k = dir ? keys[keys.length - 1] : keys[0];
        const next = (ends.get(k) ?? []).find((s) => !s.used);
        if (!next) break;
        next.used = true;
        const [nk, np] = next.a === k ? [next.b, next.pb] : [next.a, next.pa];
        if (dir) { keys.push(nk); pts.push(np); } else { keys.unshift(nk); pts.unshift(np); }
      }
    }
    lines.push(pts);
  }
  return lines;
}

function sample(fn, x0, y0, x1, y1, cell, pad = false) {
  const nx = Math.ceil((x1 - x0) / cell) + 1, ny = Math.ceil((y1 - y0) / cell) + 1;
  const dx = (x1 - x0) / (nx - 1), dy = (y1 - y0) / (ny - 1);
  const f = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    f[j * nx + i] = pad && (i === 0 || j === 0 || i === nx - 1 || j === ny - 1) ? -1e9 : fn(x0 + i * dx, y0 + j * dy);
  }
  return { f, nx, ny, x0, y0, dx, dy };
}

// ───────────────────────────── one variant ─────────────────────────────
function variant(V) {
  const { frame, plan, sect } = V;
  const U = layoutPrimitives(frame, plan, sect);
  const forms = landforms(U);
  const rest = restPose(U, plan);
  const I = intervalFor(U);
  const u = U.unit;
  const Hh = (x, y) => Hpx(x, y, U);
  const [sdx, sdy] = sunDir(SUN_HOUR);
  const sc = sectionScale(sect);

  // the drawing's extent: the plan (+ the north arrow's N and the dome's top rings) down to the scale bar's labels
  const vb = { x: plan.x, y: plan.y - 30, w: plan.w, h: sect.y + sect.h + 62 - (plan.y - 30) };
  const P = (x) => (((x - vb.x) / vb.w) * 100).toFixed(2);
  const Q = (y) => (((y - vb.y) / vb.h) * 100).toFixed(2);
  const out = [];
  const labels = [];
  const label = (text, x, y, anchor = 'start', cls = '') => labels.push({ text, x: P(x), y: Q(y), anchor, cls });

  // ── contours over the plan (+ a margin that fades out) ──
  const M = 22;
  const g = sample(Hh, plan.x - M, plan.y - M, plan.x + plan.w + M, plan.y + plan.h + M, V.cell);
  let lo = Infinity, hi = -Infinity;
  for (const v of g.f) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const grad = (x, y) => {
    const e = 1;
    return Math.hypot(Hh(x + e, y) - Hh(x - e, y), Hh(x, y + e) - Hh(x, y - e)) / (2 * e);
  };
  const minor = [], index = [];
  for (let k = Math.ceil(lo / I); k <= Math.floor(hi / I); k++) {
    const level = k * I;
    for (const line of marching(g.f, g.nx, g.ny, g.x0, g.y0, g.dx, g.dy, level)) {
      // break the line where contours crowd (spacing < 3 px), as the shader fades them
      let run = [];
      const flush = () => { if (run.length > 1) (k % INDEX_EVERY === 0 ? index : minor).push(simplify(run, 0.6)); run = []; };
      for (const p of line) {
        if (I / Math.max(grad(p[0], p[1]), 1e-6) < 3) flush();
        else run.push(p);
      }
      flush();
    }
  }
  const fadeId = `spf-${V.id}-f`;
  out.push(`<defs><linearGradient id="${fadeId}x" x1="${f1(plan.x - M)}" x2="${f1(plan.x + plan.w + M)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#000"/><stop offset="${(M * 1.6 / (plan.w + 2 * M)).toFixed(3)}" stop-color="#fff"/><stop offset="${(1 - (M * 1.6) / (plan.w + 2 * M)).toFixed(3)}" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>`
    + `<linearGradient id="${fadeId}y" y1="${f1(plan.y - M)}" y2="${f1(plan.y + plan.h + M)}" x1="0" x2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#000"/><stop offset="${(M * 1.6 / (plan.h + 2 * M)).toFixed(3)}" stop-color="#fff"/><stop offset="${(1 - (M * 1.6) / (plan.h + 2 * M)).toFixed(3)}" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>`
    + `<mask id="${fadeId}mx" maskUnits="userSpaceOnUse" x="${f1(vb.x)}" y="${f1(vb.y)}" width="${f1(vb.w)}" height="${f1(vb.h)}"><rect x="${f1(vb.x)}" y="${f1(vb.y)}" width="${f1(vb.w)}" height="${f1(vb.h)}" fill="url(#${fadeId}x)"/></mask>`
    + `<mask id="${fadeId}my" maskUnits="userSpaceOnUse" x="${f1(vb.x)}" y="${f1(vb.y)}" width="${f1(vb.w)}" height="${f1(vb.h)}"><rect x="${f1(vb.x)}" y="${f1(vb.y)}" width="${f1(vb.w)}" height="${f1(vb.h)}" fill="url(#${fadeId}y)"/></mask>`
    + `<pattern id="spf-${V.id}-h1" width="5.5" height="5.5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0v5.5" class="spf__hl"/></pattern>`
    + `<pattern id="spf-${V.id}-h2" width="5.5" height="5.5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><path d="M0 0v5.5" class="spf__hl"/></pattern>`
    + `<pattern id="spf-${V.id}-pr" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><path d="M0 0v7" class="spf__pr"/></pattern>`
    + `<pattern id="spf-${V.id}-e" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0v6" class="spf__el"/></pattern>`
    + `<pattern id="spf-${V.id}-s" width="64" height="64" x="${f1(-32)}" y="${f1(-32)}" patternUnits="userSpaceOnUse"><path d="M28.5 32h7M32 28.5v7" class="spf__sv"/></pattern>`
    + `</defs>`);
  out.push(`<g mask="url(#${fadeId}mx)"><g mask="url(#${fadeId}my)">`
    + `<path class="spf__c" d="${minor.map((l) => pathOf(l)).join('')}"/>`
    + `<path class="spf__c spf__c--i" d="${index.map((l) => pathOf(l)).join('')}"/>`);

  // ── slope hatching lit by the sun at 17:24: filled iso-regions of the shader's shade × slope terms ──
  const e = 1.2 / u, Sc = 260;
  const Lz0 = Math.hypot(sdx * 0.82, sdy * 0.82, 0.58);
  const L = [(sdx * 0.82) / Lz0, (sdy * 0.82) / Lz0, 0.58 / Lz0];
  const shadeAt = (x, y) => {
    const px = x / u, py = y / u;
    const hx = (Hpx((px + e) * u, y, U) - Hpx((px - e) * u, y, U)) / (2 * e) / Sc;
    const hy = (Hpx(x, (py + e) * u, U) - Hpx(x, (py - e) * u, U)) / (2 * e) / Sc;
    const n = Math.hypot(hx, hy, 1);
    const nd = (-hx * L[0] - hy * L[1] + L[2]) / n;
    return { shade: Math.min(1, Math.max(0, L[2] - nd)), slope: Math.hypot(hx, hy) };
  };
  const hs = sample((x, y) => { const s = shadeAt(x, y); return Math.min(s.shade - 0.13, (s.slope - 0.06) * 3); }, plan.x - M, plan.y - M, plan.x + plan.w + M, plan.y + plan.h + M, V.cell, true);
  const hs2 = sample((x, y) => { const s = shadeAt(x, y); return Math.min(s.shade - 0.4, (s.slope - 0.06) * 3); }, plan.x - M, plan.y - M, plan.x + plan.w + M, plan.y + plan.h + M, V.cell, true);
  const regions = (fld) => marching(fld.f, fld.nx, fld.ny, fld.x0, fld.y0, fld.dx, fld.dy, 0)
    .filter((l) => l.length > 4)
    .map((l) => pathOf(simplify(l, 0.7), true)).join('');
  out.push(`<path d="${regions(hs)}" fill="url(#spf-${V.id}-h1)" fill-rule="evenodd"/>`);
  out.push(`<path d="${regions(hs2)}" fill="url(#spf-${V.id}-h2)" fill-rule="evenodd"/>`);
  out.push(`</g></g>`);

  // ── the rust isoline at +12.00 and the poché above it (closed regions of the landforms) ──
  const iso = sample(Hh, plan.x - 2, plan.y - 2, plan.x + plan.w + 2, plan.y + plan.h + 2, V.cell * 0.75, true);
  const isoD = marching(iso.f, iso.nx, iso.ny, iso.x0, iso.y0, iso.dx, iso.dy, REST_FOCUS)
    .filter((l) => l.length > 6)
    .map((l) => pathOf(simplify(l, 0.45), true)).join('');
  out.push(`<path d="${isoD}" fill="url(#spf-${V.id}-pr)" fill-rule="evenodd"/>`);
  out.push(`<path d="${isoD}" class="spf__iso"/>`);

  // ── survey crosses (every 64 px, frame-aligned) and the clay centre lines through her △○□ ──
  out.push(`<rect x="${f1(plan.x + 10)}" y="${f1(plan.y + 10)}" width="${f1(plan.w - 20)}" height="${f1(plan.h - 16)}" fill="url(#spf-${V.id}-s)"/>`);
  const cx0 = plan.x + 4, cx1 = plan.x + plan.w - 4, cy0 = plan.y + 4, cy1 = plan.y + plan.h - 4;
  out.push(`<path class="spf__cl" d="${forms.map((f) => {
    const a = Math.max(cx0, f.x - f.extent), b = Math.min(cx1, f.x + f.extent), t = Math.max(cy0, f.y - f.extent), d = Math.min(cy1, f.y + f.extent);
    return `M${f1(a)} ${f1(f.y)}H${f1(b)}M${f1(f.x)} ${f1(t)}V${f1(d)}`;
  }).join('')}"/>`);

  // ── cut line A–A (55%) with its section heads, looking north ──
  const cy = rest.cutY, R = 11;
  const heads = [plan.x + R + 1, plan.x + plan.w - R - 1];
  out.push(`<path class="spf__cut" d="M${f1(plan.x + 2 * R + 4)} ${f1(cy)}H${f1(plan.x + plan.w - 2 * R - 4)}"/>`);
  for (const hx of heads) {
    out.push(`<path class="spf__ink" d="M${f1(hx - R)} ${f1(cy)}L${f1(hx)} ${f1(cy - R - 7)}L${f1(hx + R)} ${f1(cy)}z"/>`
      + `<circle class="spf__bub" cx="${f1(hx)}" cy="${f1(cy)}" r="${R}"/>`
      + `<path class="spf__glyph" d="M${f1(hx - 3.4)} ${f1(cy + 4.2)}L${f1(hx)} ${f1(cy - 4.6)}L${f1(hx + 3.4)} ${f1(cy + 4.2)}M${f1(hx - 2.1)} ${f1(cy + 1)}h4.2"/>`);
  }

  // ── north arrow (N drawn as a path) ──
  const nr = 13, nx0 = plan.x + plan.w - nr - 18, ny0 = plan.y + nr + 16;
  out.push(`<circle class="spf__line" cx="${f1(nx0)}" cy="${f1(ny0)}" r="${nr}"/>`
    + `<path class="spf__ink" d="M${f1(nx0)} ${f1(ny0 - nr + 2)}L${f1(nx0 + 5)} ${f1(ny0 + nr - 3)}L${f1(nx0)} ${f1(ny0 + nr - 7)}z"/>`
    + `<path class="spf__line" d="M${f1(nx0)} ${f1(ny0 - nr + 2)}L${f1(nx0 - 5)} ${f1(ny0 + nr - 3)}L${f1(nx0)} ${f1(ny0 + nr - 7)}z"/>`
    + `<path class="spf__glyph" d="M${f1(nx0 - 3.2)} ${f1(ny0 - nr - 4)}v-8.4l6.4 8.4v-8.4"/>`);

  // ── leaders: the live overlay's placement rule (section2d.ts), at the rest pose ──
  if (V.leaders) {
    const form = (x, y) => Hh(x, y) - base(x / u, y / u) > 0.25;
    const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const taken = [{ x: nx0 - nr - 44, y: ny0 - nr - 22, w: nr * 2 + 50, h: nr * 2 + 52 }, { x: plan.x, y: cy - 16, w: plan.w, h: 32 }];
    const onAnyForm = (r) => { for (let i = 0; i <= 3; i++) for (let j = 0; j <= 2; j++) if (form(r.x + (r.w * i) / 3, r.y + (r.h * j) / 2)) return true; return false; };
    const dirs = [];
    for (const deg of [45, 30, 60, 0, -30, -45]) for (const side of [1, -1]) dirs.push([side * Math.cos((deg * Math.PI) / 180), -Math.sin((deg * Math.PI) / 180)]);
    const charW = 7.2; // Plex Mono 500 at 12px advance
    for (const f of forms) {
      const text = formatLevel(f.top);
      const w = 14 + text.length * charW;
      for (const [dx, dy] of dirs) {
        const t0 = f.kind === 'sq' ? f.r * 0.62 : 0;
        const dot = [f.x + dx * t0, f.y + dy * t0];
        let t = t0 + 4;
        while (t < f.r * 3 && form(f.x + dx * t, f.y + dy * t)) t += 2;
        const elbow = [f.x + dx * (t + 12), f.y + dy * (t + 12)];
        const side = dx >= 0 ? 1 : -1;
        const endX = elbow[0] + side * 16;
        const box = { x: side > 0 ? endX + 3 : endX - 3 - w, y: elbow[1] - 9, w, h: 18 };
        const inside = box.x >= plan.x + 6 && box.x + box.w <= plan.x + plan.w - 6 && box.y >= plan.y - 18 && box.y + box.h <= plan.y + plan.h - 6;
        if (!inside || taken.some((q) => hit(box, q)) || onAnyForm(box)) continue;
        taken.push(box);
        const sx = side > 0 ? endX + 10 : endX - w + 6;
        const sy = elbow[1];
        const sym = f.kind === 'tri' ? `<path class="spf__sym" d="M${f1(sx)} ${f1(sy - 5.2)}l4.5 7.8h-9z"/>` : f.kind === 'circ' ? `<circle class="spf__sym" cx="${f1(sx)}" cy="${f1(sy)}" r="3.8"/>` : `<rect class="spf__sym" x="${f1(sx - 3.4)}" y="${f1(sy - 3.4)}" width="6.8" height="6.8"/>`;
        out.push(`<circle class="spf__dot" cx="${f1(dot[0])}" cy="${f1(dot[1])}" r="2.4"/><path class="spf__ld" d="M${f1(dot[0])} ${f1(dot[1])}L${f1(elbow[0])} ${f1(elbow[1])}H${f1(endX)}"/>${sym}`);
        label(text, sx + 10, sy, 'start', 'spf__l--ink2');
        break;
      }
    }
  }

  // ── Section A–A at true scale ──
  const x0 = sect.x, x1 = sect.x + sect.w, step = 2, N = Math.ceil((x1 - x0) / step);
  const prof = [];
  for (let i = 0; i <= N; i++) { const x = Math.min(x0 + i * step, x1); prof.push([x, sc.Y(Hh(x, cy))]); }
  const run = prof.map(([x]) => Hh(x, cy));
  const beyond = [];
  for (const [dz, cls] of [[0.035, 'spf__b1'], [0.075, 'spf__b2'], [0.13, 'spf__b3']]) {
    const lines = [];
    let cur = [];
    for (let i = 0; i <= N; i++) {
      const x = prof[i][0], hb = Hh(x, cy - dz * u);
      if (hb > run[i] + 0.15) { cur.push([x, sc.Y(hb)]); run[i] = hb; }
      else { if (cur.length > 1) lines.push(cur); cur = []; }
    }
    if (cur.length > 1) lines.push(cur);
    beyond.push(`<path class="${cls}" d="${lines.map((l) => pathOf(simplify(l, 0.4))).join('')}"/>`);
  }
  out.push(beyond.join(''));
  const floor = sect.y + sect.h + 2;
  const profD = pathOf(simplify(prof, 0.35));
  out.push(`<path class="spf__earth" d="${profD}V${f1(floor)}H${f1(x0)}z"/>`);
  out.push(`<path d="${profD}V${f1(floor)}H${f1(x0)}z" fill="url(#spf-${V.id}-e)"/>`);
  out.push(`<path class="spf__datum" d="M${f1(x0)} ${f1(sc.Y(0) - 0.5)}H${f1(x1)}"/>`);
  out.push(`<path class="spf__prof" d="${profD}"/>`);
  label(formatLevel(0), x0 + 3, sc.Y(0) + 10, 'start', 'spf__l--sm spf__l--ink2');

  // the projector: from the survey point on the cut (the +12.00 crossing) to the ▼ on the section
  const sx = rest.surveyX, lv = Hh(sx, cy), py = sc.Y(lv);
  out.push(`<path class="spf__proj" d="M${f1(sx)} ${f1(cy + 7)}V${f1(py - 12)}"/>`
    + `<path class="spf__rust" d="M${f1(sx - 5)} ${f1(py - 11)}h10l-5 8.5z"/>`
    + `<path class="spf__rl" d="M${f1(sx - 6)} ${f1(cy)}h12M${f1(sx)} ${f1(cy - 6)}v12"/>`);
  label(formatLevel(lv), sx + 9, py - 13, 'start', 'spf__l--rust');

  // the graphic scale: 0 … 50 M at the drawing's true scale; the bar on the section title's first line, the figures on
  // its second (the title's Bubble is 44px wide-variant, 36px on phones: its two lines centre at +21/+39 or +17/+36)
  const [ly1, ly2] = V.id === 'n' ? [17, 36] : [21, 39];
  const bw = 50 * sc.pxPerM, bx = x1 - bw - 26, by = sect.y + sect.h + ly1 - 2.5;
  let bars = '';
  for (let i = 0; i < 5; i++) {
    const a = bx + (i * bw) / 5;
    bars += `<rect class="${i % 2 ? 'spf__line' : 'spf__ink'}" x="${f1(a)}" y="${f1(by)}" width="${f1(bw / 5)}" height="5"/>`;
  }
  out.push(bars);
  label('0', bx, sect.y + sect.h + ly2, 'middle', 'spf__l--sm spf__l--ink2');
  label('50 M', bx + bw + 3.5, sect.y + sect.h + ly2, 'middle', 'spf__l--sm spf__l--ink2');

  const svg = `<svg class="spf__svg" viewBox="${f1(vb.x)} ${f1(vb.y)} ${f1(vb.w)} ${f1(vb.h)}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">${out.join('')}</svg>`;
  const legend = { x: P(sect.x), y: Q(sect.y + sect.h + 8) };
  return { svg, labels, legend, aspect: `${f1(vb.w)} / ${f1(vb.h)}`, vb };
}

// ───────────────────────────── write the component ─────────────────────────────
const built = VARIANTS.map((V) => ({ V, ...variant(V) }));
const svgBytes = built.map((b) => b.svg).join('');
const raw = Buffer.byteLength(svgBytes), gz = zlib.gzipSync(svgBytes, { level: 9 }).length;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const blocks = built.map(({ V, labels, legend, aspect }) => `  <div class="spf__v spf__v--${V.id}" style="aspect-ratio: ${aspect}">
    <Fragment set:html={svg.${V.id}} />
${labels.map((l) => `    <span class="spf__l spf__l--${l.anchor} ${l.cls}" style="left:${l.x}%;top:${l.y}%">${esc(l.text)}</span>`).join('\n')}
    <div class="spf__legend" style="left:${legend.x}%;top:${legend.y}%"><Bubble n="1" sheet="A-000" /><p><span class="t-label-lg">{h.section}</span><span class="t-label">{h.scale}</span></p></div>
  </div>`).join('\n');

const file = `---
/**
 * SitePlanFallback · OWNER: WP2 — GENERATED by tools/siteplan-svg.mjs from src/lib/terrain.js (\`npm run gen\`). Do not edit.
 * The static cover-sheet drawing (SPEC SM1 "Fallbacks"): the rest pose of the live site plan — contours (1.25 m,
 * every 5th heavier), slope hatching lit at 17:24, the rust isoline and poché at +12.00, cut A–A at 55%, Section A–A at
 * true scale, north arrow, leaders, graphic scale. Wide variant ≥ 768px, narrow below. Decorative: aria-hidden.
 * The drawings are injected with set:html (so the scoped-style attribute is not stamped on every path) and styled
 * through :global() below. Drawing bytes: ${raw} raw / ${gz} gzip (budget ${BUDGET_RAW} / ${BUDGET_GZ}).
 */
import Bubble from '../symbols/Bubble.astro';
import { chrome } from '../../data/chrome';
const h = chrome.wp2.hero;
const svg = {
${built.map(({ V, svg }) => `  ${V.id}: ${JSON.stringify(svg)},`).join('\n')}
};
---
<div class="spf" aria-hidden="true">
${blocks}
</div>
<style>
  .spf { color: var(--ink); }
  .spf__v { position: relative; inline-size: 100%; }
  .spf__v--n { display: none; }
  @media (max-width: 767.98px) {
    .spf__v--w { display: none; }
    .spf__v--n { display: block; }
  }
  .spf :global(.spf__svg) { display: block; inline-size: 100%; block-size: 100%; overflow: visible; fill: none; stroke-linejoin: round; }
  .spf :global(.spf__c) { stroke: currentColor; stroke-width: 0.9; stroke-opacity: 0.24; }
  .spf :global(.spf__c--i) { stroke-width: 1.5; stroke-opacity: 0.42; }
  .spf :global(.spf__hl) { stroke: currentColor; stroke-width: 0.9; stroke-opacity: 0.34; }
  .spf :global(.spf__pr) { stroke: var(--rust); stroke-width: 1; stroke-opacity: 0.4; }
  .spf :global(.spf__el) { stroke: currentColor; stroke-width: 1; stroke-opacity: 0.3; }
  .spf :global(.spf__sv) { stroke: currentColor; stroke-opacity: 0.16; stroke-width: var(--lw-object); }
  .spf :global(.spf__iso) { stroke: var(--rust); stroke-width: 2.2; stroke-opacity: 0.9; }
  .spf :global(.spf__cl) { stroke: var(--clay); stroke-opacity: 0.6; stroke-width: var(--lw-object); stroke-dasharray: var(--dash-center); }
  .spf :global(.spf__cut) { stroke: currentColor; stroke-opacity: 0.85; stroke-width: var(--lw-object); stroke-dasharray: var(--dash-center); }
  .spf :global(.spf__ink) { fill: currentColor; stroke: currentColor; stroke-width: var(--lw-object); }
  .spf :global(.spf__line) { stroke: currentColor; stroke-width: var(--lw-object); }
  .spf :global(.spf__bub) { fill: var(--sheet); stroke: currentColor; stroke-width: var(--lw-border); }
  .spf :global(.spf__glyph) { stroke: currentColor; stroke-width: 1.3; stroke-linecap: round; }
  .spf :global(.spf__dot) { fill: var(--clay); }
  .spf :global(.spf__ld) { stroke: var(--clay); stroke-opacity: 0.72; stroke-width: var(--lw-object); }
  .spf :global(.spf__sym) { stroke: var(--ink-2); stroke-width: var(--lw-object); fill: var(--paper); }
  .spf :global(.spf__earth) { fill: var(--paper); fill-opacity: 0.9; }
  .spf :global(.spf__b1) { stroke: currentColor; stroke-opacity: 0.6; stroke-width: var(--lw-object); }
  .spf :global(.spf__b2) { stroke: currentColor; stroke-opacity: 0.42; stroke-width: var(--lw-object); }
  .spf :global(.spf__b3) { stroke: currentColor; stroke-opacity: 0.28; stroke-width: var(--lw-object); }
  .spf :global(.spf__datum) { stroke: currentColor; stroke-opacity: 0.45; stroke-width: var(--lw-dim); stroke-dasharray: 2 4; }
  .spf :global(.spf__prof) { stroke: currentColor; stroke-width: var(--lw-cut); stroke-linecap: round; }
  .spf :global(.spf__proj) { stroke: var(--rust); stroke-opacity: 0.8; stroke-width: var(--lw-dim); stroke-dasharray: 3 3; }
  .spf :global(.spf__rust) { fill: var(--rust); }
  .spf :global(.spf__rl) { stroke: var(--rust); stroke-width: var(--lw-object); }
  .spf__l {
    position: absolute; translate: 0 -50%; white-space: nowrap;
    font-family: var(--font-mono); font-size: var(--fs-code); font-weight: 500; line-height: 1;
    font-variant-numeric: tabular-nums; letter-spacing: var(--tr-code); color: var(--ink);
    text-shadow: 0 0 2px var(--paper), 0 0 2px var(--paper), 0 0 3px var(--paper);
  }
  .spf__l--middle { translate: -50% -50%; }
  .spf__l--end { translate: -100% -50%; }
  .spf__l--sm { font-size: var(--fs-code-sm); font-weight: 400; }
  .spf__l--ink2 { color: var(--ink-2); }
  .spf__l--rust { color: var(--rust); }
  .spf__legend { position: absolute; display: flex; align-items: center; gap: var(--s-3); }
  .spf__legend p { display: grid; row-gap: calc(var(--s-1) / 2); }
  .spf__legend p > :last-child { color: var(--ink-2); }
  @media print {
    .spf :global(.spf__earth) { fill-opacity: 0; }
    .spf__l { text-shadow: none; }
  }
  @media (forced-colors: active) {
    .spf { color: CanvasText; }
    .spf :global(:is(.spf__pr, .spf__iso, .spf__proj, .spf__rl, .spf__cl, .spf__ld)) { stroke: CanvasText; }
    .spf :global(:is(.spf__rust, .spf__dot)) { fill: CanvasText; }
    .spf :global(:is(.spf__bub, .spf__earth, .spf__sym)) { fill: Canvas; }
    .spf__l { color: CanvasText; text-shadow: none; }
  }
</style>
`;

fs.writeFileSync(OUT, file);
const kb = (n) => (n / 1024).toFixed(1);
console.log(`siteplan-svg: wrote ${path.relative(ROOT, OUT)} — drawing ${kb(raw)} KB raw / ${kb(gz)} KB gzip (budget ${kb(BUDGET_RAW)} / ${kb(BUDGET_GZ)})`);
for (const b of built) console.log(`  ${b.V.id}: ${kb(Buffer.byteLength(b.svg))} KB raw, ${b.labels.length} labels, viewBox ${b.aspect}`);
if (raw > BUDGET_RAW || gz > BUDGET_GZ) {
  console.error('siteplan-svg: OVER BUDGET');
  process.exitCode = 1;
}
