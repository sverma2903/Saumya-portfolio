/**
 * siteplan.ts · OWNER: WP2 (SPEC SM1). The cover sheet's live site plan: one WebGL2 fragment shader over the analytic
 * heightfield of her △○□ (lib/terrain.js) — graphite contours, slope hatching lit by the sun at the visitor's local
 * hour, the rust isoline and cut-plane poché at the survey elevation — with Section A–A drawn by section2d.ts on the
 * same x-axis. Ported from the prototype (concepts/drawing-set §I) with the spec's nine changes.
 *
 * Settle and stop (SPEC §2.7 law 4, WCAG 2.2.2): drafting-in (2.0 s) + demo (2.2 s) + settle (0.4 s) = 4.6 s from the
 * first frame, then 0 frames — the rest pose is drawn on the last frame that lands before 4.6 s + one frame interval,
 * so even at a few frames a second the motion is over well inside 4.8 s. After that it renders only on input and
 * stops as soon as the eased values converge.
 *
 * Contracts (SPEC §8.3): reads html[data-gl] (head script: 'maybe' | 'no') and sets 'live' after its first frame or
 * 'no' on failure / context loss / Motion off; subscribes to prefs `motion` and the `sv:theme` event; stores
 * sessionStorage 'sv:drafted' once the drafting-in has been seen. Emits nothing. Chrome words come from data-*
 * attributes rendered by CoverSheet.astro, so chrome.ts is never bundled here.
 * Debug params (QA): ?hour=9 (sun hour 0–24) · ?tier=hi|lo (pin the adaptive tier) · ?at=900 (render the timeline's
 * frame at 900 ms, then stop).
 */
import { Hpx, crossingX, formatLevel, intervalFor, landforms, layoutPrimitives, restPose, sunDir, sunHour, REST_CUT, REST_FOCUS } from '../../lib/terrain.js';
import type { Site } from '../../lib/terrain.js';
import { createOverlay, CUT_INSET_BOTTOM, CUT_INSET_TOP, CUT_INSET_X, type Landform, type Palette, type RGB, type Rect, type Scene, type Type } from './section2d';
import { on as onPref } from '../core/prefs';
import { listen } from '../core/bus';
import { idle } from '../core/dom';
import { onVisibility } from '../core/io';

// ── timing (SPEC SM1 loop) ────────────────────────────────────────────────────────────────────────────────────────
const REVEAL_MS = 2000, DEMO_MS = 2200, SETTLE_MS = 400;   // 4.6 s (+ ≤ 1 frame) → WCAG 2.2.2 (< 5 s)
const T_END = REVEAL_MS + DEMO_MS + SETTLE_MS;
const T_DRAWN = 2200;                                     // every drafting channel is at 1 (≤ 2.25 s)
const RETURN_MS = 600;                                    // light eases back to the sun when the pointer leaves
const BOOST = 4;                                          // pointer input during drafting-in: finish 4× faster
// demo keyframes: the isoline breathes 9 → 13 → +12.00, the cut glides 50 → 58 → 55 %, the light swings ±15°
const K_FOCUS: [number, number][] = [[REVEAL_MS, 9], [REVEAL_MS + 1400, 13], [T_END, REST_FOCUS]];
const K_CUT: [number, number][] = [[REVEAL_MS, 0.5], [REVEAL_MS + 1400, 0.58], [T_END, REST_CUT]];
const K_ANG: [number, number][] = [[REVEAL_MS, 0], [REVEAL_MS + 750, 15], [REVEAL_MS + 1850, -15], [T_END, 0]];
// ── input and budget ──────────────────────────────────────────────────────────────────────────────────────────────
const KEY_STEP = 16, KEY_STEP_BIG = 64;
const VISIBLE = 0.35;
const MP_CAP = 2.4e6;                                     // GL canvas cap (device pixels)
const OV_CAP = 4.2e6;                                     // overlay cap
const TIER_MS = 20;                                       // median frame interval above this → low tier
const DEG = Math.PI / 180;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const inside = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

/** cubic-bezier(x1, y1, x2, y2) → easing function (for the --ease-* tokens) */
function bezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (t: number) => ((ax * t + bx) * t + cx) * t;
  const dX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = X(t) - x, d = dX(t);
      if (Math.abs(e) < 1e-5 || Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    if (t < 0 || t > 1) { // bisection fallback
      let lo = 0, hi = 1;
      for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (X(t) < x) lo = t; else hi = t; }
    }
    return ((ay * t + by) * t + cy) * t;
  };
}

function keyed(k: [number, number][], t: number, ease: (x: number) => number): number {
  if (t <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) if (t <= k[i][0]) return lerp(k[i - 1][1], k[i][1], ease((t - k[i - 1][0]) / (k[i][0] - k[i - 1][0])));
  return k[k.length - 1][1];
}

// ── the fragment shader: the prototype's, with uInk/uRust, uLightDir (local-hour sun), the cut-plane poché, an
//    adaptive cross-hatch switch, quiet zones (headline, section band) and edge fades. `H` mirrors lib/terrain.js
//    (GROUND_OUT = 12). Notes (kept out of the GLSL string so they are not shipped):
//    · fc is css px, y down. The slope `fh` is per pixel: one-sided differences 1.2 css px either side, the steeper of
//      the two on each axis. Unlike fwidth (constant over 2×2 pixel quads, and spiking where the pyramid's faces meet)
//      it is smooth from pixel to pixel, so lines do not stair-step along a crease. Metres per device px, × 4/π so the
//      lines keep fwidth's average weight (fwidth is |∂x| + |∂y|, 4/π × the gradient on average over directions).
//    · graphite contours: distance (device px) to the nearest level, index contour every 5th, faded where they crowd.
//      Index weight only from +6.00 (INDEX_FLOOR in terrain.js) up: below it the ground dominates, and a heavy ground
//      contour read as a fourth mark between her △○□ — the only heavy graphite lines are her three forms'.
//      A level can coincide with a dead-flat surface (the mesa's plateau is exactly +15.00, a contour level), and a
//      "line" there would fill the plateau: lines — and the rust isoline — need a slope (`sloped`).
//    · drafted in: the lowest levels ink first, rising to the summits. Quiet zones: under the headline (28%), under
//      the section band, soft frame edges.
//    · hatching on the slopes turned away from the light (45°, cross-hatch in deep shade), 6 css px pitch: a whole
//      number of device px at the fine-pointer caps (6 at DPR 1, 9 at 1.5) so it does not beat against the pixel grid;
//      its edge widens by the browser's upscale (uAA = devicePixelRatio / canvas DPR ≥ 1).
//    · the rust isoline at the survey elevation is a plan annotation: it fades out over the last 24 px inside the plan
//      box, so it ends like a drawn line short of the box (and of the keyboard focus frame just outside it).
//    · cut-plane poché: everything ABOVE the plan cut is cut material (never below +6: only the three landforms).
//    · composite (premultiplied): graphite → poché (rust, under) → isoline (rust, over).
const VS = `#version 300 es
void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2. - 1., 0., 1.); }`;
const FS = `#version 300 es
precision highp float;
uniform vec2 uRes, uRange, uLightDir;
uniform float uDpr, uAA, uUnit, uReveal, uInterval, uFocus, uIso, uHatch, uCross, uGain;
uniform vec3 uTri, uCirc, uInk, uRust;
uniform vec4 uSq, uText, uQuiet, uFade, uPlan;
out vec4 o;
const float S3 = 1.7320508;
float base(vec2 p){ return 2.2*sin(p.x*3.1+.8)*sin(p.y*2.7-.3) + 1.4*sin(p.x*5.3+p.y*3.9+1.3) + .6*sin(p.x*9.7-p.y*7.1+.7) + 1.2*p.x; }
float sdTri(vec2 p, float r){ p.x = abs(p.x) - r; p.y = p.y + r/S3; if (p.x + S3*p.y > 0.) p = vec2(p.x - S3*p.y, -S3*p.x - p.y) / 2.; p.x -= clamp(p.x, -2.*r, 0.); return -length(p) * sign(p.y); }
float sdBox(vec2 p, float b, float r){ vec2 d = abs(p) - b + r; return length(max(d, 0.)) + min(max(d.x, d.y), 0.) - r; }
float H(vec2 p){
  float d = length(p - uCirc.xy) / uCirc.z; float dome = d < 1. ? 11. * (1. + cos(3.14159265 * d)) : 0.;
  float mesa = 15. * (1. - smoothstep(-.045, .05, sdBox(p - uSq.xy, uSq.z, uSq.w)));
  float st = sdTri(vec2(p.x - uTri.x, -(p.y - uTri.y)), uTri.z); float pyr = 26. * clamp(-st / (uTri.z / S3), 0., 1.);
  float land = max(dome, max(mesa, pyr));
  return base(p) * (1. - smoothstep(0., 12., land)) + land;
}
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float inBox(vec2 q, vec4 r, float f){ vec2 e = max(r.xy - q, q - r.zw); return 1. - smoothstep(0., f, max(e.x, e.y)); }
float ramp(float d, float w){ return w > .5 ? smoothstep(0., w, d) : 1.; }
void main(){
  vec2 fc = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;
  vec2 p = fc / uUnit;
  float h = H(p);
  float e = 1.2 / uUnit;
  float hE = H(p + vec2(e, 0.)), hW = H(p - vec2(e, 0.)), hS = H(p + vec2(0., e)), hN = H(p - vec2(0., e));
  float fh0 = 1.27 * length(vec2(max(abs(hE - h), abs(h - hW)), max(abs(hS - h), abs(h - hN)))) / (1.2 * uDpr);
  float fh = max(fh0, 1e-4);
  float f = h / uInterval, fw = fh / uInterval;
  float dist = abs(fract(f + .5) - .5) / max(fw, 1e-4);
  float idx = step(abs(mod(floor(f + .5), 5.)), .01) * step(5.99, floor(f + .5) * uInterval);
  float wpx = mix(.55, 1.05, idx) * uDpr;
  float sloped = smoothstep(1e-6, 1e-5, fh0);
  float line = (1. - smoothstep(wpx - .6, wpx + .6, dist)) * (1. - smoothstep(.28, .55, fw / uDpr)) * sloped;
  float grain = .72 + .28 * hash(floor(fc * 1.3));
  float press = .82 + .18 * sin(p.x * 37. + p.y * 23. + h * .7);
  float R = mix(uRange.x - 3., uRange.y + 3.5, uReveal);
  float drawn = 1. - smoothstep(R - 3.5, R, h);
  vec2 res = uRes / uDpr;
  float inText = inBox(fc, uText, 90.);
  float edge = ramp(fc.y, uFade.x) * ramp(res.y - fc.y, uFade.y) * ramp(fc.x, uFade.z) * ramp(res.x - fc.x, uFade.w);
  float fade = mix(1., .28, inText) * mix(1., .14, inBox(fc, uQuiet, 18.)) * edge;
  float aC = line * mix(.16, .34, idx) * grain * press * drawn * fade * uGain;
  float Sc = 260.;
  float hx = (hE - hW) / (2. * e) / Sc;
  float hy = (hS - hN) / (2. * e) / Sc;
  vec3 n = normalize(vec3(-hx, -hy, 1.));
  vec3 L = normalize(vec3(uLightDir * .82, .58));
  float shade = clamp(L.z - dot(n, L), 0., 1.);
  float slope = length(vec2(hx, hy));
  float w1 = sin(fc.y * .045 + fc.x * .013) * .7;
  float s1 = abs(fract((fc.x + fc.y + w1) / 6.) - .5) * 6.;
  float s2 = abs(fract((fc.x - fc.y - w1) / 6.) - .5) * 6.;
  float hat = (1. - smoothstep(.3, .95 * uAA, s1)) * smoothstep(.06, .2, shade)
            + (1. - smoothstep(.3, .95 * uAA, s2)) * smoothstep(.3, .5, shade) * .8 * uCross;
  float aH = hat * .26 * smoothstep(.03, .1, slope) * grain * uHatch * fade * drawn * uGain;
  float inPlan = inBox(fc, uPlan + vec4(24., 24., -24., -24.), 24.);
  float aR = (1. - smoothstep(.8 * uDpr, 1.9 * uDpr, abs(h - uFocus) / fh)) * sloped * .9 * uIso * inPlan * mix(1., .5, inText);
  float cutZ = max(uFocus, 6.);
  float above = smoothstep(cutZ - fh * .5, cutZ + fh * .5, h);
  float stripe = 1. - smoothstep(.35, 1., abs(fract((fc.x - fc.y) / 7.) - .5) * 7.);
  float aP = above * stripe * .10 * uIso * inPlan * fade;
  float a = max(aC, aH);
  vec3 col = uInk * a;
  col = col * (1. - aP) + uRust * aP; a = a + aP * (1. - a);
  col = col * (1. - aR) + uRust * aR; a = a + aR * (1. - a);
  o = vec4(col, a);
}`;
const UNIFORMS = ['uRes', 'uRange', 'uLightDir', 'uDpr', 'uAA', 'uUnit', 'uReveal', 'uInterval', 'uFocus', 'uIso', 'uHatch', 'uCross', 'uGain',
  'uTri', 'uCirc', 'uInk', 'uRust', 'uSq', 'uText', 'uQuiet', 'uFade', 'uPlan'] as const;
type Loc = Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>;

type Nav = Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
/** the head script's gate, re-evaluated when Motion is switched on later */
const canGL = () => {
  const n = navigator as Nav;
  return 'WebGL2RenderingContext' in window && !n.connection?.saveData && (n.deviceMemory ?? 8) > 2;
};
const drafted = () => { try { return sessionStorage.getItem('sv:drafted') === '1'; } catch { return false; } };
const markDrafted = () => { try { sessionStorage.setItem('sv:drafted', '1'); } catch { /* private mode */ } };
const waitIdle = () => new Promise<void>((r) => idle(r, 800));
/** true while a view transition runs on this document (:active-view-transition; false where it is unsupported) */
const inViewTransition = () => { try { return document.documentElement.matches(':active-view-transition'); } catch { return false; } };
/** resolves on the first frame with no view transition running (at once when there is none) */
const afterViewTransition = () => new Promise<void>((r) => { const tick = () => (inViewTransition() ? requestAnimationFrame(tick) : r()); tick(); });
const GL_ATTRS: WebGLContextAttributes = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'low-power' };

/** Boot: called once from CoverSheet.astro. */
export function initSitePlan(): void {
  const root = document.querySelector<HTMLElement>('[data-cover]');
  if (!root || root.dataset.hero) return;
  root.dataset.hero = 'boot'; // tells the inline guard in CoverSheet that the module ran
  const html = document.documentElement;
  const boot = async (restOnly: boolean) => {
    await (document.fonts?.ready ?? Promise.resolve());
    await waitIdle();
    await hero(root, restOnly);
  };
  // The head script only knows the interface exists; WebGL can still be disabled or blocklisted. Create the context
  // now (cheap; compiling waits for idle) so a failure shows the static drawing at once instead of after fonts + idle.
  const tryContext = () => !!root.querySelector<HTMLCanvasElement>('[data-gl-canvas]')?.getContext('webgl2', GL_ATTRS);
  // forced colours show the static drawing (CSS); don't run an invisible hero or leave a focusable, hidden plan box
  if (matchMedia('(forced-colors: active)').matches && html.dataset.gl === 'maybe') html.dataset.gl = 'no';
  if (html.dataset.gl === 'maybe') {
    // arriving under a view transition (SM3 cut from another sheet): no WebGL context may be created until the cut has
    // finished — Chromium drops a cross-document transition when the NEW page creates one while it is being revealed
    // (integration finding; CoverSheet's parse-time probe stands down for the same reason)
    void afterViewTransition().then(() => {
      if (html.dataset.gl !== 'maybe') return; // Motion went off meanwhile
      if (tryContext()) void boot(false);
      else { html.dataset.gl = 'no'; root.dataset.heroFail = 'no WebGL2 context'; }
    });
    return;
  }
  // Static at load (reduced motion, Motion off, Save-Data…). If Motion is switched on later, come alive at the rest pose.
  const off = onPref('motion', (v) => {
    if (v !== 'full' || !canGL()) return;
    off();
    if (!tryContext()) return;
    html.dataset.gl = 'maybe';
    void boot(true);
  });
}

async function hero(root: HTMLElement, restOnly: boolean): Promise<void> {
  const html = document.documentElement;
  const frameEl = root.querySelector<HTMLElement>('[data-frame]');
  const glCanvas = root.querySelector<HTMLCanvasElement>('[data-gl-canvas]');
  const ovCanvas = root.querySelector<HTMLCanvasElement>('[data-ov-canvas]');
  const planEl = root.querySelector<HTMLElement>('[data-plan]');
  const sectEl = root.querySelector<HTMLElement>('[data-sect]');
  const textEl = root.querySelector<HTMLElement>('[data-text]');
  const legendEl = root.querySelector<HTMLElement>('[data-legend]');
  const keysHint = root.querySelector<HTMLElement>('[data-plan-keys]');
  const planStatus = root.querySelector<HTMLElement>('[data-plan-status]');
  // the static drawing takes over; the reason stays inspectable on the element (no console noise, SPEC §8.8)
  const fail = (why: unknown) => { root.dataset.heroFail = String(why).slice(0, 200); html.dataset.gl = 'no'; };
  if (!frameEl || !glCanvas || !ovCanvas || !planEl || !sectEl) return fail('markup missing');
  if (html.dataset.gl !== 'maybe') return; // Motion went off while we waited

  const params = new URLSearchParams(location.search);
  const coarse = matchMedia('(pointer: coarse)').matches;
  const pinnedTier = params.get('tier');
  let tier: 'hi' | 'lo' = pinnedTier === 'lo' ? 'lo' : 'hi';
  const at = params.has('at') ? Math.max(0, Number(params.get('at')) || 0) : null;
  const EL = root.dataset.el ?? 'EL', NORTH = root.dataset.north ?? 'N';

  // ── the sun at the visitor's local hour (or ?hour=) ──
  const nowD = new Date();
  const hp = params.get('hour');
  const hour = hp !== null && Number.isFinite(Number(hp)) ? Math.max(0, Math.min(24, Number(hp))) : nowD.getHours() + nowD.getMinutes() / 60;
  const [sdx, sdy] = sunDir(hour);
  const sunAng = Math.atan2(sdy, sdx);
  // the detail reads the visitor's own clock in their locale's format (SPEC SM1 change 6); only the light falls back to
  // 17:24 at night, and then the glyph is a moon
  const tm = Math.round(hour * 60) % (24 * 60);
  const clock = hp !== null ? new Date(2000, 0, 1, Math.floor(tm / 60), tm % 60) : nowD;
  const time = new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit' }).format(clock);
  const night = sunHour(hour) !== hour;

  // ── tokens: colours, type, easings ──
  const probe = document.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:absolute;inline-size:0;block-size:0;overflow:hidden;visibility:hidden';
  root.append(probe);
  const color = (token: string): RGB => {
    probe.style.color = `var(${token})`;
    const m = getComputedStyle(probe).color.match(/[\d.]+/g);
    return m ? [Math.round(+m[0]), Math.round(+m[1]), Math.round(+m[2])] : [0, 0, 0];
  };
  const px = (token: string) => { probe.style.fontSize = `var(${token})`; return parseFloat(getComputedStyle(probe).fontSize) || 12; };
  const rootCss = getComputedStyle(html);
  const ease = (token: string, dflt: [number, number, number, number]) => {
    const m = /cubic-bezier\(([^)]+)\)/.exec(rootCss.getPropertyValue(token));
    const v = m ? m[1].split(',').map(Number) : dflt;
    return bezier(v[0], v[1], v[2], v[3]);
  };
  const eBreath = ease('--ease-breath', [0.45, 0, 0.25, 1]);
  const eDraft = ease('--ease-draft', [0.65, 0.05, 0.25, 1]);
  const eUi = ease('--ease-ui', [0.2, 0.8, 0.2, 1]);
  let pal!: Palette, ink!: RGB, rust!: RGB, gain = 1;
  const dashOf = (token: string) => rootCss.getPropertyValue(token).trim().split(/[\s,]+/).map(Number).filter((n) => n > 0);
  const dash = dashOf('--dash-center'), hidden = dashOf('--dash-hidden');
  const len = (token: string, dflt: number) => parseFloat(rootCss.getPropertyValue(token)) || dflt;
  const type: Type = {
    mono: rootCss.getPropertyValue('--font-mono').trim() || 'monospace', code: px('--fs-code'), codeSm: px('--fs-code-sm'),
    dash: dash.length ? dash : [14, 3, 2, 3], hidden: hidden.length ? hidden : [4, 3], lw: { cut: len('--lw-cut', 2), border: len('--lw-border', 1.25), object: len('--lw-object', 1) },
  };
  const readPalette = () => {
    pal = { ink: color('--ink'), ink2: color('--ink-2'), rust: color('--rust'), clay: color('--clay'), sheet: color('--sheet'), paper: color('--paper') };
    ink = pal.ink; rust = pal.rust;
    gain = parseFloat(getComputedStyle(root).getPropertyValue('--_gl-gain')) || 1;
  };
  readPalette();
  try { await document.fonts.load(`500 ${type.code}px ${type.mono}`); } catch { /* canvas falls back to the stack */ }

  // ── WebGL2 ──
  let gl: WebGL2RenderingContext | null = null, prog: WebGLProgram | null = null, loc = {} as Loc;
  async function setupGL(): Promise<boolean> {
    try {
      gl = glCanvas!.getContext('webgl2', GL_ATTRS);
      if (!gl) throw new Error('no WebGL2 context');
      const g = gl;
      const sh = (t: number, s: string) => { const x = g.createShader(t)!; g.shaderSource(x, s); g.compileShader(x); return x; };
      const vs = sh(g.VERTEX_SHADER, VS), fs = sh(g.FRAGMENT_SHADER, FS);
      const p = g.createProgram()!;
      g.attachShader(p, vs); g.attachShader(p, fs); g.linkProgram(p);
      // KHR_parallel_shader_compile: let the driver compile off the main thread
      const par = g.getExtension('KHR_parallel_shader_compile') as { COMPLETION_STATUS_KHR: number } | null;
      if (par) while (!g.getProgramParameter(p, par.COMPLETION_STATUS_KHR)) await new Promise((r) => setTimeout(r, 16));
      if (!g.getProgramParameter(p, g.LINK_STATUS)) throw new Error(g.getShaderInfoLog(fs) || g.getProgramInfoLog(p) || 'link failed');
      prog = p;
      g.useProgram(p);
      loc = Object.fromEntries(UNIFORMS.map((n) => [n, g.getUniformLocation(p, n)])) as Loc;
      g.disable(g.BLEND); g.disable(g.DEPTH_TEST);
      return true;
    } catch (err) {
      fail(err);
      return false;
    }
  }
  if (!(await setupGL())) return;
  const overlay = createOverlay(ovCanvas);

  // ── layout (css px, relative to the GL frame) ──
  let W = 0, Hh = 0, dpr = 1;
  let plan: Rect = { x: 0, y: 0, w: 1, h: 1 }, sect: Rect = { x: 0, y: 0, w: 1, h: 1 };
  let U: Site = layoutPrimitives({ x: 0, y: 0, w: 1, h: 560 }, plan);
  let forms: Landform[] = [], interval = 1.25, range: [number, number] = [-4, 30];
  let rest = { cutY: 0, surveyX: 0, focus: REST_FOCUS };
  let textQ = [-1e4, -1e4, -1e4, -1e4], quiet = [-1e4, -1e4, -1e4, -1e4], fadeE = [0, 40, 0, 0];
  let pc = { x: 0, y: 0 };
  let legend: { y1: number; y2: number; yc: number; right: number } | null = null;
  let hint: Rect | null = null;
  const hintEl = root.querySelector<HTMLElement>('.cover__hint');
  let laidOut = false;

  /** DPR policy (SPEC SM1 change 8): 1.5 fine / 1.25 coarse, 1.0 on the low tier, and never more than 2.4 MP */
  function sizeCanvases() {
    const cap = coarse ? 1.25 : 1.5;
    dpr = Math.min(devicePixelRatio || 1, cap);
    if (tier === 'lo') dpr = Math.min(dpr, 1);
    if (W * Hh * dpr * dpr > MP_CAP) dpr = Math.sqrt(MP_CAP / (W * Hh));
    glCanvas!.width = Math.max(1, Math.round(W * dpr));
    glCanvas!.height = Math.max(1, Math.round(Hh * dpr));
    let d2 = Math.min(devicePixelRatio || 1, 2);
    if (W * Hh * d2 * d2 > OV_CAP) d2 = Math.sqrt(OV_CAP / (W * Hh));
    overlay.size(W, Hh, d2);
  }

  function layout() {
    const fr = frameEl!.getBoundingClientRect();
    W = Math.max(1, fr.width); Hh = Math.max(1, fr.height);
    const rel = (el: Element): Rect => { const b = el.getBoundingClientRect(); return { x: b.left - fr.left, y: b.top - fr.top, w: b.width, h: b.height }; };
    const first = !laidOut;
    const prevPlan = plan;
    plan = rel(planEl!); sect = rel(sectEl!);
    U = layoutPrimitives({ x: 0, y: 0, w: W, h: Hh }, plan, sect);
    forms = landforms(U);
    interval = intervalFor(U);
    rest = restPose(U, plan);
    pc = { x: plan.x + plan.w / 2, y: plan.y + plan.h / 2 };
    // elevation range over the frame, for the rising drafting-in
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i <= 48; i++) for (let j = 0; j <= 28; j++) { const v = Hpx((W * i) / 48, (Hh * j) / 28, U); lo = Math.min(lo, v); hi = Math.max(hi, v); }
    range = [lo, Math.max(hi, ...forms.map((f) => f.top))];
    // quiet zones: the headline block when it sits over the frame (≥ 1024), and the section band + its legend row
    textQ = [-1e4, -1e4, -1e4, -1e4];
    fadeE = [26, 26, 0, 0];
    if (textEl) {
      const kids = Array.from(textEl.children);
      if (kids.length) {
        const a = rel(kids[0]), b = rel(kids[kids.length - 1]), t = rel(textEl);
        if (t.x < W && t.x + t.w > 0 && a.y < Hh && b.y + b.h > 0) { textQ = [t.x - 10, a.y - 10, t.x + t.w + 10, b.y + b.h + 10]; fadeE = [0, 40, 0, 0]; }
      }
    }
    // …down to the frame's bottom edge: a quiet band that ended between the legend row and the bottom fade let a
    // contour surface for a few px there and read as a tapered smudge
    quiet = [sect.x - 8, sect.y - 10, sect.x + sect.w + 8, Hh + 20];
    // the section title's two lines (HTML), for the graphic scale
    const lines = legendEl ? Array.from(legendEl.querySelectorAll('p > span')) : [];
    legend = null;
    if (lines.length >= 2) {
      const a = rel(lines[0]), b = rel(lines[1]), t = rel(lines[0].parentElement!);
      const bub = legendEl!.querySelector('.bubble');
      const bb = bub ? rel(bub) : null;
      if (a.h && b.h) legend = { y1: a.y + a.h / 2, y2: b.y + b.h / 2, yc: bb?.h ? bb.y + bb.h / 2 : (a.y + b.y + b.h) / 2, right: t.x + Math.max(a.w, b.w) };
    }
    // the hint row's words (its first and last visible spans)
    hint = null;
    const spans = hintEl ? Array.from(hintEl.children).filter((e) => (e as HTMLElement).offsetWidth > 0) : [];
    if (spans.length) { const a = rel(spans[0]), b = rel(spans[spans.length - 1]), p = rel(hintEl!); hint = { x: a.x, y: p.y, w: b.x + b.w - a.x, h: p.h }; }
    sizeCanvases();
    laidOut = true;
    // keep the pose meaningful in the new geometry (touch: the cut always follows the scroll position)
    if (st.ctl === 'touch') scrollCut(true);
    else if (first || st.ctl === 'none') setNow(restValues());
    else if (st.ctl === 'keys') {
      const kx = plan.x + ((st.sx - prevPlan.x) / prevPlan.w) * plan.w, ky = plan.y + ((st.cut - prevPlan.y) / prevPlan.h) * plan.h;
      survey(kx, ky, true);
    }
  }

  // ── state ──
  const st = {
    ang: sunAng, cut: 0, sx: 0, focus: REST_FOCUS,          // rendered values
    angT: sunAng, cutT: 0, sxT: 0, focusT: REST_FOCUS,      // eased toward
    reveal: 0, plot: 0, grid: 0, ui: 0, hatch: 0, iso: 0,   // drafting-in, 0 → 1
    tag: null as { x: number; y: number } | null,
    marker: false,
    ctl: 'none' as 'none' | 'pointer' | 'keys' | 'touch',
  };
  const restValues = () => ({ ang: sunAng, cut: rest.cutY, sx: rest.surveyX, focus: rest.focus });
  function setNow(v: Partial<{ ang: number; cut: number; sx: number; focus: number }>) {
    if (v.ang !== undefined) { st.ang = v.ang; st.angT = v.ang; }
    if (v.cut !== undefined) { st.cut = v.cut; st.cutT = v.cut; }
    if (v.sx !== undefined) { st.sx = v.sx; st.sxT = v.sx; }
    if (v.focus !== undefined) { st.focus = v.focus; st.focusT = v.focus; }
  }
  const drawn = () => { st.reveal = st.plot = st.grid = st.ui = st.hatch = st.iso = 1; };
  /** the cut line stays far enough inside the plan box that its section heads never leave it */
  const clampCut = (y: number) => Math.max(plan.y + CUT_INSET_TOP, Math.min(plan.y + plan.h - CUT_INSET_BOTTOM, y));
  /** …and the survey point (its cross, 6 px either way) stays on the drawn cut line, between the section heads */
  const clampSx = (x: number) => Math.max(plan.x + CUT_INSET_X + 8, Math.min(plan.x + plan.w - CUT_INSET_X - 8, x));

  // ── timeline: drafting-in, demo, settle ──
  let tl: null | { t0: number; demo: boolean; boostAt: number; boostT: number } = null;
  let ret: null | { from: number; to: number; t0: number } = null;
  function drafting(t: number) {
    st.reveal = eDraft(clamp01(t / REVEAL_MS));
    st.plot = eDraft(clamp01((t - 150) / (REVEAL_MS - 350)));
    st.grid = clamp01((t - 250) / 700);
    st.ui = eUi(clamp01((t - 900) / 800));
    st.hatch = eUi(clamp01((t - 1350) / 850));
    st.iso = eUi(clamp01((t - 1500) / 600));
  }
  function demo(t: number) {
    const cut = clampCut(plan.y + plan.h * keyed(K_CUT, t, eBreath));
    const focus = keyed(K_FOCUS, t, eBreath);
    const sx = crossingX(U, cut, focus, plan.x + 4, plan.x + plan.w - 4, rest.surveyX) ?? st.sx;
    setNow({ ang: sunAng + keyed(K_ANG, t, eBreath) * DEG, cut, focus, sx });
  }
  /** advance the timeline; returns true while it still needs frames */
  function stepTimeline(now: number, dt: number): boolean {
    if (!tl) return false;
    if (tl.t0 < 0) tl.t0 = now;
    const tAbs = at ?? now - tl.t0;
    const t = tl.boostAt ? tl.boostT + (now - tl.boostAt) * BOOST : tAbs;
    drafting(t);
    if (tl.demo) demo(tAbs);
    if (st.reveal >= 1 && !restOnly && at === null) markDrafted();
    // end on the last frame before the end: if the next frame (at the current interval) would land past it, this one
    // draws the rest pose, so the motion never runs past T_END + one frame however slow the frames are
    const done = tl.demo ? tAbs + dt >= T_END : t >= T_DRAWN;
    if (at !== null || done) {
      if (at === null) { drawn(); if (tl.demo) setNow(restValues()); }
      tl = null;
      return false;
    }
    return true;
  }
  /** end the timeline at once (scrolled away, Motion off, context restored, keyboard input) */
  function finishTimeline() {
    if (!tl) return;
    if (tl.demo) setNow(restValues());
    tl = null;
    drawn();
    if (!restOnly) markDrafted();
  }
  /** someone took over: cancel the demo; pointer input finishes the drafting-in fast, keyboard at once */
  function takeOver(kind: 'pointer' | 'keys' | 'touch', now = performance.now()) {
    st.ctl = kind;
    if (!tl) return;
    tl.demo = false;
    if (kind === 'keys') finishTimeline();
    else if (kind === 'pointer' && !tl.boostAt && tl.t0 >= 0) { tl.boostT = now - tl.t0; tl.boostAt = now; }
  }

  // ── controllers ──
  /** the survey point: the cut line follows y and the projector x (each within its travel), and the isoline takes the
   *  level AT the survey point — (sx, cut), not the raw pointer — so plan isoline, cut line, projector, ▼ and EL tag
   *  always read one level, also when the pointer is in a clamp band at the plan's edge (and when it leaves there) */
  function survey(x: number, y: number, instant: boolean) {
    x = Math.max(plan.x, Math.min(plan.x + plan.w, x));
    y = Math.max(plan.y, Math.min(plan.y + plan.h, y));
    const cut = clampCut(y), sx = clampSx(x);
    const v = { cut, sx, focus: Hpx(sx, cut, U), ang: Math.atan2(y - pc.y, x - pc.x) };
    if (instant) setNow(v);
    else { st.cutT = v.cut; st.sxT = v.sx; st.focusT = v.focus; st.angT = v.ang; }
    return v;
  }
  let ptr: null | { x: number; y: number } = null, left = false;
  function pointerFrame(now: number) {
    if (left) {
      left = false;
      st.tag = null;
      ret = { from: st.ang, to: sunAng, t0: now };
      st.angT = sunAng;
    }
    if (!ptr) return;
    const fr = frameEl!.getBoundingClientRect();
    const x = ptr.x - fr.left, y = ptr.y - fr.top;
    ptr = null;
    ret = null;
    if (Math.hypot(x - pc.x, y - pc.y) > 1) st.angT = Math.atan2(y - pc.y, x - pc.x);
    if (inside(plan, x, y)) { const v = survey(x, y, false); st.tag = { x: v.sx, y: v.cut }; } else st.tag = null;
  }
  /**
   * Touch (SPEC SM1 interaction map): the scroll drives the cut — progress = clamp((vh·.5 − planTop) / planH) — and with
   * it the section; the survey x (the rest pose's, on the +12.00 contour nearest .62w — or where you tapped) drops the
   * projector. The rust isoline is the survey point's level, Hpx(sx, cut), eased as the scroll moves: plan isoline,
   * projector and ▼ always agree, and at the rest cut (55%) they read +12.00.
   */
  let tapX: number | null = null, scrolled = false;
  function scrollCut(instant: boolean) {
    const pr = planEl!.getBoundingClientRect();
    const prog = clamp01((innerHeight * 0.5 - pr.top) / Math.max(1, pr.height));
    const cut = clampCut(plan.y + prog * plan.h);
    const sx = tapX ?? rest.surveyX;
    const v = { cut, sx, focus: Hpx(sx, cut, U), ang: sunAng };
    if (instant) setNow(v); else { st.cutT = v.cut; st.sxT = v.sx; st.focusT = v.focus; st.angT = v.ang; }
  }
  function stepEase(dt: number, now: number): boolean {
    let moving = false;
    const k = (tau: number) => (dt > 0 ? 1 - Math.exp(-dt / tau) : 0);
    if (ret) {
      const p = clamp01((now - ret.t0) / RETURN_MS);
      st.ang = ret.from + wrap(ret.to - ret.from) * eUi(p);
      if (p < 1) moving = true; else { ret = null; st.ang = sunAng; }
    } else {
      const d = wrap(st.angT - st.ang);
      if (Math.abs(d) > 1e-3) { st.ang += d * k(90); moving = true; } else st.ang = st.angT;
    }
    const approach = (cur: 'cut' | 'sx' | 'focus', tgt: 'cutT' | 'sxT' | 'focusT', eps: number, tau: number) => {
      const d = st[tgt] - st[cur];
      if (Math.abs(d) > eps) { st[cur] += d * k(tau); moving = true; } else st[cur] = st[tgt];
    };
    approach('cut', 'cutT', 0.2, 70);
    approach('sx', 'sxT', 0.2, 70);
    approach('focus', 'focusT', 0.005, 90);
    return moving;
  }

  // ── render ──
  function render() {
    const g = gl!;
    g.viewport(0, 0, glCanvas!.width, glCanvas!.height);
    g.useProgram(prog);
    g.uniform2f(loc.uRes, glCanvas!.width, glCanvas!.height);
    g.uniform1f(loc.uDpr, glCanvas!.width / W);
    g.uniform1f(loc.uAA, Math.max(1, (devicePixelRatio || 1) / (glCanvas!.width / W)));
    g.uniform1f(loc.uUnit, U.unit);
    g.uniform1f(loc.uReveal, st.reveal);
    g.uniform2f(loc.uRange, range[0], range[1]);
    g.uniform1f(loc.uInterval, interval);
    g.uniform1f(loc.uFocus, st.focus);
    g.uniform1f(loc.uIso, st.iso);
    g.uniform1f(loc.uHatch, st.hatch);
    g.uniform1f(loc.uCross, tier === 'lo' ? 0 : 1);
    g.uniform1f(loc.uGain, gain);
    g.uniform2f(loc.uLightDir, Math.cos(st.ang), Math.sin(st.ang));
    g.uniform3f(loc.uTri, U.tri[0], U.tri[1], U.tri[2]);
    g.uniform3f(loc.uCirc, U.circ[0], U.circ[1], U.circ[2]);
    g.uniform4f(loc.uSq, U.sq[0], U.sq[1], U.sq[2], U.sq[3]);
    g.uniform4f(loc.uText, textQ[0], textQ[1], textQ[2], textQ[3]);
    g.uniform4f(loc.uQuiet, quiet[0], quiet[1], quiet[2], quiet[3]);
    g.uniform4f(loc.uFade, fadeE[0], fadeE[1], fadeE[2], fadeE[3]);
    g.uniform4f(loc.uPlan, plan.x, plan.y, plan.x + plan.w, plan.y + plan.h);
    g.uniform3f(loc.uInk, ink[0] / 255, ink[1] / 255, ink[2] / 255);
    g.uniform3f(loc.uRust, rust[0] / 255, rust[1] / 255, rust[2] / 255);
    g.clearColor(0, 0, 0, 0);
    g.clear(g.COLOR_BUFFER_BIT);
    g.drawArrays(g.TRIANGLES, 0, 3);
    const scene: Scene = {
      W, H: Hh, plan, sect, U, forms,
      grid: st.grid, ui: st.ui, iso: st.iso, plot: st.plot,
      cut: st.cut, sx: st.sx, ang: st.ang, restCut: rest.cutY, restSx: rest.surveyX, tag: st.tag, marker: st.marker,
      time, night, el: EL, north: NORTH, legend, hint,
    };
    overlay.draw(scene, pal, type);
  }

  // ── the loop: renders only while something changes ──
  let raf = 0, prev = 0, dirty = false, needLayout = true, live = true, lost = false, visible = false, started = false, shown = false;
  // leaving under a view transition (see pageswap below): the context is released and a 2D still stands in
  let leaving = false;
  let still: HTMLCanvasElement | null = null;
  let loseExt: WEBGL_lose_context | null = null;
  const samples: number[] = [];
  function kick() {
    dirty = true;
    if (!raf && live && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function frame(now: number) {
    raf = 0;
    if (!live || !visible || document.hidden) return;
    dirty = false;
    const dt = prev ? Math.min(64, Math.max(0, now - prev)) : 0;
    prev = now;
    if (needLayout) { needLayout = false; layout(); }
    if (st.ctl === 'pointer') pointerFrame(now);
    if (st.ctl === 'touch' && scrolled) { scrolled = false; scrollCut(false); }
    let busy = stepTimeline(now, dt);
    busy = stepEase(dt, now) || busy;
    // adaptive tier: the median frame interval while drafting in
    if (tl && dt > 0 && !pinnedTier && tier === 'hi') {
      samples.push(dt);
      if (samples.length >= 10) {
        const m = [...samples].sort((a, b) => a - b)[samples.length >> 1];
        samples.length = 0;
        if (m > TIER_MS) { tier = 'lo'; sizeCanvases(); } // DPR 1.0 and no cross-hatch from here on
      }
    }
    render();
    if (!shown) {
      shown = true; html.dataset.gl = 'live'; planEl!.tabIndex = 0;
      // a11y r1: a Tab stop that answers the arrows says so (it stays an image: its name is the drawing's)
      if (planEl!.dataset.roledesc) planEl!.setAttribute('aria-roledescription', planEl!.dataset.roledesc);
      if (keysHint) { keysHint.hidden = false; planEl!.setAttribute('aria-describedby', keysHint.id); }
      // back from the bfcache: the first live frame takes the still's place (same pixels, no blank frame between)
      if (still) { still.remove(); still = null; glCanvas!.hidden = false; }
    }
    if (busy) raf = requestAnimationFrame(frame);
    else prev = 0; // settled: 0 frames until the next input
  }

  function begin() {
    started = true;
    if (coarse) { st.ctl = 'touch'; scrollCut(true); }
    if (restOnly || drafted()) { drawn(); kick(); return; }
    tl = { t0: -1, demo: !coarse, boostAt: 0, boostT: 0 };
    kick();
  }

  // ── wiring ──
  root.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    ptr = { x: e.clientX, y: e.clientY };
    if (st.ctl !== 'pointer') takeOver('pointer', e.timeStamp);
    kick();
  }, { passive: true });
  root.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'touch' || st.ctl !== 'pointer') return;
    ptr = null; left = true;
    kick();
  });
  let down: null | { x: number; y: number; t: number } = null;
  planEl.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') down = { x: e.clientX, y: e.clientY, t: e.timeStamp }; }, { passive: true });
  planEl.addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'touch' || !down) return;
    const tap = Math.hypot(e.clientX - down.x, e.clientY - down.y) < 10 && e.timeStamp - down.t < 500;
    down = null;
    if (!tap) return;
    // a touch on a laptop whose main pointer is fine (a hybrid) points at the spot, like the mouse would
    if (!coarse) { ptr = { x: e.clientX, y: e.clientY }; if (st.ctl !== 'pointer') takeOver('pointer', e.timeStamp); kick(); return; }
    const fr = frameEl!.getBoundingClientRect();
    tapX = clampSx(e.clientX - fr.left);
    if (st.ctl !== 'touch') takeOver('touch');
    scrolled = true;
    kick();
  }, { passive: true });
  if (coarse) addEventListener('scroll', () => { if (st.ctl === 'touch') { scrolled = true; kick(); } }, { passive: true });

  // the EL the keyboard's survey point reads, said once the keys come to rest (the drawn tag is for sighted readers)
  let sayT = 0;
  const sayEl = () => {
    window.clearTimeout(sayT);
    sayT = window.setTimeout(() => {
      if (!planStatus || !st.tag || document.activeElement !== planEl) return;
      planStatus.textContent = `${EL} ${formatLevel(Hpx(st.tag.x, st.tag.y, U))}`;
    }, 400);
  };
  planEl.addEventListener('keydown', (e) => {
    if (!live || e.altKey || e.ctrlKey || e.metaKey) return;
    const step = e.shiftKey ? KEY_STEP_BIG : KEY_STEP;
    const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (e.key === 'Escape') {
      if (st.ctl !== 'keys') return;
      e.preventDefault();
      setNow(restValues());
      st.tag = { x: st.sx, y: st.cut };
      kick();
      sayEl();
      return;
    }
    const m = d[e.key];
    if (!m) return;
    e.preventDefault();
    if (st.ctl !== 'keys') takeOver('keys');
    st.marker = true;
    ret = null;
    const v = survey(st.sx + m[0], st.cut + m[1], true); // keyboard never animates (SPEC §2.7 law 1)
    st.tag = { x: v.sx, y: v.cut };
    kick();
    sayEl();
  });
  planEl.addEventListener('focus', () => {
    if (!live || !planEl.matches(':focus-visible')) return;
    takeOver('keys');
    st.marker = true;
    st.tag = { x: st.sx, y: st.cut };
    kick();
  });
  planEl.addEventListener('blur', () => {
    if (!st.marker) return;
    st.marker = false;
    st.tag = null;
    ret = null;
    setNow({ ang: sunAng });
    st.ctl = coarse ? 'touch' : 'none';
    kick();
  });

  new ResizeObserver(() => { needLayout = true; kick(); }).observe(frameEl);
  const watchDpr = () => {
    const mq = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
    mq.addEventListener('change', () => { needLayout = true; kick(); watchDpr(); }, { once: true });
  };
  watchDpr();
  // start once the COVER is ≥ 35% visible (SPEC SM1) — not the drawing block, which on a short phone sits below the
  // fold with its static drawing already hidden; draw whenever any of the drawing is on screen
  onVisibility(root, (v) => { if (v && !started) begin(); }, VISIBLE);
  onVisibility(frameEl, (v) => {
    visible = v;
    if (v) { if (dirty) kick(); }
    else if (tl && at === null) { finishTimeline(); dirty = true; } // scrolled away mid-drafting: it is simply finished
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && dirty) kick(); });

  listen('sv:theme', () => { readPalette(); kick(); });
  onPref('motion', (v) => {
    if (v === 'reduce') {
      live = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      finishTimeline();
      html.dataset.gl = 'no';
      planEl!.removeAttribute('tabindex');
    } else if (!lost) {
      live = true; shown = false;
      html.dataset.gl = 'maybe';
      kick();
    }
  });

  glCanvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    lost = true; live = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (leaving) return; // released on purpose while the page is left under a view transition: its still stands in
    html.dataset.gl = 'no';
    planEl!.removeAttribute('tabindex');
  });
  glCanvas.addEventListener('webglcontextrestored', async () => {
    if (!(await setupGL())) return;
    lost = false;
    finishTimeline();
    if (html.dataset.motion === 'reduce') return;
    live = true; shown = false; needLayout = true;
    html.dataset.gl = 'maybe';
    kick();
  });

  // ── leaving A-000 under a view transition (SM3 "cut to sheet"; integration) ──
  // Chromium skips a cross-document view transition whose OLD page still holds a live WebGL context: every cut away
  // from the cover sheet was dropped (measured 0/5, 5/5 once the context is released). So when a transition is about
  // to capture this page (pageswap carries it), the live frame is drawn once more and copied, pixel for pixel, into a
  // 2D canvas that takes the GL canvas's place (a shallow clone: same scoped class, same box), and the context is
  // released. The snapshot shows exactly what was on screen. Back from the bfcache, the copy goes and the context is
  // restored (webglcontextrestored → live again, at the rest pose).
  addEventListener('pageswap', (e) => {
    const vt = (e as Event & { viewTransition?: ViewTransition | null }).viewTransition;
    if (!vt || !gl || lost) return;
    leaving = true;
    try {
      if (shown && !needLayout) render(); // preserveDrawingBuffer is off: draw, then read in the same task
      const copy = glCanvas.cloneNode(false) as HTMLCanvasElement;
      copy.removeAttribute('data-gl-canvas');
      copy.setAttribute('data-gl-still', '');
      copy.width = glCanvas.width; copy.height = glCanvas.height;
      if (shown) copy.getContext('2d')?.drawImage(glCanvas, 0, 0);
      glCanvas.after(copy);
      glCanvas.hidden = true;
      still = copy;
    } catch { /* the snapshot keeps whatever is painted */ }
    loseExt = gl.getExtension('WEBGL_lose_context');
    loseExt?.loseContext();
  });
  addEventListener('pageshow', (e) => {
    if (!(e as PageTransitionEvent).persisted || !leaving) return;
    leaving = false;
    // the still keeps showing the frame; the context comes back once any cut has finished (a context created while a
    // view transition reveals the page drops it), and frame() swaps the still out on the first live frame
    void afterViewTransition().then(() => loseExt?.restoreContext());
  });

  // warm the pipeline once (a 1-px draw with nothing inked, then cleared), so the first visible frame does not stall
  const g0 = gl!;
  g0.viewport(0, 0, 1, 1);
  g0.uniform1f(loc.uUnit, 560);
  g0.uniform1f(loc.uDpr, 1);
  g0.uniform1f(loc.uGain, 0);
  g0.uniform2f(loc.uRange, -4, 30);
  g0.drawArrays(g0.TRIANGLES, 0, 3);
  g0.clearColor(0, 0, 0, 0);
  g0.clear(g0.COLOR_BUFFER_BIT);
}
