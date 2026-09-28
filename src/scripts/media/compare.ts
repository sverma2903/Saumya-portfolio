/**
 * compare.ts · WP4b (SPEC SM6a). The Section cut A–A: one custom property per input (--x, or --lx/--ly), so exactly one
 * layer repaints.
 *   cut    the native range drives --x (the inline oninput already does; this adds aria-valuetext)
 *   loupe  "Loupe" button / U: the pointer steers the circle; with a keyboard or no pointer, ONE drift (≤ 4.6 s, paused
 *          offscreen) tours the KPI cards → map → table and parks on the chart. Motion off: parked at once.
 * Keyboard-initiated actions never animate (the mode switch is instant; the drift is the loupe finding its subject,
 * and it is skipped with Motion off).
 */
import { $$, motionOK, ready } from '../core/dom';
import { observe } from '../core/io';
import { registerShortcut } from '../core/keys';

type Pt = [number, number];
// regions of her final screen, in % of the image (measured on lR8M0Y): the chart is where the loupe parks
const CHART: Pt = [33, 47];
const TOUR: Pt[] = [CHART, [48, 27], [70, 46], [52, 79], CHART];
const DRIFT_MS = 4600;

/** Catmull-Rom through the tour, t ∈ [0,1] */
function along(t: number): Pt {
  const n = TOUR.length - 1;
  const f = Math.min(n - 1e-6, Math.max(0, t * n));
  const i = Math.floor(f);
  const u = f - i;
  const p0 = TOUR[Math.max(0, i - 1)], p1 = TOUR[i], p2 = TOUR[i + 1], p3 = TOUR[Math.min(n, i + 2)];
  const c = (a: number, b: number, cc: number, d: number) =>
    0.5 * (2 * b + (-a + cc) * u + (2 * a - 5 * b + 4 * cc - d) * u * u + (-a + 3 * b - 3 * cc + d) * u * u * u);
  return [c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])];
}
const breath = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function wire(cmp: HTMLElement): void {
  if (cmp.dataset.wired) return;
  cmp.dataset.wired = '';
  const stage = cmp.querySelector<HTMLElement>('[data-cmp-stage]');
  const range = cmp.querySelector<HTMLInputElement>('.cmp__range');
  const btn = cmp.querySelector<HTMLButtonElement>('[data-compare-mode]');
  if (!stage || !range || !btn) return;

  const setX = () => {
    cmp.style.setProperty('--x', `${range.value}%`);
    range.setAttribute('aria-valuetext', (range.dataset.tValue ?? '{n}%').replace('{n}', range.value));
  };
  range.addEventListener('input', setX);

  const place = (x: number, y: number) => {
    cmp.style.setProperty('--lx', `${x.toFixed(2)}%`);
    cmp.style.setProperty('--ly', `${y.toFixed(2)}%`);
  };

  // ── the drift: once per loupe activation, paused while offscreen ──
  let raf = 0, elapsed = 0, last = 0, drifting = false, onscreen = false, steered = false;
  const stop = () => { cancelAnimationFrame(raf); raf = 0; drifting = false; };
  const frame = (now: number) => {
    raf = 0;
    if (!drifting) return;
    if (!onscreen) { last = 0; return; } // resumes from the IO callback
    if (last) elapsed += now - last;
    last = now;
    const t = Math.min(1, elapsed / DRIFT_MS);
    const [x, y] = along(breath(t));
    place(x, y);
    if (t >= 1) { stop(); place(...CHART); return; }
    raf = requestAnimationFrame(frame);
  };
  const drift = () => {
    stop();
    if (!motionOK()) { place(...CHART); return; }
    drifting = true; elapsed = 0; last = 0;
    raf = requestAnimationFrame(frame);
  };
  observe(cmp, (en) => {
    onscreen = en.isIntersecting;
    if (onscreen && drifting && !raf) raf = requestAnimationFrame(frame);
  });

  const setMode = (loupe: boolean, viaPointer: boolean) => {
    cmp.dataset.mode = loupe ? 'loupe' : 'cut';
    btn.setAttribute('aria-pressed', String(loupe));
    if (!loupe) { stop(); return; }
    steered = false;
    place(...CHART);
    // a pointer resting on the drawing steers it; otherwise the loupe tours once and parks on the chart
    if (!viaPointer || !stage.matches(':hover')) drift();
  };
  btn.addEventListener('click', (e) => setMode(cmp.dataset.mode !== 'loupe', (e as MouseEvent).detail > 0));
  (cmp as HTMLElement & { svToggle?: () => void }).svToggle = () => setMode(cmp.dataset.mode !== 'loupe', false);

  stage.addEventListener('pointermove', (e) => {
    if (cmp.dataset.mode !== 'loupe') return;
    if (!steered) { steered = true; stop(); }
    const r = stage.getBoundingClientRect();
    place(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
  });
  stage.addEventListener('pointerdown', (e) => {
    if (cmp.dataset.mode !== 'loupe') return;
    steered = true; stop();
    const r = stage.getBoundingClientRect();
    place(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
  });
  setX();
}

/** U (case pages): the section cut in view switches Cut ↔ Loupe. WP1 registers the same key through the DOM contract. */
registerShortcut('u', 'case', () => {
  const vh = innerHeight;
  const cmp = $$<HTMLElement>('[data-compare]').find((c) => {
    const r = c.getBoundingClientRect();
    const seen = Math.min(r.bottom, vh) - Math.max(r.top, 0);
    return seen > 0 && seen >= Math.min(r.height, vh) * 0.2;
  });
  (cmp as (HTMLElement & { svToggle?: () => void }) | undefined)?.svToggle?.();
});

ready(() => { for (const c of $$<HTMLElement>('[data-compare]')) wire(c); });
