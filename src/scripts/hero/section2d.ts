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
import { Hpx, base, formatLevel, sectionScale } from '../../lib/terrain.js';
import type { Site } from '../../lib/terrain.js';

export type RGB = [number, number, number];
export interface Rect { x: number; y: number; w: number; h: number }
export interface Palette { ink: RGB; ink2: RGB; rust: RGB; clay: RGB; sheet: RGB; paper: RGB }
/** type and line tokens: the mono stack, --fs-code / --fs-code-sm (px), --dash-center (long–short dash),
 *  and the drafting line weights --lw-cut / --lw-border / --lw-object (px) */
export interface Type { mono: string; code: number; codeSm: number; dash: number[]; lw: { cut: number; border: number; object: number } }
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
  /** the sun's time, e.g. '17:24' */
  time: string;
  /** chrome codes: 'EL', 'N' */
  el: string; north: string;
  /** the centres of the section title's two lines (HTML legend), so the graphic scale sits on the same lines */
  legend: { y1: number; y2: number } | null;
}

const TAU = Math.PI * 2;
const BEYOND: [number, number][] = [[0.035, 0.6], [0.075, 0.42], [0.13, 0.28]]; // [metres north of the cut (units), alpha]
const HEAD_R = 11;                  // section-head bubble radius

const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a))})`;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

interface Leader { form: Landform; dot: [number, number]; elbow: [number, number]; end: [number, number]; dir: 1 | -1; text: string; w: number }

export function createOverlay(canvas: HTMLCanvasElement) {
  const c = canvas.getContext('2d', { alpha: true })!;
  let dpr = 1;
  let leaders: Leader[] = [];
  let leaderKey = '';
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
   * the landform term vanishes), a short shoulder, then the label. Directions are tried in order (45° up, 30°, 60°,
   * level, then down; right before left); the first whose label box stays inside the plan box and clear of every
   * landform, the other labels, the north arrow and the rest pose's cut line wins. No room (phones): no leaders.
   */
  function placeLeaders(s: Scene, ty: Type) {
    const key = `${s.W}|${s.H}|${s.plan.x}|${s.plan.y}|${s.plan.w}|${s.plan.h}|${s.restCut}|${ty.code}|${ty.mono}`;
    if (key === leaderKey) return;
    leaderKey = key;
    c.font = `500 ${ty.code}px ${ty.mono}`;
    const p = s.plan, pad = 6, u = s.U.unit;
    const form = (x: number, y: number) => Hpx(x, y, s.U) - base(x / u, y / u) > 0.25; // on a landform?
    // keep clear of the north arrow, and of the cut line A–A and its heads at the rest pose
    const taken: Rect[] = [northBox(s), { x: p.x, y: s.restCut - 16, w: p.w, h: 32 }];
    const hit = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const onAnyForm = (r: Rect) => {
      for (let i = 0; i <= 3; i++) for (let j = 0; j <= 2; j++) if (form(r.x + (r.w * i) / 3, r.y + (r.h * j) / 2)) return true;
      return false;
    };
    leaders = [];
    if (p.w < 560) return; // phones: the small plan has no room for leaders (a second-visit detail on larger sheets)
    // preference order: 45° up, then 30° up, then level, then down; right before left
    const dirs: [number, number][] = [];
    for (const deg of [45, 30, 60, 0, -30, -45]) for (const side of [1, -1]) dirs.push([side * Math.cos((deg * Math.PI) / 180), -Math.sin((deg * Math.PI) / 180)]);
    for (const f of s.forms) {
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
        const inside = box.x >= p.x + pad && box.x + box.w <= p.x + p.w - pad && box.y >= p.y - 18 && box.y + box.h <= p.y + p.h - pad;
        if (!inside || taken.some((q) => hit(box, q)) || onAnyForm(box)) continue;
        leaders.push({ form: f, dot, elbow, end: [endX, elbow[1]], dir: side as 1 | -1, text, w });
        taken.push(box);
        break;
      }
    }
  }

  /** north arrow: circle at the plan box's top-right corner, N above it, the sun's time below */
  function northGeo(s: Scene) {
    const r = 13;
    return { x: s.plan.x + s.plan.w - r - 18, y: s.plan.y + r + 16, r };
  }
  function northBox(s: Scene): Rect {
    const n = northGeo(s);
    return { x: n.x - n.r - 44, y: n.y - n.r - 22, w: n.r * 2 + 50, h: n.r * 2 + 52 };
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
      c.setLineDash([2, 4]);
      c.beginPath(); c.moveTo(x0, dy); c.lineTo(Math.max(x0, reach), dy); c.stroke();
      c.setLineDash([]);
      c.font = `400 ${ty.codeSm}px ${ty.mono}`;
      c.textAlign = 'left';
      label(formatLevel(0), x0 + 3, dy + 10, rgba(pal.ink2, 1), halo);

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

    if (s.ui > 0) {
      c.globalAlpha = s.ui;
      // ── cut line A–A across the plan, with its section heads (looking north: the half-arrows point up) ──
      const cyp = crisp(s.cut);
      c.strokeStyle = rgba(pal.ink, 0.85);
      c.lineWidth = ty.lw.object;
      c.setLineDash(ty.dash);
      c.beginPath(); c.moveTo(plan.x + 2 * HEAD_R + 4, cyp); c.lineTo(plan.x + plan.w - 2 * HEAD_R - 4, cyp); c.stroke();
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

      // ── north arrow: split-fill needle, N above; a rust tick on its circle at the light's bearing; ☀ + time below ──
      const n = northGeo(s);
      c.strokeStyle = rgba(pal.ink, 1);
      c.fillStyle = rgba(pal.ink, 1);
      c.lineWidth = ty.lw.object;
      c.beginPath(); c.arc(n.x, n.y, n.r, 0, TAU); c.stroke();
      c.beginPath(); c.moveTo(n.x, n.y - n.r + 2); c.lineTo(n.x + 5, n.y + n.r - 3); c.lineTo(n.x, n.y + n.r - 7); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(n.x, n.y - n.r + 2); c.lineTo(n.x - 5, n.y + n.r - 3); c.lineTo(n.x, n.y + n.r - 7); c.closePath(); c.stroke();
      c.font = `500 ${ty.code}px ${ty.mono}`;
      label(s.north, n.x, n.y - n.r - 8, rgba(pal.ink, 1), halo);
      const lx = n.x + Math.cos(s.ang) * n.r, ly = n.y + Math.sin(s.ang) * n.r;
      c.fillStyle = rgba(pal.rust, 1);
      c.beginPath(); c.arc(lx, ly, 2.6, 0, TAU); c.fill();
      // ☀ + the sun's time, centred under the arrow
      c.font = `500 ${ty.code}px ${ty.mono}`;
      const tw = c.measureText(s.time).width;
      const gy = n.y + n.r + 14, gx = n.x - (tw + 13) / 2 + 4;
      c.strokeStyle = rgba(pal.rust, 1);
      c.lineWidth = ty.lw.object;
      c.beginPath(); c.arc(gx, gy, 2.6, 0, TAU); c.stroke();
      c.beginPath();
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; c.moveTo(gx + Math.cos(a) * 4.2, gy + Math.sin(a) * 4.2); c.lineTo(gx + Math.cos(a) * 5.8, gy + Math.sin(a) * 5.8); }
      c.stroke();
      c.textAlign = 'left';
      label(s.time, gx + 9, gy, rgba(pal.ink2, 1), halo);

      // ── leaders: dot terminal at the spot point, 45° leader, shoulder, then △ +27.83 ──
      placeLeaders(s, ty);
      c.lineWidth = ty.lw.object;
      for (const L of leaders) {
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

      // ── graphic scale: 0 … 50 M at the TRUE scale of both drawings, under the section's right end; the bar on the
      //    section title's first line, its figures on the second (the title is HTML, measured by siteplan.ts) ──
      const y1 = s.legend?.y1 ?? sect.y + sect.h + 21, y2 = s.legend?.y2 ?? y1 + 18;
      const bw = 50 * sc.pxPerM, bx = x1 - bw - 26, by = y1 - 2.5;
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
      label('50 M', bx + bw + c.measureText(' M').width / 2, y2, rgba(pal.ink2, 1), halo);
      c.textAlign = 'left';
      c.globalAlpha = 1;
    }

    // ── the projector: from the survey point on the cut line down to the section, a ▼ and its level ──
    const pv = s.ui * s.iso;
    if (pv > 0 && s.plot > 0) {
      c.globalAlpha = pv;
      const lv = Hpx(s.sx, s.cut, s.U);
      const px = crisp(s.sx), py = Y(lv);
      c.strokeStyle = rgba(pal.rust, 0.8);
      c.lineWidth = ty.lw.object;
      c.setLineDash([3, 3]);
      c.beginPath(); c.moveTo(px, s.cut + 7); c.lineTo(px, py - 12); c.stroke();
      c.setLineDash([]);
      c.fillStyle = rgba(pal.rust, 1);
      c.beginPath(); c.moveTo(px - 5, py - 11); c.lineTo(px + 5, py - 11); c.lineTo(px, py - 2.5); c.closePath(); c.fill();
      c.font = `500 ${ty.code}px ${ty.mono}`;
      const lt = formatLevel(lv);
      const right = px + 10 + c.measureText(lt).width < x1;
      c.textAlign = right ? 'left' : 'right';
      label(lt, right ? px + 9 : px - 9, py - 13, rgba(pal.rust, 1), halo);
      // the survey point on the cut line
      c.strokeStyle = rgba(pal.rust, 1);
      c.beginPath(); c.moveTo(px - 6, crisp(s.cut)); c.lineTo(px + 6, crisp(s.cut)); c.moveTo(px, s.cut - 6); c.lineTo(px, s.cut + 6); c.stroke();
      if (s.marker) { c.beginPath(); c.arc(px, s.cut, 8.5, 0, TAU); c.stroke(); }
      c.globalAlpha = 1;
    }

    // ── EL tag beside the native cursor (never replacing it) ──
    if (s.tag) {
      const lv = Hpx(s.tag.x, s.tag.y, s.U);
      const t = `${s.el} ${formatLevel(lv)}`;
      c.font = `500 ${ty.code}px ${ty.mono}`;
      const tw = c.measureText(t).width + 12, th = 20;
      let tx = s.tag.x + 16, tyy = s.tag.y + 14;
      if (tx + tw > s.W - 4) tx = s.tag.x - 16 - tw;
      if (tyy + th > s.H - 4) tyy = s.tag.y - 14 - th;
      tx = snap(tx); tyy = snap(tyy);
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
