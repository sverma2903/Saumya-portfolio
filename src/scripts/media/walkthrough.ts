/**
 * walkthrough.ts · WP4b (SPEC §6.2 WalkthroughPhone). The sticky phone: ≥ 1024px with Motion on (JS only).
 *   · the active step is the one crossing the viewport's centre line (a zero-height IntersectionObserver band)
 *   · two stacked views swap her GIFs: the incoming one is decoded first, then cross-fades over --dur-2; the outgoing
 *     view drops its src (memory). A swap restarts the GIF from frame 0.
 *   · mounted within 1 viewport, parked beyond 3; Pause shows the step's poster frame (ImageDecoder), Restart re-sets
 *     the src; Enlarge opens the active step's own figure. Below 1024px / Motion off: the stacked layout, where each
 *     step's Plate is an ordinary managed GIF (plates.ts). Save-Data: the stacked layout too (polish r1).
 */
import { $$, motionOK, ready, saveData } from '../core/dom';
import { observe, viewportMargin } from '../core/io';
import { on as onPref } from '../core/prefs';
import { openDetail } from './plates';
import { setState } from './state';
// without ImageDecoder (Safari) the paused phone holds the GIF's first frame (firstFrame), so Pause still stops the
// motion and never empties the stage
import { decodePoster, firstFrame } from './gif';
import { isHeld, onHold } from './hold';

const wide = matchMedia('(min-width: 1024px)');

function wire(grid: HTMLElement): void {
  if (grid.dataset.wired) return;
  grid.dataset.wired = '';
  const steps = $$<HTMLElement>('[data-walk-step]', grid);
  const stageEl = grid.querySelector<HTMLElement>('[data-walk-stage]');
  if (!stageEl || !steps.length) return;
  const stage: HTMLElement = stageEl;
  const views = $$<HTMLElement>('[data-walk-view]', stage);
  const figLabel = stage.querySelector<HTMLElement>('[data-walk-fig]');
  const enlarge = stage.querySelector<HTMLButtonElement>('[data-mc-enlarge]');
  const src = steps.map((s) => s.querySelector<HTMLElement>('img[data-gif]')?.dataset.src ?? '');
  const alts = steps.map((s) => s.querySelector<HTMLImageElement>('img[data-gif]')?.alt ?? '');
  const plates = steps.map((s) => s.querySelector<HTMLElement>('[data-plate]'));
  const posters = steps.map((s) => Number(s.querySelector<HTMLElement>('img[data-gif]')?.dataset.poster ?? 0));
  let active = 0, shown = -1, front = 0, near = false, far = false, paused = false, sticky = false, token = 0;

  const secsOf = (i: number) => plates[i]?.style.getPropertyValue('--_secs') || '10s';
  const viewStyleOf = (i: number) => plates[i]?.querySelector<HTMLElement>('.plate__view')?.getAttribute('style') ?? '';

  function label(i: number) {
    const fig = plates[i]?.dataset.figNo ?? '';
    if (figLabel) figLabel.textContent = fig;
    const lbl = plates[i]?.querySelector<HTMLElement>('.plate__open')?.getAttribute('aria-label');
    if (enlarge && lbl) enlarge.setAttribute('aria-label', lbl);
    stage.querySelector('[data-mc]')?.setAttribute('aria-label', fig);
    stage.style.setProperty('--_secs', secsOf(i));
  }

  /** show step i in the back view, then cross-fade (decoded pixels first: nothing flashes) */
  function show(i: number) {
    if (!sticky) return;
    const t = ++token;
    const nextFront = 1 - front; // always the hidden view: the one on screen keeps playing until the swap
    const v = views[nextFront];
    const img = v.querySelector<HTMLImageElement>('img')!;
    const cv = v.querySelector<HTMLCanvasElement>('canvas')!;
    v.setAttribute('style', viewStyleOf(i));
    img.setAttribute('width', String(plates[i]?.querySelector('img')?.getAttribute('width') ?? ''));
    img.setAttribute('height', String(plates[i]?.querySelector('img')?.getAttribute('height') ?? ''));
    img.alt = alts[i];
    cv.hidden = true;
    label(i);
    const reveal = () => {
      if (t !== token) return;
      for (const o of views) if (o !== v) { o.removeAttribute('data-on'); const oi = o.querySelector('img')!; oi.alt = ''; setTimeout(() => { if (!o.hasAttribute('data-on')) oi.removeAttribute('src'); }, 400); }
      v.setAttribute('data-on', '');
      front = nextFront; shown = i;
      setState(stage, paused ? 'paused' : 'playing', { restartProgress: true });
    };
    if (!near || far || isHeld()) { setState(stage, 'idle'); shown = -1; return; }
    if (paused) {
      const nw = Number(img.getAttribute('width')) || 400;
      const nh = Number(img.getAttribute('height')) || 800;
      const w = Math.min(nw, Math.round((v.clientWidth || nw) * Math.min(devicePixelRatio || 1, 2)));
      decodePoster(src[i], posters[i], cv, w, nw / nh)
        .then((ok) => ok || firstFrame(src[i], cv, w, nw / nh))
        .then((ok) => { if (ok && t === token) { cv.hidden = false; img.removeAttribute('src'); reveal(); } });
      return;
    }
    // the same URL again (Restart, Educademy's return to so2bh2) must start from frame 0: drop the src, re-set it next frame
    if (img.getAttribute('src')) img.removeAttribute('src');
    requestAnimationFrame(() => {
      if (t !== token) return;
      img.src = src[i];
      (img.decode ? img.decode() : Promise.resolve()).then(reveal, reveal);
    });
  }

  function park() {
    for (const v of views) { v.removeAttribute('data-on'); v.querySelector('img')!.removeAttribute('src'); }
    shown = -1;
    setState(stage, 'parked');
  }

  function mode() {
    // Save-Data: the stacked layout, whose plates are managed GIFs that wait for Play (gif.ts)
    const on = wide.matches && motionOK() && !saveData();
    if (on === sticky) return;
    sticky = on;
    grid.toggleAttribute('data-sticky', on);
    stage.hidden = !on;
    // the stacked plates are the page's GIFs again below 1024 / with Motion off; in sticky mode they stay unmounted
    for (const p of plates) p?.toggleAttribute('data-walk-hidden', on);
    if (on) { shown = -1; show(active); } else park();
  }

  // the active step: whichever crosses the centre line
  for (const [i, s] of steps.entries()) {
    observe(s, (en) => {
      if (!en.isIntersecting || i === active) return;
      steps[active]?.removeAttribute('aria-current');
      active = i;
      s.setAttribute('aria-current', 'step');
      if (sticky) show(i);
    }, { rootMargin: '-50% 0px -50% 0px' });
  }
  observe(grid, (en) => { near = en.isIntersecting; if (sticky && near && shown !== active) show(active); }, { rootMargin: viewportMargin(1) });
  observe(grid, (en) => { far = !en.isIntersecting; if (far && sticky && shown !== -1) park(); }, { rootMargin: viewportMargin(3) });

  stage.addEventListener('click', (e) => {
    const b = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-mc-toggle], [data-mc-restart], [data-mc-enlarge]') : null;
    if (!b) return;
    if (b.matches('[data-mc-enlarge]')) { const p = plates[active]; if (p) openDetail(p, b); return; }
    if (b.matches('[data-mc-restart]')) { paused = false; shown = -1; show(active); return; }
    paused = stage.dataset.state === 'playing';
    shown = -1;
    show(active);
  });

  // the Enlarged detail is open over the page: the stage stands down (parked), and comes back on the active step
  onHold((held) => {
    if (!sticky) return;
    if (held) { if (shown !== -1) park(); } else if (near && !far) { shown = -1; show(active); }
  });
  wide.addEventListener('change', mode);
  onPref('motion', mode);
  mode();
}

ready(() => { for (const g of $$<HTMLElement>('[data-walk]')) wire(g); });
