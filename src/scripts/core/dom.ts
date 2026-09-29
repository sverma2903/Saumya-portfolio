/**
 * dom.ts · P0. Tiny DOM helpers shared by every package's scripts.
 */
export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T | null => root.querySelector<T>(sel);
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T[] => Array.from(root.querySelectorAll<T>(sel));

/** addEventListener that returns its own remover. */
export function on<K extends keyof HTMLElementEventMap>(
  el: EventTarget, type: K | string, handler: (e: HTMLElementEventMap[K]) => void, opts?: AddEventListenerOptions,
): () => void {
  el.addEventListener(type, handler as EventListener, opts);
  return () => el.removeEventListener(type, handler as EventListener, opts);
}

/** Run once the DOM is parsed (module scripts are deferred, so this is usually immediate). */
export function ready(fn: () => void): void {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
  else fn();
}

/** Throttle a callback to one call per animation frame (passive scroll readers, pointer handlers). */
export function rafThrottle<A extends unknown[]>(fn: (...a: A) => void): (...a: A) => void {
  let raf = 0;
  let last: A;
  return (...a: A) => {
    last = a;
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; fn(...last); });
  };
}

/** Motion allowed? (html[data-motion] is authoritative; the head script already folded in the OS setting.) */
export const motionOK = (): boolean => document.documentElement.dataset.motion !== 'reduce';

/**
 * Save-Data (polish r1): the reader asked the browser to save data, or the link is 2g / slow-2g. Detected once by the
 * head script (html[data-save]); every media manager honours it: no GIF, video or warm-up downloads until an explicit
 * Play, no poster decodes, no WebGL hero. The drafting X with the file's facts stands in for each file.
 */
export const saveData = (): boolean => document.documentElement.hasAttribute('data-save');

/** Too slow for speculative downloads (the Highlights warm-up): Save-Data, or an effective type of 3g or slower. */
export const slowLink = (): boolean =>
  saveData() || /^(slow-2g|2g|3g)$/.test((navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType ?? '');

/**
 * Scroll an element into view. Pointer-initiated → smooth when motion is on; keyboard-initiated → always instant (§4.9).
 */
export function scrollToEl(el: Element, opts: { keyboard?: boolean; block?: ScrollLogicalPosition } = {}): void {
  const smooth = !opts.keyboard && motionOK();
  el.scrollIntoView({ behavior: smooth ? 'smooth' : ('instant' as ScrollBehavior), block: opts.block ?? 'start' });
}

/** Move focus without scrolling the page (e.g. after an instant jump). Adds tabindex=-1 when needed. */
export function focusNoScroll(el: HTMLElement): void {
  if (!el.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
}

/** requestIdleCallback with a timeout fallback (Safari). */
export function idle(fn: () => void, timeout = 800): void {
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  if (ric) ric(fn, { timeout });
  else setTimeout(fn, Math.min(timeout, 200));
}

/** Page kind from html[data-page] ('home' | 'case' | 'about' | 'play' | '404'). */
export const pageKind = (): string => document.documentElement.dataset.page ?? '';
