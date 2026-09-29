/**
 * cite.ts · WP5. Landing on a place in a case (SPEC §4.9, SM4, SM5b).
 *
 *   land(el, {smooth?, at?})  scroll `el` to the top of the reading area — smooth only for a pointer with Motion on,
 *                             instant for keys (law 1). Every chapter renders while landing, so the target's real
 *                             position is known before the move; a smooth landing glides the last viewport only.
 *                             isLanding()/onLanded(): the Levels trace is not recorded while the page is being moved
 *                             for the reader — a skipped chapter's floor stays blank (SM4).
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
const root = document.documentElement;

/** Where `el` should come to rest: its top at the scroll padding (+ its own scroll-margin), or `at`·vh below it. */
function targetY(el: Element, at: number): number {
  const top = el.getBoundingClientRect().top;
  const pad = px(getComputedStyle(root).scrollPaddingTop);
  const margin = px(getComputedStyle(el).scrollMarginTop);
  return Math.max(0, Math.round(window.scrollY + top - pad - margin - at * vh()));
}

let landing = 0;
let busy = false;
const landed: Array<() => void> = [];
/** True while a landing is under way: the page is being moved for the reader, not read (levels.ts records no trace). */
export const isLanding = (): boolean => busy;
/** Run `fn` each time a landing comes to rest (or the reader takes over). */
export const onLanded = (fn: () => void): void => { landed.push(fn); };

/** Scroll `el` into place and keep it there until the page stops moving under it (or the reader takes over).
 *  The target's real position is resolved first: while landing, every chapter renders (html[data-landing] lifts
 *  content-visibility, Chapter.astro), so the chapters in between have their true height and their remembered size
 *  afterwards. A smooth landing then glides at most one viewport (a longer distance is cut to that, instantly), so
 *  it is short and never ends in a correction. */
export function land(el: Element, opts: { smooth?: boolean; at?: number } = {}): void {
  const at = opts.at ?? 0;
  const id = ++landing;
  busy = true;
  root.dataset.landing = '';
  let quit = false;
  const stop = () => { quit = true; };
  const inputs = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
  inputs.forEach((ev) => addEventListener(ev, stop, { once: true, passive: true, capture: true }));
  const done = () => {
    inputs.forEach((ev) => removeEventListener(ev, stop, { capture: true }));
    if (id !== landing) return; // a newer landing owns the page now
    busy = false;
    delete root.dataset.landing;
    landed.forEach((fn) => fn());
  };
  let goal = targetY(el, at);
  let still = 0;
  let frames = 0;
  if (opts.smooth) {
    const h = vh();
    const from = window.scrollY;
    if (Math.abs(goal - from) > h) window.scrollTo({ top: goal - Math.sign(goal - from) * h, behavior: instant });
    window.scrollTo({ top: goal, behavior: 'smooth' });
  } else window.scrollTo({ top: goal, behavior: instant });
  const tick = () => {
    if (quit || id !== landing) return done();
    const t = targetY(el, at);
    const off = Math.abs(window.scrollY - t);
    if (opts.smooth && frames < 60) {
      // still gliding: re-aim only if the target moved under us (a late image), settle once we are there
      if (Math.abs(t - goal) > 2) { goal = t; window.scrollTo({ top: t, behavior: 'smooth' }); still = 0; }
      else if (off <= 2) still++;
    } else if (off > 2) { window.scrollTo({ top: t, behavior: instant }); still = 0; }
    else still++;
    if (still < 4 && ++frames < 120) requestAnimationFrame(tick);
    else done();
  };
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
