/**
 * sizes.ts · WP7. Every case chapter learns its real height once, in idle time after load.
 *
 * Chapters after the first skip rendering off-screen (content-visibility: auto, Chapter.astro) behind a 1400 px
 * placeholder, but three in four are taller (median ≈ 2.5k px at 390 and at 1440 px, up to 8.4k). Until a chapter has
 * rendered once, its content overflows that placeholder: the scrollbar understates the page, and whatever reads
 * geometry (assistive tech's bounding boxes, a target-size audit) finds the tail of one chapter lying over the head of
 * the next — the Figma button of /pff under FIG. 4.3's Enlarge control, for one.
 *
 * So, once the page is idle, each chapter that is still skipped renders for one frame — one chapter per idle period,
 * ≈ 1–40 ms of layout on a 4× throttled CPU, far below the fold so nothing paints — which is when the browser records
 * its `auto` remembered size; then it skips again. Afterwards every placeholder is the chapter's real height, exactly
 * as after a landing (cite.ts, which renders every chapter at once). A view switch changes the heights, so the chapters
 * learn again. Images stay lazy: a chapter far below the viewport is out of their loading distance.
 */
import { listen } from '../core/bus';
import { idle } from '../core/dom';

const frame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
/** a chapter whose contents the browser is skipping right now */
const skipped = (c: HTMLElement): boolean => {
  const kid = c.firstElementChild as (HTMLElement & { checkVisibility?: (o: object) => boolean }) | null;
  return !!kid?.checkVisibility && !kid.checkVisibility({ contentVisibilityAuto: true });
};

let run = 0;
function learn(): void {
  const id = ++run;
  const queue = Array.from(document.querySelectorAll<HTMLElement>('main section.chapter')).filter((c) => getComputedStyle(c).contentVisibility === 'auto');
  const next = async (): Promise<void> => {
    if (id !== run) return; // a newer pass (a view switch) took over
    const c = queue.shift();
    if (!c) return;
    if (skipped(c)) {
      c.style.contentVisibility = 'visible';
      await frame(); // rendered in this frame: its remembered size is recorded
      c.style.removeProperty('content-visibility');
    }
    idle(() => { void next(); }, 2000);
  };
  idle(() => { void next(); }, 2000);
}

export function initSizes(): void {
  if (!CSS.supports('content-visibility', 'auto')) return;
  if (document.readyState === 'complete') learn();
  else addEventListener('load', () => learn(), { once: true });
  listen('sv:view', () => learn());
}
