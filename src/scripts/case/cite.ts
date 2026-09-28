/**
 * cite.ts · WP5. Landing on a place in a case (SPEC §4.9, SM4, SM5b).
 *
 *   land(el, {smooth?, at?})  scroll `el` to the top of the reading area — smooth only for a pointer with Motion on,
 *                             instant for keys (law 1) — and hold it there while content-visibility chapters render at
 *                             their real height (the target moves as the chapters above it are measured for real).
 *                             A smooth scroll is re-aimed while it runs, so it still ends exactly on target.
 *   In-page citation links — the Key plan's "Go ↓", the Decision schedule's LEVEL ↓, the title block's REV. △1 and
 *   the header's secondary CTA ([data-cite-link], [data-level-link]) — land, move focus (chapter → its h2; block → the
 *   block) and push the hash like a native jump. A cited BLOCK is bracketed (.is-cited, 4 s; WP1 draws the same
 *   bracket for Sheet-list citations). In Plan view a cited block that is omitted opens its run; one that is
 *   skimmed (her bold only) switches this visit to Section view (not persisted), so her whole sentence is there.
 */
import { focusNoScroll, motionOK } from '../core/dom';
import { get, set } from '../core/prefs';

const instant = 'instant' as ScrollBehavior;
const vh = () => window.innerHeight || document.documentElement.clientHeight;
const px = (v: string) => parseFloat(v) || 0;

/** Where `el` should come to rest: its top at the scroll padding (+ its own scroll-margin), or `at`·vh below it. */
function targetY(el: Element, at: number): number {
  const top = el.getBoundingClientRect().top;
  const pad = px(getComputedStyle(document.documentElement).scrollPaddingTop);
  const margin = px(getComputedStyle(el).scrollMarginTop);
  return Math.max(0, Math.round(window.scrollY + top - pad - margin - at * vh()));
}

let landing = 0;
/** Scroll `el` into place and keep it there until the page stops moving under it (or the reader takes over). */
export function land(el: Element, opts: { smooth?: boolean; at?: number } = {}): void {
  const at = opts.at ?? 0;
  const id = ++landing;
  let quit = false;
  const stop = () => { quit = true; };
  const inputs = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
  inputs.forEach((ev) => addEventListener(ev, stop, { once: true, passive: true, capture: true }));
  const done = () => inputs.forEach((ev) => removeEventListener(ev, stop, { capture: true }));
  let goal = targetY(el, at);
  let still = 0;
  let frames = 0;
  if (opts.smooth) window.scrollTo({ top: goal, behavior: 'smooth' });
  const tick = () => {
    if (quit || id !== landing) return done();
    const t = targetY(el, at);
    const off = Math.abs(window.scrollY - t);
    if (opts.smooth && frames < 90) {
      // still gliding: re-aim when the target moved (chapters rendering), settle once we are there
      if (Math.abs(t - goal) > 2) { goal = t; window.scrollTo({ top: t, behavior: 'smooth' }); still = 0; }
      else if (off <= 2) still++;
    } else if (off > 2) { window.scrollTo({ top: t, behavior: instant }); still = 0; }
    else still++;
    if (still < 4 && ++frames < 150) requestAnimationFrame(tick);
    else done();
  };
  if (!opts.smooth) window.scrollTo({ top: goal, behavior: instant });
  requestAnimationFrame(tick);
}

/** A chapter's h2 (her label) or the element itself. */
const focusTarget = (el: HTMLElement): HTMLElement =>
  (el.matches('section.chapter') ? document.getElementById(`${el.id}-h`) : null) ?? el;

let citeTimer = 0;
function bracket(el: HTMLElement): void {
  document.querySelectorAll('.is-cited').forEach((x) => x.classList.remove('is-cited'));
  el.classList.add('is-cited');
  window.clearTimeout(citeTimer);
  citeTimer = window.setTimeout(() => el.classList.remove('is-cited'), 4000);
}

/** Make a cited block readable in Plan view: open its omit run, or read this visit in Section view. */
function reveal(el: HTMLElement): void {
  if (get('view') !== 'plan') return;
  const run = el.closest<HTMLElement>('[data-omit-run]');
  if (run && !run.classList.contains('is-open')) {
    run.querySelector<HTMLButtonElement>(':scope > .breakline')?.click();
    return;
  }
  // skimmed (her bold only) or partly hidden (card/feature html): her whole sentence is only in Section view
  if (el.closest('[data-plan="skim"]') || el.querySelector('.skim, .plan-hide')) set('view', 'section', { persist: false });
}

/** Go to an in-page target the way a native jump would, but smooth for pointers and exact under content-visibility. */
export function goTo(el: HTMLElement, opts: { keyboard: boolean; cite?: boolean; hash?: string }): void {
  if (opts.cite) reveal(el);
  const isChapter = el.matches('section.chapter');
  land(el, { smooth: !opts.keyboard && motionOK(), at: isChapter ? 0 : 0.14 });
  focusNoScroll(focusTarget(el));
  if (opts.cite && !isChapter) bracket(el);
  if (opts.hash && location.hash !== opts.hash) history.pushState(null, '', opts.hash);
}

/** Wire every in-page citation link of the case (event delegation; works for links added later too). */
export function initCite(): void {
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest<HTMLAnchorElement>('main a[data-cite-link], main a[data-level-link]');
    if (!a) return;
    const href = a.getAttribute('href') ?? '';
    if (!href.startsWith('#') || href.length < 2) return;
    const el = document.getElementById(decodeURIComponent(href.slice(1)));
    if (!el) return;
    e.preventDefault();
    goTo(el, { keyboard: e.detail === 0, cite: a.hasAttribute('data-cite-link'), hash: href });
  });
}
