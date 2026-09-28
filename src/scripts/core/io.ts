/**
 * io.ts · P0. IntersectionObserver helpers with shared observers (one IO per option set).
 */
type Cb = (entry: IntersectionObserverEntry) => void;
const pools = new Map<string, { io: IntersectionObserver; cbs: Map<Element, Set<Cb>> }>();

function pool(opts: IntersectionObserverInit) {
  const key = JSON.stringify([opts.rootMargin ?? '0px', opts.threshold ?? 0, opts.root ? 'custom' : 'viewport']);
  let p = opts.root ? undefined : pools.get(key);
  if (!p) {
    const cbs = new Map<Element, Set<Cb>>();
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) cbs.get(en.target)?.forEach((cb) => cb(en));
    }, opts);
    p = { io, cbs };
    if (!opts.root) pools.set(key, p);
  }
  return p;
}

/** Observe `el`; `cb` gets every IntersectionObserverEntry. Returns an unobserve function. */
export function observe(el: Element, cb: Cb, opts: IntersectionObserverInit = {}): () => void {
  const p = pool(opts);
  let set = p.cbs.get(el);
  if (!set) { set = new Set(); p.cbs.set(el, set); p.io.observe(el); }
  set.add(cb);
  return () => {
    const s = p.cbs.get(el);
    if (!s) return;
    s.delete(cb);
    if (!s.size) { p.cbs.delete(el); p.io.unobserve(el); }
  };
}

/** Call `cb` once when at least `ratio` of `el` is visible (e.g. revision cloud ≥ 40%, section mark ≥ 30%). */
export function whenVisible(el: Element, cb: () => void, ratio = 0, rootMargin = '0px'): () => void {
  const off = observe(el, (en) => {
    if (en.isIntersecting && en.intersectionRatio >= ratio) { off(); cb(); }
  }, { threshold: ratio > 0 ? [ratio] : 0, rootMargin });
  return off;
}

/** Track visibility: cb(true/false) whenever `el` crosses `ratio`. */
export function onVisibility(el: Element, cb: (visible: boolean, en: IntersectionObserverEntry) => void, ratio = 0, rootMargin = '0px'): () => void {
  return observe(el, (en) => cb(en.isIntersecting && en.intersectionRatio >= ratio, en), { threshold: ratio > 0 ? [0, ratio] : 0, rootMargin });
}

/** Within `n` viewports of the viewport (media managers: mount within 1, park beyond 3). */
export const viewportMargin = (n: number): string => `${Math.round(n * 100)}% 0px ${Math.round(n * 100)}% 0px`;
