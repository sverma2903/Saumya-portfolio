/**
 * terrain.js · OWNER: WP2 (SPEC SM1). The cover sheet's site: her △○□ mark as terrain.
 *
 * Plain ESM JavaScript (no TypeScript, no DOM) so both the browser hero (scripts/hero/*) and the build tool
 * (tools/siteplan-svg.mjs) import the SAME height function. The GLSL in scripts/hero/siteplan.ts mirrors `base`,
 * `sdTri`, `sdBox` and `H` term for term: change one, change both.
 *
 * Ported from the winning prototype (concepts/drawing-set/index.html §I). Kept:
 *   · the height function's terms (ground + max(dome, mesa, pyramid)) — with two changes, both documented below: the
 *     ground fades out under the landforms (so the summits read +26/+22/+15 and the isolines are her exact shapes), and
 *     two phases of the ground's first term moved (so no stray closed contour reads as a fourth mark),
 *   · the unit convention: positions and radii are in "units" of `unit = max(frameHeight, 560)` css px,
 *   · the primitive placement: tri (.20w, .64h) r .36s · circ (.70w, .27h) r .30s · sq (.74w, .77h) half .19s radius .03s.
 * Coordinates are css px relative to the GL frame's top-left (the whole cover ≥ 1024px, the drawing block below), y down.
 */

export const S3 = Math.sqrt(3);

/** Contour interval (m) of the canonical drawing, and the index-contour period (every 5th is heavier). */
export const INTERVAL = 1.25;
export const INDEX_EVERY = 5;
/** The rest pose: the plan is cut at 55% of its height, the rust isoline sits at +12.00 (as in the static fallback). */
export const REST_CUT = 0.55;
export const REST_FOCUS = 12;
/** The spec's nominal survey x (fraction of the plan width); the projector settles on the +12.00 crossing nearest it. */
export const SURVEY_X = 0.62;
/** Cut-plane poché never drops below +6.00, so it only ever cuts the three landforms, never the ground. */
export const POCHE_FLOOR = 6;
/** Section elevation window (m): the datum ±0.00 sits 6 m above the band's floor, the summits fit under +30. */
export const SECTION_LO = -6;
export const SECTION_HI = 30;

/**
 * The rolling ground the mark rises out of (units in, metres out). The prototype's terms; only the first term's two
 * phases moved (.4 → .8, −.2 → −.3) so that no small closed ground contour forms anywhere on the sheet at any layout
 * from 320 to 2560 px (the prototype's phases drew a free-standing oval that read as a fourth mark beside her △○□).
 * Checked with marching squares over the measured layouts; range −2.2 … +5.8 m.
 */
export const base = (x, y) =>
  2.2 * Math.sin(x * 3.1 + 0.8) * Math.sin(y * 2.7 - 0.3) +
  1.4 * Math.sin(x * 5.3 + y * 3.9 + 1.3) +
  0.6 * Math.sin(x * 9.7 - y * 7.1 + 0.7) +
  1.2 * x;

/** Signed distance to an equilateral triangle of half-side r, apex up in its own (y-up) frame (iq). */
export function sdTri(px, py, r) {
  px = Math.abs(px) - r;
  py = py + r / S3;
  if (px + S3 * py > 0) {
    const nx = (px - S3 * py) / 2, ny = (-S3 * px - py) / 2;
    px = nx; py = ny;
  }
  px -= Math.min(Math.max(px, -2 * r), 0);
  return -Math.hypot(px, py) * Math.sign(py);
}

/** Signed distance to a rounded square of half-size b and corner radius r. */
export function sdBox(px, py, b, r) {
  const dx = Math.abs(px) - b + r, dy = Math.abs(py) - b + r;
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r;
}

/** GLSL smoothstep (also for a > b, as the mesa edge uses). */
export const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * @typedef {{ unit: number, s: number, narrow: boolean,
 *   tri: [number, number, number], circ: [number, number, number], sq: [number, number, number, number] }} Site
 *   `tri`/`circ`/`sq` are in units: [x, y, r] · [x, y, r] · [x, y, halfSize, cornerRadius].
 * @typedef {{ x: number, y: number, w: number, h: number }} Rect   css px, frame-relative
 */

/** The ground fades out as a landform rises, and is gone from GROUND_OUT (m) up (see H). */
export const GROUND_OUT = 12;

/**
 * Elevation (m) at (x, y) in units: the highest of the three landforms, standing on the ground.
 * One change to the prototype's `base + max(dome, mesa, pyr)`: the ground term fades out as a landform rises
 * (weight 1 − smoothstep(0, GROUND_OUT, land)), so from +12.00 up every level is exactly her △, ○ and □ — the summits
 * read +26.00, +22.00 and +15.00 on every sheet size (SPEC SM1), the mesa's plateau is flat, and an isoline at +12
 * traces a true triangle, circle and rounded square instead of shapes sheared by the ground's tilt. The ramp is wide
 * enough that the blend stays monotonic over the ground's whole range (d/dland ≥ 1 − 5.8 · 1.5/12 > 0).
 * @param {number} x @param {number} y @param {Site} U
 */
export function H(x, y, U) {
  const land = landform(x, y, U);
  return base(x, y) * (1 - smooth(0, GROUND_OUT, land)) + land;
}

/** The highest of the three landforms at (x, y) in units (m, 0 off the landforms). @param {number} x @param {number} y @param {Site} U */
export function landform(x, y, U) {
  const [cx, cy, cr] = U.circ;
  const d = Math.hypot(x - cx, y - cy) / cr;
  const dome = d < 1 ? 11 * (1 + Math.cos(Math.PI * d)) : 0;
  const [sx, sy, sb, sr] = U.sq;
  const mesa = 15 * smooth(0.05, -0.045, sdBox(x - sx, y - sy, sb, sr));
  const [tx, ty, tr] = U.tri;
  const st = sdTri(x - tx, -(y - ty), tr);
  const pyr = 26 * Math.min(1, Math.max(0, -st / (tr / S3)));
  return Math.max(dome, mesa, pyr);
}

/** Elevation at frame css px. @param {number} x @param {number} y @param {Site} U */
export const Hpx = (x, y, U) => H(x / U.unit, y / U.unit, U);

/**
 * Place the three primitives in the plan box (SPEC SM1 "Build").
 * `s = min(planW, planH)`, and `min(planW·.52, planH)` when the box is narrow. A box is narrow when it is less than
 * 1.92 : 1 — at 1280 and 1440 that is identical to the wide rule, and below it keeps the pyramid inside the box.
 * @param {Rect} frame @param {Rect} plan @param {Rect} [_sect] @param {boolean} [isNarrow]
 * @returns {Site}
 */
export function layoutPrimitives(frame, plan, _sect, isNarrow = plan.w / plan.h < 1.92) {
  const unit = Math.max(frame.h, 560);
  const s = isNarrow ? Math.min(plan.w * 0.52, plan.h) : Math.min(plan.w, plan.h);
  const u = unit;
  return {
    unit,
    s,
    narrow: isNarrow,
    tri: [(plan.x + plan.w * 0.2) / u, (plan.y + plan.h * 0.64) / u, (s * 0.36) / u],
    circ: [(plan.x + plan.w * 0.7) / u, (plan.y + plan.h * 0.27) / u, (s * 0.3) / u],
    sq: [(plan.x + plan.w * 0.74) / u, (plan.y + plan.h * 0.77) / u, (s * 0.19) / u, (s * 0.03) / u],
  };
}

/** The contour interval for this layout: 1.25 m, doubled when the landforms are drawn small (they would crowd). */
export const intervalFor = (U) => (U.s < 240 ? INTERVAL * 2 : INTERVAL);

/**
 * The three landforms in css px, with their spot levels for the leaders: the pyramid's apex (the triangle's centroid),
 * the dome's summit and the mesa's plateau. The ground is gone at those heights (see H), so they read exactly
 * +26.00, +22.00 and +15.00 on every sheet size — and agree with the EL readout at the same points.
 * @param {Site} U
 * @returns {{ kind: 'tri'|'circ'|'sq', x: number, y: number, r: number, top: number, extent: number }[]}
 *   `x, y` the spot point, `r` the footprint radius (half-size for the mesa), `extent` the centre lines' half-length.
 */
export function landforms(U) {
  const u = U.unit;
  const [tx, ty, tr] = U.tri, [cx, cy, cr] = U.circ, [sx, sy, sb] = U.sq;
  return [
    { kind: 'tri', x: tx * u, y: ty * u, r: tr * u, top: H(tx, ty, U), extent: tr * u * 1.08 },
    { kind: 'circ', x: cx * u, y: cy * u, r: cr * u, top: H(cx, cy, U), extent: cr * u * 1.18 },
    { kind: 'sq', x: sx * u, y: sy * u, r: sb * u, top: H(sx, sy, U), extent: sb * u * 1.5 },
  ];
}

/**
 * The sun's direction at a local hour (SPEC SM1 change 2): t = (hour − 6) / 12 → (cos πt, sin πt), y down, so east in
 * the morning, south at noon, west in the evening; outside 06:00–18:00 it falls back to t = .95 (17:24).
 * @param {number} hour 0–24 (fractional)
 * @returns {[number, number]}
 */
export function sunDir(hour) {
  const t = hour >= 6 && hour <= 18 ? (hour - 6) / 12 : 0.95;
  return [Math.cos(Math.PI * t), Math.sin(Math.PI * t)];
}
/** The hour the sun is drawn for (the night fallback is 17:24). @param {number} hour */
export const sunHour = (hour) => (hour >= 6 && hour <= 18 ? hour : 17.4);

/**
 * The section's vertical scale: TRUE scale, 1 m vertical = 1 m horizontal = `pxPerM` px (no exaggeration), so the graphic
 * scale bar is exact for both the plan and the section. The window [SECTION_LO, SECTION_HI] fills the band.
 * @param {Rect} sect
 */
export function sectionScale(sect) {
  const pad = 6;
  const pxPerM = (sect.h - pad) / (SECTION_HI - SECTION_LO);
  const floor = sect.y + sect.h;
  return { pxPerM, floor, datum: floor + SECTION_LO * pxPerM, Y: (h) => floor - (h - SECTION_LO) * pxPerM };
}

/**
 * Where does the cut line (frame y) meet the contour at `level`? Returns the crossing x (css px) nearest `near`,
 * or null. Sampled every 2 px and refined linearly (the same resolution the section is drawn at).
 * @param {Site} U @param {number} cutY @param {number} level @param {number} x0 @param {number} x1 @param {number} near
 */
export function crossingX(U, cutY, level, x0, x1, near) {
  let best = null, bestD = Infinity;
  const y = cutY / U.unit;
  let px = x0, pv = H(x0 / U.unit, y, U) - level;
  for (let x = x0 + 2; x <= x1; x += 2) {
    const v = H(x / U.unit, y, U) - level;
    if ((pv < 0) !== (v < 0)) {
      const cx = px + (x - px) * (pv / (pv - v));
      const d = Math.abs(cx - near);
      if (d < bestD) { bestD = d; best = cx; }
    }
    px = x; pv = v;
  }
  return best;
}

/**
 * The rest pose (SPEC SM1 loop): cut at 55% of the plan, the rust isoline at +12.00, and the survey point — where the
 * projector drops to the section — on the +12.00 contour where it crosses the cut, nearest the nominal .62w.
 * Plan isoline, section ▼ and the static fallback therefore all read the same level.
 * @param {Site} U @param {Rect} plan
 */
export function restPose(U, plan) {
  const cutY = plan.y + plan.h * REST_CUT;
  const nominal = plan.x + plan.w * SURVEY_X;
  const x = crossingX(U, cutY, REST_FOCUS, plan.x + 4, plan.x + plan.w - 4, nominal);
  return { cutY, surveyX: x ?? nominal, focus: REST_FOCUS };
}

/** '+12.00' · '−3.41' (U+2212) · '±0.00' — spot-level notation. @param {number} h */
export function formatLevel(h) {
  const v = Math.round(h * 100) / 100;
  if (v === 0) return '±0.00';
  return `${v > 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}`;
}
