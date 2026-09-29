/**
 * section2d.ts · OWNER: WP2 (SPEC SM1). The Canvas2D half of the cover sheet, drawn over the WebGL site plan:
 * Section A–A on the plan's x-axis (cut profile, 45° earth poché, three "beyond" profiles with one-pass hidden-line
 * removal, the ±0.00 datum, the pen nib while drafting), the cut line A–A with its section heads, the rust projector
 * to a ▼ level marker, the EL tag beside the cursor, the survey crosses and the clay centre lines of her △○□, the
 * landform leaders (symbol + spot level), the north arrow with the sun's bearing and time, and the graphic scale.
 *
 * Words are not drawn here (Plex Sans condensed needs the `wdth` axis, which canvas cannot set): the hint and the
 * section title are HTML in CoverSheet.astro. Every colour and size comes from the tokens (resolved by siteplan.ts);
 * every text is Plex Mono ≥ --fs-code-sm (11.5px) — codes and numbers only — and △ ○ □ ▼ ☀ are drawn as vectors
 * because the font subsets do not carry them.
 */
import { Hpx, formatLevel, landform, sectionScale } from '../../lib/terrain.js';
import type { Site } from '../../lib/terrain.js';

export type RGB = [number, number, number];
export interface Rect { x: number; y: number; w: number; h: number }
export interface Palette { ink: RGB; ink2: RGB; rust: RGB; clay: RGB; sheet: RGB; paper: RGB }
/** type and line tokens: the mono stack, --fs-code / --fs-code-sm (px), --dash-center (long–short dash), --dash-hidden
 *  (the datum and the projector), and the drafting line weights --lw-cut / --lw-border / --lw-object (px) */
export interface Type { mono: string; code: number; codeSm: number; dash: number[]; hidden: number[]; lw: { cut: number; border: number; object: number } }
export interface Landform { kind: 'tri' | 'circ' | 'sq'; x: number; y: number; r: number; top: number; extent: number }

/** Everything one overlay frame needs. Geometry in frame css px (y down). */
export interface Scene {
  W: number; H: number;
  plan: Rect; sect: Rect;
  U: Site; forms: Landform[];
  /** drafting-in progress, 0…1: survey furniture, labels + cut line, rust isoline/projector, section plot */
  grid: number; ui: number; iso: number; plot: number;
  /** live values: cut line y, survey x (projector), light azimuth (radians, y down); the rest pose's cut line y */
  cut: number; sx: number; ang: number; restCut: number;
  /** EL tag beside the cursor (or the keyboard survey point) */
  tag: { x: number; y: number } | null;
  /** keyboard survey marker (the plan box has focus) */
  marker: boolean;
  /** the rest pose's survey x (the projector), which the leaders keep clear of */
  restSx: number;
  /** the visitor's local time in their locale's format, e.g. '17:24'; night = outside 06:00–18:00 (a moon, not a sun) */
  time: string; night: boolean;
  /** chrome codes: 'EL', 'N' */
  el: string; north: string;
  /** the section title (HTML legend): the centres of its two lines, so the graphic scale sits on the same lines, the
   *  bubble's centre (the row's centre line: the north arrow and the time sit on it), and its right edge, so the north
   *  arrow and the scale keep clear of it */
  legend: { y1: number; y2: number; yc: number; right: number } | null;
  /** the hint row's words (HTML, "Site plan · move to cut A–A"), kept clear by the north arrow and the leaders */
  hint: Rect | null;
}

const TAU = Math.PI * 2;
const BEYOND: [number, number][] = [[0.035, 0.6], [0.075, 0.42], [0.13, 0.28]]; // [metres north of the cut (units), alpha]
/** section-head bubble radius; the head's arrow reaches HEAD_R + 7 above the cut line */
export const HEAD_R = 11;
/** how far inside the plan box the cut line may travel, so its heads never leave the plan (siteplan.ts clamps to it) */
export const CUT_INSET_TOP = HEAD_R + 7 + 4, CUT_INSET_BOTTOM = HEAD_R + 4;
/** the drawn cut line runs between the heads: from CUT_INSET_X inside either end of the plan box */
export const CUT_INSET_X = 2 * HEAD_R + 4;
const SCALE_M = [50, 40, 25, 20, 10];   // graphic scale lengths (m), the longest that fits the legend row

const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a))})`;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** a landform leader: dot → elbow along `u` (unit vector) → shoulder to `end` (dir ±1) → the label in `box` */
interface Leader { form: Landform; dot: [number, number]; u: [number, number]; elbow: [number, number]; end: [number, number]; dir: 1 | -1; text: string; w: number; box: Rect }
const hit = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const pad = (r: Rect, p: number): Rect => ({ x: r.x - p, y: r.y - p, w: r.w + 2 * p, h: r.h + 2 * p });

export function createOverlay(canvas: HTMLCanvasElement) {
  const c = canvas.getContext('2d', { alpha: true })!;
  let dpr = 1;
  let leaders: Leader[] = [];
  let leaderKey = '';
  /** may a label box stand here? (inside the plan box, off every landform) — set by placeLeaders for this layout */
  let boxFits: (r: Rect) => boolean = () => false;
  let profile = new Float32Array(0);
  let run = new Float32Array(0);

  /** snap a coordinate to the centre of a device pixel, for crisp 1px axis-aligned lines */
  const crisp = (v: number) => (Math.round(v * dpr - 0.5) + 0.5) / dpr;
  const snap = (v: number) => Math.round(v * dpr) / dpr;

  function size(w: number, h: number, d: number) {
    dpr = d;
    canvas.width = Math.max(1, Math.round(w * d));
    canvas.height = Math.max(1, Math.round(h * d));
    leaderKey = '';
  }

  /** text with a paper halo, so a label stays crisp over the linework beneath it */
  function label(t: string, x: number, y: number, fill: string, halo: string) {
    const lw = c.lineWidth, stroke = c.strokeStyle;
    c.lineWidth = 3;
    c.lineJoin = 'round';
    c.strokeStyle = halo;
    c.strokeText(t, snap(x), snap(y));
    c.fillStyle = fill;
    c.fillText(t, snap(x), snap(y));
    c.lineWidth = lw; // the halo must not leak its width into the next stroke
    c.strokeStyle = stroke;
  }

  /** △ ○ □ as small vector symbols (not in the font subsets) */
  function symbol(kind: Landform['kind'], x: number, y: number, s: number) {
    c.beginPath();
    if (kind === 'tri') { c.moveTo(x, y - s * 0.58); c.lineTo(x + s * 0.5, y + s * 0.29); c.lineTo(x - s * 0.5, y + s * 0.29); c.closePath(); }
    else if (kind === 'circ') c.arc(x, y, s * 0.42, 0, TAU);
    else c.rect(x - s * 0.38, y - s * 0.38, s * 0.76, s * 0.76);
    c.stroke();
  }

  /**
   * Leader placement: from each spot point a straight leader that leaves the footprint (found by marching out until
   * the landform term vanishes), a short shoulder, then the label. Directions are tried in order (45° up, 30°, 60°, 75°,
   * level, then down; the pyramid's leader leaves by its west side first, away from the survey point, the others by
   * the east); the first whose label box stays inside the plan box (out of its end columns, where the section heads ride) and clear of every landform, the other labels, the
   * hint row and the rest pose's cut line — and whose leader stays clear of the rest pose's projector — wins.
   * Plans narrower than 480px (phones, where the static drawing has none either) get no leaders.
   */
  function placeLeaders(s: Scene, ty: Type) {
    const key = `${s.W}|${s.H}|${s.plan.x}|${s.plan.y}|${s.plan.w}|${s.plan.h}|${s.restCut}|${s.restSx}|${ty.code}|${ty.mono}`;
    if (key === leaderKey) return;
    leaderKey = key;
    c.font = `500 ${ty.code}px ${ty.mono}`;
    const p = s.plan, inset = 6, u = s.U.unit;
    const form = (x: number, y: number) => landform(x / u, y / u, s.U) > 0.25; // on a landform?
    // keep clear of the hint row, and of the cut line A–A and its heads at the rest pose
    const taken: Rect[] = [{ x: p.x, y: s.restCut - 16, w: p.w, h: 32 }];
    if (s.hint) taken.push(pad(s.hint, 4));
    // the rest pose's survey cross and projector: a leader must not run through them
    const proj: Rect = { x: s.restSx - 10, y: s.restCut - 10, w: 20, h: p.y + p.h - s.restCut + 10 };
    const crosses = (a: [number, number], b: [number, number]) => {
      for (let i = 0; i <= 12; i++) { const x = a[0] + ((b[0] - a[0]) * i) / 12, y = a[1] + ((b[1] - a[1]) * i) / 12; if (x >= proj.x && x <= proj.x + proj.w && y >= proj.y && y <= proj.y + proj.h) return true; }
      return false;
    };
    const onAnyForm = (r: Rect) => {
      for (let i = 0; i <= 3; i++) for (let j = 0; j <= 2; j++) if (form(r.x + (r.w * i) / 3, r.y + (r.h * j) / 2)) return true;
      return false;
    };
    // labels keep out of the plan's two end columns, where the section heads ride with the cut line wherever it is
    const endCol = 2 * HEAD_R + 3;
    boxFits = (r) => r.x >= p.x + endCol && r.x + r.w <= p.x + p.w - endCol && r.y >= p.y - 18 && r.y + r.h <= p.y + p.h - inset && !onAnyForm(r);
    leaders = [];
    if (p.w < 480) return; // phones: the small plan has no room for leaders (nor has the static phone drawing)
    for (const f of s.forms) {
      const first = f.kind === 'tri' ? -1 : 1;
      const dirs: [number, number][] = [];
      for (const deg of [45, 30, 60, 75, 0, -30, -45]) for (const side of [first, -first]) dirs.push([side * Math.cos((deg * Math.PI) / 180), -Math.sin((deg * Math.PI) / 180)]);
      const text = formatLevel(f.top);
      const w = 14 + c.measureText(text).width;
      for (const [dx, dy] of dirs) {
        // the dot: the summit for the pyramid and the dome; for the mesa, a point on its plateau toward the label
        const t0 = f.kind === 'sq' ? f.r * 0.62 : 0;
        const dot: [number, number] = [f.x + dx * t0, f.y + dy * t0];
        let t = t0 + 4;
        while (t < f.r * 3 && form(f.x + dx * t, f.y + dy * t)) t += 2;
        const elbow: [number, number] = [f.x + dx * (t + 12), f.y + dy * (t + 12)];
        const side = dx >= 0 ? 1 : -1;
        const endX = elbow[0] + side * 16;
        const box: Rect = { x: side > 0 ? endX + 3 : endX - 3 - w, y: elbow[1] - 9, w, h: 18 };
        if (!boxFits(box) || taken.some((q) => hit(box, q))) continue;
        if (crosses(dot, elbow) || crosses(elbow, [endX, elbow[1]])) continue;
        leaders.push({ form: f, dot, u: [dx, dy], elbow, end: [endX, elbow[1]], dir: side as 1 | -1, text, w, box });
        taken.push(box);
        break;
      }
    }
  }

  /**
   * A leader whose shoulder would share the moving cut line's y (the label would read as text on the cut line A–A):
   * its elbow slides further out along the leader until the shoulder and label sit clear of the cut line — above it
   * for a rising leader, below for a falling one. If that label box would leave the plan, land on a landform or meet
   * another label or the hint, the leader stays put and the cut line breaks around its label instead.
   */
  function dodge(L: Leader, cutY: number, taken: Rect[]): Leader {
    const band = 16; // label half-height (9) + 7: the label and its shoulder stand clearly off the line
    if (Math.abs(cutY - L.elbow[1]) >= band || Math.abs(L.u[1]) < 0.2) return L;
    const ny = L.u[1] < 0 ? cutY - band : cutY + band;
    const d = (ny - L.elbow[1]) / L.u[1];
    if (d <= 0) return L;
    const elbow: [number, number] = [L.elbow[0] + L.u[0] * d, ny];
    const endX = elbow[0] + L.dir * 16;
    const box: Rect = { x: L.dir > 0 ? endX + 3 : endX - 3 - L.w, y: ny - 9, w: L.w, h: 18 };
    if (!boxFits(box) || taken.some((q) => hit(box, q))) return L;
    return { ...L, elbow, end: [endX, ny], box };
  }

  /**
   * The graphic scale: at the TRUE scale of both drawings under the section's right end, the bar on the section
   * title's first line and its figures on the second. 0–50 M, or the longest of 40 / 25 / 20 / 10 M that clears the
   * title on a narrow sheet.
   */
  function scaleGeo(s: Scene, pxPerM: number) {
    const x1 = s.sect.x + s.sect.w;
    const y1 = s.legend?.y1 ?? s.sect.y + s.sect.h + 21, y2 = s.legend?.y2 ?? y1 + 18;
    const clear = (s.legend?.right ?? s.sect.x) + 24;
    let m = SCALE_M[0];
    for (const v of SCALE_M) { m = v; if (x1 - 26 - v * pxPerM >= clear) break; }
    const bw = m * pxPerM;
    return { m, bw, bx: x1 - bw - 26, y1, y2 };
  }

  /**
   * The north arrow, the sun's (or the moon's) glyph and the local time — never inside the plan box, where the cut
   * line travels. One symbol everywhere: N beside the needle. On a wide sheet it sits in the legend row, left of the
   * graphic scale, centred on the row's centre line (the bubble's centre), as the time is; on a narrow one, at the
   * right end of the hint row. The time is left out if the row has no room.
   */
  function northGeo(s: Scene, ty: Type, scaleX: number) {
    c.font = `500 ${ty.code}px ${ty.mono}`;
    const tw = c.measureText(s.time).width, nw = c.measureText(s.north).width;
    const glyph = 16; // the sun / moon glyph and its gap before the time
    const wide = !!s.legend && s.sect.w >= 480;
    const r = wide ? 13 : 8;
    const right = wide ? scaleX - 28 : s.plan.x + s.plan.w;
    const yc = wide ? s.legend!.yc : s.hint ? s.hint.y + s.hint.h / 2 + 0.5 : s.plan.y - 16;
    const clearX = wide ? s.legend!.right + 16 : s.hint ? s.hint.x + s.hint.w + 12 : -Infinity;
    const block = nw + 5 + 2 * r;                                   // N, gap, needle
    const withTime = right - (block + 10 + glyph + tw) >= clearX;
    const cx = withTime ? right - tw - glyph - 10 - r : right - r - 1;
    const x0 = cx - r - 5 - nw - 4;
    return { x: cx, y: yc, r, tx: cx + r + 10, showTime: withTime, box: { x: x0, y: yc - r - 2, w: right - x0, h: 2 * r + 4 } as Rect };
  }

  function draw(s: Scene, pal: Palette, ty: Type) {
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, s.W, s.H);
    c.textBaseline = 'middle';
    const halo = rgba(pal.paper, 0.92);
    const u = s.U.unit;
    const { plan, sect } = s;
    const x0 = sect.x, x1 = sect.x + sect.w;

    // ── survey crosses every 64 px, and the clay centre lines of the three primitives (a construction drawing) ──
    if (s.grid > 0) {
      c.strokeStyle = rgba(pal.ink, 0.16 * s.grid);
      c.lineWidth = ty.lw.object;
      c.beginPath();
      for (let gx = Math.ceil((plan.x + 10) / 64) * 64; gx < plan.x + plan.w - 10; gx += 64) {
        for (let gy = Math.ceil((plan.y + 10) / 64) * 64; gy < plan.y + plan.h - 6; gy += 64) {
          const X = crisp(gx), Y = crisp(gy);
          c.moveTo(X - 3.5, Y); c.lineTo(X + 3.5, Y); c.moveTo(X, Y - 3.5); c.lineTo(X, Y + 3.5);
        }
      }
      c.stroke();
      // centre lines, kept inside the plan box (they are construction lines of the plan, not of the sheet)
      c.strokeStyle = rgba(pal.clay, 0.6 * s.grid);
      c.setLineDash(ty.dash);
      c.beginPath();
      const px0 = plan.x + 4, px1 = plan.x + plan.w - 4, py0 = plan.y + 4, py1 = plan.y + plan.h - 4;
      for (const f of s.forms) {
        const X = crisp(f.x), Y = crisp(f.y);
        c.moveTo(Math.max(px0, f.x - f.extent), Y); c.lineTo(Math.min(px1, f.x + f.extent), Y);
        c.moveTo(X, Math.max(py0, f.y - f.extent)); c.lineTo(X, Math.min(py1, f.y + f.extent));
      }
      c.stroke();
      c.setLineDash([]);
    }

    // ── Section A–A: TRUE scale (1 m vertical = 1 m horizontal), on the plan's own x-axis ──
    const sc = sectionScale(sect);
    const Y = sc.Y;
    const step = 2, N = Math.ceil((x1 - x0) / step);
    if (profile.length !== N + 1) { profile = new Float32Array(N + 1); run = new Float32Array(N + 1); }
    const cy = s.cut / u;
    for (let i = 0; i <= N; i++) profile[i] = Hpx(Math.min(x0 + i * step, x1), s.cut, s.U);
    const reach = x0 + (x1 - x0) * clamp01(s.plot);
    const last = Math.min(N, Math.floor((reach - x0) / step));
    if (s.plot > 0) {
      // beyond: three profiles north of the cut, each drawn only where it rises above everything nearer (HLR)
      run.set(profile);
      for (const [dz, al] of BEYOND) {
        c.strokeStyle = rgba(pal.ink, al);
        c.lineWidth = ty.lw.object;
        c.beginPath();
        let pen = false;
        for (let i = 0; i <= last; i++) {
          const x = x0 + i * step;
          const hb = Hpx(x, (cy - dz) * u, s.U);
          if (hb > run[i] + 0.15) {
            const yy = Y(hb);
            if (pen) c.lineTo(x, yy); else c.moveTo(x, yy);
            pen = true;
            run[i] = hb;
          } else pen = false;
        }
        c.stroke();
      }

      // earth poché below the cut profile: vellum fill, then a 45° hatch clipped to it
      const bot = sect.y + sect.h + 2;
      c.save();
      c.beginPath();
      c.moveTo(x0, bot);
      for (let i = 0; i <= last; i++) c.lineTo(x0 + i * step, Y(profile[i]));
      c.lineTo(x0 + last * step, bot);
      c.closePath();
      c.fillStyle = rgba(pal.paper, 0.9);
      c.fill();
      c.clip();
      c.strokeStyle = rgba(pal.ink, 0.3);
      c.lineWidth = ty.lw.object;
      c.beginPath();
      const top = Y(34), span = bot - top;
      for (let x = Math.floor((x0 - span) / 6) * 6; x < x1; x += 6) { c.moveTo(x, bot); c.lineTo(x + span, top); }
      c.stroke();
      c.restore();

      // the datum ±0.00 runs across everything (a reference line), its level written under it at the left end
      const dy = crisp(Y(0));
      c.strokeStyle = rgba(pal.ink, 0.45);
      c.lineWidth = ty.lw.object;
      c.setLineDash(ty.hidden);
      c.beginPath(); c.moveTo(x0, dy); c.lineTo(Math.max(x0, reach), dy); c.stroke();
      c.setLineDash([]);
      c.font = `400 ${ty.codeSm}px ${ty.mono}`;
      c.textAlign = 'left';
      // on a paper knockout (2px round the text): the earth hatch must not run through the figures
      const d0 = formatLevel(0), dw = c.measureText(d0).width;
      c.fillStyle = rgba(pal.paper, 0.94);
      c.fillRect(x0 + 1, dy + 10 - ty.codeSm / 2 - 2, dw + 4, ty.codeSm + 4);
      label(d0, x0 + 3, dy + 10, rgba(pal.ink2, 1), halo);

      // the cut line itself: the heaviest weight in the set (--lw-cut)
      c.strokeStyle = rgba(pal.ink, 1);
      c.lineWidth = ty.lw.cut;
      c.lineJoin = 'round';
      c.lineCap = 'round';
      c.beginPath();
      for (let i = 0; i <= last; i++) { const x = x0 + i * step, yy = Y(profile[i]); if (i) c.lineTo(x, yy); else c.moveTo(x, yy); }
      c.stroke();
      c.lineCap = 'butt';

      // the rust pen nib while the section is being plotted
      if (s.plot < 1) {
        c.fillStyle = rgba(pal.rust, 1);
        c.beginPath();
        c.arc(reach, Y(Hpx(reach, s.cut, s.U)), 2.4, 0, TAU);
        c.fill();
      }
    }

    const scale = scaleGeo(s, sc.pxPerM);
    const north = northGeo(s, ty, scale.bx);
    placeLeaders(s, ty);
    // the leaders as drawn at this cut: slid clear of the cut line where they would share its y
    const legs: Leader[] = [];
    for (const L of leaders) {
      const others = [...legs.map((q) => q.box), ...leaders.filter((q) => q !== L && !legs.some((g) => g.form === q.form)).map((q) => q.box)];
      if (s.hint) others.push(pad(s.hint, 4));
      legs.push(dodge(L, crisp(s.cut), others));
    }

    if (s.ui > 0) {
      c.globalAlpha = s.ui;
      // ── cut line A–A across the plan, with its section heads (looking north: the half-arrows point up). The line
      //    breaks around the leader labels it passes, as a drawn line breaks for lettering ──
      const cyp = crisp(s.cut);
      const xa = plan.x + CUT_INSET_X, xb = plan.x + plan.w - CUT_INSET_X;
      const gaps = legs.map((L) => pad(L.box, 3)).filter((r) => cyp >= r.y && cyp <= r.y + r.h).map((r) => [r.x, r.x + r.w]).sort((p1, p2) => p1[0] - p2[0]);
      c.strokeStyle = rgba(pal.ink, 0.85);
      c.lineWidth = ty.lw.object;
      c.setLineDash(ty.dash);
      c.beginPath();
      let from = xa;
      for (const [g0, g1] of [...gaps, [xb, xb]]) {
        const to = Math.min(g0, xb);
        if (to > from) { c.moveTo(from, cyp); c.lineTo(to, cyp); }
        from = Math.max(from, g1);
      }
      c.lineDashOffset = 0;
      c.stroke();
      c.setLineDash([]);
      c.font = `500 ${ty.code}px ${ty.mono}`;
      c.textAlign = 'center';
      for (const hx of [plan.x + HEAD_R + 1, plan.x + plan.w - HEAD_R - 1]) {
        // the section head: a solid arrowhead on the bubble, pointing the way the section looks (north, up)
        c.fillStyle = rgba(pal.ink, 1);
        c.beginPath(); c.moveTo(hx - HEAD_R, s.cut); c.lineTo(hx, s.cut - HEAD_R - 7); c.lineTo(hx + HEAD_R, s.cut); c.closePath(); c.fill();
        c.fillStyle = rgba(pal.sheet, 1);
        c.strokeStyle = rgba(pal.ink, 1);
        c.lineWidth = ty.lw.border;
        c.beginPath(); c.arc(hx, s.cut, HEAD_R, 0, TAU); c.fill(); c.stroke();
        c.fillStyle = rgba(pal.ink, 1);
        c.fillText('A', snap(hx), snap(s.cut + 0.5));
      }

      // ── north arrow: split-fill needle, N beside it; by day a rust tick inside its rim at the light's bearing (at
      //    night the light is the 17:24 fallback, not the moon's, so no bearing is marked); the sun (a moon at night)
      //    and the local time beside it ──
      const n = north;
      c.strokeStyle = rgba(pal.ink, 1);
      c.fillStyle = rgba(pal.ink, 1);
      c.lineWidth = ty.lw.object;
      const k = n.r / 13;
      c.beginPath(); c.arc(n.x, n.y, n.r, 0, TAU); c.stroke();
      c.beginPath(); c.moveTo(n.x, n.y - n.r + 2 * k); c.lineTo(n.x + 5 * k, n.y + n.r - 3 * k); c.lineTo(n.x, n.y + n.r - 7 * k); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(n.x, n.y - n.r + 2 * k); c.lineTo(n.x - 5 * k, n.y + n.r - 3 * k); c.lineTo(n.x, n.y + n.r - 7 * k); c.closePath(); c.stroke();
      c.font = `500 ${ty.code}px ${ty.mono}`;
      c.textAlign = 'right';
      label(s.north, n.x - n.r - 5, n.y + 0.5, rgba(pal.ink, 1), halo);
      if (!s.night) {
        const ca = Math.cos(s.ang), sa = Math.sin(s.ang), t0 = n.r - 6 * k, t1 = n.r + 0.5; // inside the rim: the N beside it stays clear
        c.strokeStyle = rgba(pal.rust, 1);
        c.lineWidth = ty.lw.cut;
        c.beginPath(); c.moveTo(n.x + ca * t0, n.y + sa * t0); c.lineTo(n.x + ca * t1, n.y + sa * t1); c.stroke();
      }
      if (n.showTime) {
        const gx = n.tx + 4, gy = n.y;
        c.strokeStyle = rgba(pal.rust, 1);
        c.fillStyle = rgba(pal.rust, 1);
        c.lineWidth = ty.lw.object;
        if (s.night) {
          // a crescent moon: the light at night is the 17:24 sun's, but the clock is the visitor's. A disc with an
          // offset disc cut out of it (nothing else on this canvas lies under the glyph)
          c.save();
          c.beginPath(); c.arc(gx, gy, 4.8, 0, TAU); c.fill();
          c.globalCompositeOperation = 'destination-out';
          c.beginPath(); c.arc(gx + 2.4, gy - 1.8, 4.1, 0, TAU); c.fill();
          c.restore();
        } else {
          c.beginPath(); c.arc(gx, gy, 2.6, 0, TAU); c.stroke();
          c.beginPath();
          for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; c.moveTo(gx + Math.cos(a) * 4.2, gy + Math.sin(a) * 4.2); c.lineTo(gx + Math.cos(a) * 5.8, gy + Math.sin(a) * 5.8); }
          c.stroke();
        }
        c.textAlign = 'left';
        label(s.time, gx + 9, gy, rgba(pal.ink2, 1), halo);
      }

      // ── leaders: dot terminal at the spot point, 45° leader, shoulder, then △ +26.00 on a paper knockout ──
      c.lineWidth = ty.lw.object;
      for (const L of legs) {
        c.strokeStyle = rgba(pal.clay, 0.72);
        c.fillStyle = rgba(pal.clay, 1);
        c.beginPath(); c.arc(L.dot[0], L.dot[1], 2.4, 0, TAU); c.fill();
        c.beginPath(); c.moveTo(L.dot[0], L.dot[1]); c.lineTo(L.elbow[0], L.elbow[1]); c.lineTo(L.end[0], L.end[1]); c.stroke();
        const sx = L.dir > 0 ? L.end[0] + 10 : L.end[0] - L.w + 6;
        c.strokeStyle = rgba(pal.ink2, 1);
        c.lineWidth = ty.lw.object;
        c.fillStyle = halo;
        c.beginPath(); c.arc(sx, L.end[1], 7, 0, TAU); c.fill();
        symbol(L.form.kind, sx, L.end[1], 9);
        c.textAlign = 'left';
        label(L.text, sx + 8.5, L.end[1] + 0.5, rgba(pal.ink2, 1), halo);
      }

      // ── graphic scale: 0 … 50 M at the TRUE scale of both drawings (the title is HTML, measured by siteplan.ts) ──
      const { bw, bx, y1, y2, m } = scale;
      const by = y1 - 2.5;
      c.strokeStyle = rgba(pal.ink, 1);
      c.fillStyle = rgba(pal.ink, 1);
      c.lineWidth = ty.lw.object;
      for (let i = 0; i < 5; i++) {
        const a = snap(bx + (i * bw) / 5), b = snap(bx + ((i + 1) * bw) / 5);
        c.strokeRect(crisp(a), crisp(by), b - a, 5);
        if (i % 2 === 0) c.fillRect(a, by, b - a, 5.5);
      }
      c.font = `400 ${ty.codeSm}px ${ty.mono}`;
      c.textAlign = 'center';
      label('0', bx, y2, rgba(pal.ink2, 1), halo);
      label(`${m} M`, bx + bw + c.measureText(' M').width / 2, y2, rgba(pal.ink2, 1), halo);
      c.textAlign = 'left';
      c.globalAlpha = 1;
    }

    // ── the projector: from the survey point on the cut line down to the section, a ▼ and its level. The level is
    //    written beside the projector where no section line runs through it: tried right, then left, from just above
    //    the ▼ upward along the projector ──
    const pv = s.ui * s.iso;
    let lvBox: Rect | null = null;
    if (pv > 0 && s.plot > 0) {
      c.globalAlpha = pv;
      const lv = Hpx(s.sx, s.cut, s.U);
      const px = crisp(s.sx), py = Y(lv);
      c.strokeStyle = rgba(pal.rust, 0.8);
      c.lineWidth = ty.lw.object;
      c.setLineDash(ty.hidden);
      c.beginPath(); c.moveTo(px, s.cut + 7); c.lineTo(px, py - 12); c.stroke();
      c.setLineDash([]);
      c.fillStyle = rgba(pal.rust, 1);
      c.beginPath(); c.moveTo(px - 5, py - 11); c.lineTo(px + 5, py - 11); c.lineTo(px, py - 2.5); c.closePath(); c.fill();
      c.font = `500 ${ty.code}px ${ty.mono}`;
      const lt = formatLevel(lv);
      const lw = c.measureText(lt).width, lh = ty.code + 2;
      // the topmost section line at a sample: the envelope of the cut profile and the drawn "beyond" profiles
      const topAt = (x: number) => { const i = Math.round((x - x0) / step); return i < 0 || i > N ? Infinity : Y(i <= last ? run[i] : profile[i]); };
      const clearOf = (r: Rect) => { for (let x = r.x; x <= r.x + r.w; x += step) if (topAt(x) < r.y + r.h + 2) return false; return true; };
      const yMin = Math.max(sect.y - 14, s.cut + 16);
      let best: { r: Rect; right: boolean } | null = null;
      for (let dy = 0; !best && py - 13 - dy >= yMin; dy += 4) {
        for (const right of [true, false]) {
          const r: Rect = { x: right ? px + 8 : px - 8 - lw, y: py - 13 - dy - lh / 2, w: lw, h: lh };
          if (r.x < x0 - 2 || r.x + r.w > x1 + 2) continue;
          if (clearOf(r)) { best = { r, right }; break; }
        }
      }
      if (!best) { const right = px + 10 + lw < x1; best = { r: { x: right ? px + 8 : px - 8 - lw, y: py - 13 - lh / 2, w: lw, h: lh }, right }; }
      lvBox = best.r;
      c.textAlign = best.right ? 'left' : 'right';
      label(lt, best.right ? best.r.x + 1 : best.r.x + best.r.w - 1, best.r.y + lh / 2, rgba(pal.rust, 1), halo);
      // the survey point on the cut line
      c.strokeStyle = rgba(pal.rust, 1);
      c.beginPath(); c.moveTo(px - 6, crisp(s.cut)); c.lineTo(px + 6, crisp(s.cut)); c.moveTo(px, s.cut - 6); c.lineTo(px, s.cut + 6); c.stroke();
      if (s.marker) { c.beginPath(); c.arc(px, s.cut, 8.5, 0, TAU); c.stroke(); }
      c.globalAlpha = 1;
    }

    // ── EL tag beside the native cursor (never replacing it): below-right, else the first of below-left,
    //    above-right, above-left that stays on the sheet and clear of the labels, the north arrow and the hint ──
    if (s.tag) {
      const lv = Hpx(s.tag.x, s.tag.y, s.U);
      const t = `${s.el} ${formatLevel(lv)}`;
      c.font = `500 ${ty.code}px ${ty.mono}`;
      const tw = c.measureText(t).width + 12, th = 20;
      const avoid: Rect[] = [north.box, ...legs.map((L) => L.box)];
      if (lvBox) avoid.push(lvBox);
      if (s.hint) avoid.push(s.hint);
      const cands: [number, number][] = [
        [s.tag.x + 16, s.tag.y + 14], [s.tag.x - 16 - tw, s.tag.y + 14], [s.tag.x + 16, s.tag.y - 14 - th], [s.tag.x - 16 - tw, s.tag.y - 14 - th],
      ];
      const onSheet = ([x, y]: [number, number]) => x >= 4 && x + tw <= s.W - 4 && y >= 4 && y + th <= s.H - 4;
      const pick = cands.find((q) => onSheet(q) && !avoid.some((r) => hit({ x: q[0], y: q[1], w: tw, h: th }, pad(r, 2)))) ?? cands.find(onSheet) ?? cands[0];
      const tx = snap(pick[0]), tyy = snap(pick[1]);
      c.fillStyle = rgba(pal.sheet, 0.94);
      c.fillRect(tx, tyy, tw, th);
      c.strokeStyle = rgba(pal.rust, 0.9);
      c.lineWidth = ty.lw.object;
      c.strokeRect(crisp(tx), crisp(tyy), tw - 1 / dpr, th - 1 / dpr);
      c.fillStyle = rgba(pal.rust, 1);
      c.textAlign = 'left';
      c.fillText(t, snap(tx + 6), snap(tyy + th / 2 + 0.5));
    }
  }

  return { size, draw };
}
