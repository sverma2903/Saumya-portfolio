/**
 * plates.ts · WP4b. The one media module every page with a Plate loads (Plate.astro's <script>; deduped by Astro).
 *
 *   · placeholder reveal: a still with a drafting X gets data-state="ready" once decoded (the X fades over --dur-2;
 *     pixels already decoded never wait: a cached image is marked ready at once, with no fade)
 *   · hands every managed GIF/video plate to gif.ts / video.ts (plates hosted by a walkthrough are left to it)
 *   · the controls: Pause/Play, Restart, Mute, "Play · 0:48 · sound", Enlarge — one delegated click listener
 *   · Enlarged detail: [data-fig] plate buttons and the Enlarge control → openDetail (detail-open.ts: import('./detail')
 *     on first use — the viewer and panzoom are lazy — then open). `sv:fig-open` (the I key, the home Viewport's ⤢) is
 *     answered by detail-open.ts itself, which DetailViewer loads on every page
 *   · a plate inside a link or button (a home card) can't carry controls (no nested interactive elements), so it is
 *     marked data-still: its GIF shows the poster frame and its video the first frame — nothing loops that can't be
 *     paused (WCAG 2.2.2); the moving original lives, with its controls, on the case page
 *   · print: every managed source is attached first, so a printout shows frames, never voids
 */
import { $$, ready } from '../core/dom';
import { openDetail } from './detail-open';
import { registerShortcut } from '../core/keys';
import { manageGif, restartGif, toggleGif, isManagedGif, mountAllForPrint } from './gif';
import { manageVideo, restartVideo, toggleVideo, playWithSound, toggleMute, isManagedVideo, attachAllForPrint } from './video';
import { inInteractive, setState } from './state';

function revealStill(view: HTMLElement): void {
  const img = view.querySelector<HTMLImageElement>('img.plate__media');
  if (!img) return;
  const done = () => { view.dataset.state = 'ready'; };
  if (img.complete && img.naturalWidth) {
    // already decoded before this module ran: no fade (nothing may delay decoded pixels)
    view.style.setProperty('--dur-2', '0s');
    done();
    requestAnimationFrame(() => view.style.removeProperty('--dur-2'));
    return;
  }
  img.addEventListener('load', () => { (img.decode ? img.decode() : Promise.resolve()).catch(() => {}).then(done); }, { once: true });
}

function init(root: ParentNode = document): void {
  for (const plate of $$<HTMLElement>('[data-plate]', root)) {
    if (plate.dataset.wired) continue;
    plate.dataset.wired = '';
    if (inInteractive(plate)) {
      for (const c of plate.querySelectorAll('[data-mc], [data-mc-prog], [data-mc-sound], .plate__open')) c.remove();
      plate.dataset.still = '';
    }
    const kind = plate.dataset.kind;
    if (kind === 'image') {
      const view = plate.querySelector<HTMLElement>('[data-ph-host]');
      if (view?.querySelector('[data-ph]')) revealStill(view);
      continue;
    }
    if (plate.dataset.managed === 'host') continue; // a walkthrough drives this one
    const gif = plate.querySelector<HTMLImageElement>('img[data-gif]');
    if (gif) { manageGif(gif, plate); continue; }
    const vid = plate.querySelector<HTMLVideoElement>('video[data-vid]');
    if (vid) manageVideo(vid, plate);
  }
}

// ---------- the controls (one delegated listener) ----------
document.addEventListener('click', (e) => {
  const t = e.target instanceof Element ? e.target : null;
  if (!t) return;
  const btn = t.closest<HTMLElement>('[data-mc-toggle], [data-mc-restart], [data-mc-mute], [data-mc-sound], [data-mc-enlarge], [data-fig]');
  if (!btn) return;
  const plate = btn.closest<HTMLElement>('[data-plate]');
  // walkthrough stages handle their own controls (they are not a single plate)
  if (!plate || btn.closest('[data-walk-stage], [data-player]') && !btn.matches('[data-fig]')) return;
  if (btn.matches('[data-fig], [data-mc-enlarge]')) { openDetail(plate, btn); return; }
  if (btn.matches('[data-mc-sound]')) { playWithSound(plate); return; }
  if (btn.matches('[data-mc-mute]')) { toggleMute(plate); return; }
  const restart = btn.matches('[data-mc-restart]');
  if (isManagedGif(plate)) (restart ? restartGif : toggleGif)(plate);
  else if (isManagedVideo(plate)) (restart ? restartVideo : toggleVideo)(plate);
});

// ---------- Enlarged detail (lazy) ----------
// the opener and the page-wide `sv:fig-open` listener live in detail-open.ts, which DetailViewer loads on every page
// (the home Viewport's ⤢ has no <Plate> to bring this module along)
export { openDetail };

/**
 * I: the figure nearest the viewport centre (WP1 registers the same key through sv:fig-open; either path lands here).
 * Candidates are the visible Enlarge triggers: every plate's cover button, and a sticky walkthrough's stage button
 * (its stacked plates are hidden then; the stage opens the active step's figure).
 */
function nearestTrigger(): HTMLElement | null {
  const mid = innerHeight / 2;
  let best: { el: HTMLElement; d: number } | null = null;
  for (const b of $$<HTMLElement>('main :is([data-fig], [data-walk-stage] [data-mc-enlarge])')) {
    const r = b.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > innerHeight) continue;
    // a walkthrough stage's button is small: measure its stage instead
    const box = b.closest<HTMLElement>('[data-walk-stage]')?.getBoundingClientRect() ?? r;
    const d = Math.abs(box.top + box.height / 2 - mid);
    if (!best || d < best.d) best = { el: b, d };
  }
  return best?.el ?? null;
}
registerShortcut('i', ['case', 'about', 'play'], () => {
  const b = nearestTrigger();
  if (!b) return;
  if (b.closest('[data-walk-stage]')) { b.click(); return; } // walkthrough.ts opens the active step's own figure
  const plate = b.closest<HTMLElement>('[data-plate]');
  if (plate) openDetail(plate, plate.querySelector<HTMLElement>('[data-mc-enlarge]') ?? b);
});

// ---------- print: frames, never voids ----------
addEventListener('beforeprint', () => {
  // lazy stills that were never scrolled near would print as empty mats
  for (const img of $$<HTMLImageElement>(':is([data-plate], [data-compare]) img[loading="lazy"]')) img.loading = 'eager';
  mountAllForPrint();
  attachAllForPrint();
  for (const v of $$<HTMLElement>('[data-ph-host][data-state="idle"], [data-ph-host][data-state="parked"]')) v.dataset.state = 'ready';
});

ready(() => init());
export { init as initPlates, setState };
