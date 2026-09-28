/**
 * io.ts · P0. IntersectionObserver helpers with shared observers (one IO per option set).
 *
 * IntersectionObserver only queues an initial entry on `observe()`. Because a pooled element
 * is observed once, a later subscriber to an already-observed element is handed the element's
 * last delivered entry (its current state relative to the pool's thresholds) on a microtask.
 * If no entry has arrived yet, the pending initial entry reaches every subscriber anyway.
 */
type Cb = (entry: IntersectionObserverEntry) => void;
type Pool = { io: IntersectionObserver; cbs: Map<Element, Set<Cb>>; last: WeakMap<Element, IntersectionObserverEntry> };
const pools = new Map<string, Pool>();

function pool(opts: IntersectionObserverInit): Pool {
  const key = JSON.stringify([opts.rootMargin ?? '0px', opts.threshold ?? 0, opts.root ? 'custom' : 'viewport']);
  let p = opts.root ? undefined : pools.get(key);
  if (!p) {
    const cbs = new Map<Element, Set<Cb>>();
    const last = new WeakMap<Element, IntersectionObserverEntry>();
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        last.set(en.target, en);
        // Copy: a callback may unsubscribe itself (whenVisible) while we iterate.
        const set = cbs.get(en.target);
        if (set) for (const cb of [...set]) if (set.has(cb)) cb(en);
      }
    }, opts);
    p = { io, cbs, last };
    if (!opts.root) pools.set(key, p);
  }
  return p;
}

/**
 * Observe `el`; `cb` gets every IntersectionObserverEntry, starting with the element's current
 * state (also when another subscriber already observes `el` with the same options).
 * Returns an unobserve function.
 */
export function observe(el: Element, cb: Cb, opts: IntersectionObserverInit = {}): () => void {
  const p = pool(opts);
  let set = p.cbs.get(el);
  if (!set) {
    set = new Set();
    p.cbs.set(el, set);
    p.last.delete(el);
    p.io.observe(el);
  } else {
    const seen = p.last.get(el);
    if (seen) queueMicrotask(() => { if (p.cbs.get(el)?.has(cb)) cb(seen); });
  }
  set.add(cb);
  return () => {
    const s = p.cbs.get(el);
    if (!s) return;
    s.delete(cb);
    if (!s.size) { p.cbs.delete(el); p.last.delete(el); p.io.unobserve(el); }
  };
}

/** Call `cb` once when at least `ratio` of `el` is visible (e.g. revision cloud ≥ 40%, section mark ≥ 30%). */
export function whenVisible(el: Element, cb: () => void, ratio = 0, rootMargin = '0px'): () => void {
  let done = false;
  const off = observe(el, (en) => {
    if (!done && en.isIntersecting && en.intersectionRatio >= ratio) { done = true; off(); cb(); }
  }, { threshold: ratio > 0 ? [ratio] : 0, rootMargin });
  return off;
}

/** Track visibility: cb(true/false) whenever `el` crosses `ratio`. */
export function onVisibility(el: Element, cb: (visible: boolean, en: IntersectionObserverEntry) => void, ratio = 0, rootMargin = '0px'): () => void {
  return observe(el, (en) => cb(en.isIntersecting && en.intersectionRatio >= ratio, en), { threshold: ratio > 0 ? [0, ratio] : 0, rootMargin });
}

/** Within `n` viewports of the viewport (media managers: mount within 1, park beyond 3). */
export const viewportMargin = (n: number): string => `${Math.round(n * 100)}% 0px ${Math.round(n * 100)}% 0px`;
