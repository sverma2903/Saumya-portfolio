/**
 * shortcuts.ts · WP1 — the keys implementation (SPEC §4.11) on top of the P0 API in keys.ts.
 *
 *   J / K   Home (index in view): next / previous index row  ·  Case: next / previous level (focus → chapter h2)
 *   V       Case: Section ↔ Plan view, reading position anchored in the same frame
 *   U       Case (compare in view): Cut ↔ Loupe
 *   I       Case, About, Play: enlarge the figure nearest the viewport centre (sv:fig-open → WP4b)
 *   ⌘K / Ctrl K, /, ?   the Sheet list (registered by palette/open.ts)
 *   Esc     dialogs and the drawer close themselves (native `cancel`)
 *
 * Law 1: nothing here animates (instant scrolls, attribute flips). keys.ts already ignores keys while typing, inside
 * dialogs they don't belong to, and single keys when html[data-keys="off"].
 *
 * These handlers work from DOM contracts only (ids from lib/ids.ts, #index rows, [data-compare], [data-fig]), so
 * every §4.11 key works whatever the owning package ships. They are registered from the title bar's script, which runs
 * before any <main> component script: keys.ts runs the LAST matching registration, so a package that registers the
 * same key for the same scope (WP3 J/K, WP5 J/K/V, WP4b U/I) takes over without a conflict.
 */
import { registerShortcut } from './keys';
import { emit } from './bus';
import { get, set } from './prefs';
import { focusNoScroll } from './dom';

const READ_LINE = 0.4; // the reading line (SM4): 40% of the viewport height

const instant = 'instant' as ScrollBehavior;
const vh = () => window.innerHeight || document.documentElement.clientHeight;
const visible = (el: Element) => (el as HTMLElement).offsetParent !== null || el.getClientRects().length > 0;

/** Level ids of this case, in order (the title bar carries them: data-levels="overview empathize …"). */
function levelIds(): string[] {
  const raw = document.querySelector<HTMLElement>('[data-levels]')?.dataset.levels ?? '';
  const ids = raw.split(/\s+/).filter(Boolean);
  if (ids.length) return ids;
  return Array.from(document.querySelectorAll<HTMLElement>('main section[id].chapter')).map((s) => s.id);
}

/** Index of the level the reading line is in (−1 above the first chapter). */
function currentLevel(ids: string[]): number {
  const line = vh() * READ_LINE;
  let cur = -1;
  ids.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el && el.getBoundingClientRect().top <= line + 1) cur = i;
  });
  return cur;
}

export function jumpLevel(dir: 1 | -1): void {
  const ids = levelIds();
  if (!ids.length) return;
  const cur = currentLevel(ids);
  // J from the header lands on the first level; J on the last level re-aligns it; K above the first level does nothing
  const next = dir === 1 ? Math.min(cur + 1, ids.length - 1) : cur - 1;
  if (next < 0) return;
  goLevel(ids[next]);
}

export function goLevel(id: string): void {
  const sec = document.getElementById(id);
  if (!sec) return;
  const h = document.getElementById(`${id}-h`) ?? sec.querySelector<HTMLElement>('h2') ?? sec;
  landOn(sec, { block: 'start' });
  focusNoScroll(h as HTMLElement);
}

/**
 * Bring `el` (or a rect inside it) into view and keep it there while the page settles. Chapters use
 * `content-visibility: auto` with a 1400px placeholder size, so after a long jump the chapters that come into view
 * render at their real height and the target moves; this re-aims (instantly, over a few frames) until it is stable.
 * Pointer + Motion on → one smooth scroll first, then the same settling from where it ends (SPEC §4.9).
 */
export function landOn(el: Element, opts: { block?: 'start' | 'center'; smooth?: boolean; rect?: () => DOMRect } = {}): void {
  const block = opts.block ?? 'start';
  const rect = opts.rect ?? (() => el.getBoundingClientRect());
  const pad = () => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const target = () => {
    const r = rect();
    const y = block === 'start' ? r.top - pad() : r.top - (vh() - Math.min(r.height, vh() * 0.7)) / 2;
    return Math.max(0, window.scrollY + y);
  };
  // re-aim every frame until the target has held still for 4 frames (≤ 48 frames), and let go the moment the
  // reader takes over (wheel, touch, key, pointer)
  let frames = 0;
  let still = 0;
  let quit = false;
  const stop = () => { quit = true; };
  const inputs = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
  const settle = () => {
    inputs.forEach((ev) => addEventListener(ev, stop, { once: true, passive: true, capture: true }));
    const tick = () => {
      if (quit) return;
      const t = target();
      if (Math.abs(window.scrollY - t) > 2) { window.scrollTo({ top: t, behavior: instant }); still = 0; }
      else still++;
      if (still < 4 && ++frames < 48) requestAnimationFrame(tick);
      else inputs.forEach((ev) => removeEventListener(ev, stop, { capture: true }));
    };
    tick();
  };
  if (opts.smooth) {
    window.scrollTo({ top: target(), behavior: 'smooth' });
    let done = false;
    const end = () => { if (done) return; done = true; settle(); };
    addEventListener('scrollend', end, { once: true });
    window.setTimeout(end, 1600);
  } else {
    settle();
  }
}

/** Home: J/K through the Drawing index rows, only while the index is in view. */
function indexRows(): HTMLAnchorElement[] {
  return Array.from(document.querySelectorAll<HTMLAnchorElement>('#index li > a[href]')).filter(visible);
}
function jumpRow(dir: 1 | -1): boolean {
  const index = document.getElementById('index');
  if (!index) return false;
  const r = index.getBoundingClientRect();
  if (r.bottom < 0 || r.top > vh()) return false; // "with the index in view"
  const rows = indexRows();
  if (!rows.length) return false;
  const at = rows.indexOf(document.activeElement as HTMLAnchorElement);
  let i: number;
  if (at >= 0) i = Math.max(0, Math.min(rows.length - 1, at + dir));
  else {
    // no row focused: start from the first row at or below the top of the viewport
    const top = rows.findIndex((a) => a.getBoundingClientRect().top >= 0);
    i = dir === 1 ? Math.max(0, top) : Math.max(0, (top < 0 ? rows.length : top) - 1);
  }
  const a = rows[i];
  a.focus({ preventScroll: true });
  a.scrollIntoView({ behavior: instant, block: 'nearest' });
  return true;
}

// ───────────────────────── Plan ↔ Section, anchored (SM5c) ─────────────────────────

/** The first block visible at/after the reading line and its offset from it. */
function anchorBlock(): { el: Element; off: number } | null {
  const line = vh() * READ_LINE;
  const blocks = document.querySelectorAll('main .blk, main .section-mark, main [data-omit-run]');
  let best: { el: Element; off: number } | null = null;
  for (const el of blocks) {
    const r = el.getBoundingClientRect();
    if (!r.height) continue; // hidden in the current view
    if (r.bottom > line) { best = { el, off: r.top - line }; break; }
  }
  return best;
}

/** Toggle (or set) the view keeping the block under the reading line where it is. No animation. */
export function setViewAnchored(view?: 'section' | 'plan'): void {
  const next = view ?? (get('view') === 'plan' ? 'section' : 'plan');
  if (next === get('view')) return;
  const a = anchorBlock();
  set('view', next);
  if (!a) return;
  let el: Element | null = a.el;
  // the anchor may have been hidden by the switch (an omitted block): climb to its omit run, else keep going down
  if (!el.getBoundingClientRect().height) el = el.closest('[data-omit-run]') ?? a.el.nextElementSibling;
  if (!el) return;
  const r = el.getBoundingClientRect();
  const line = vh() * READ_LINE;
  window.scrollBy({ top: r.top - line - a.off, behavior: instant });
}

// ───────────────────────── U (compare) and I (figure) ─────────────────────────

function inView(el: Element, min = 0.2): boolean {
  const r = el.getBoundingClientRect();
  const h = Math.min(r.bottom, vh()) - Math.max(r.top, 0);
  return h > 0 && h >= Math.min(r.height, vh()) * min;
}

function toggleCompare(): void {
  const cmp = Array.from(document.querySelectorAll('[data-compare]')).find((c) => inView(c));
  const btn = cmp?.querySelector<HTMLButtonElement>('.compare__mode, [data-compare-mode]');
  btn?.click();
}

function enlargeNearest(): void {
  const mid = vh() / 2;
  let best: { el: Element; d: number } | null = null;
  for (const b of document.querySelectorAll('main [data-fig]')) {
    if (!visible(b)) continue;
    const r = b.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh()) continue;
    const d = Math.abs(r.top + r.height / 2 - mid);
    if (!best || d < best.d) best = { el: b, d };
  }
  if (!best) return;
  const plate = best.el.closest('[data-plate]') ?? best.el;
  emit('sv:fig-open', { el: plate });
}

let installed = false;
/** Register every page-level shortcut of §4.11 (idempotent). */
export function installShortcuts(): void {
  if (installed) return;
  installed = true;
  registerShortcut('j', 'home', () => { jumpRow(1); });
  registerShortcut('k', 'home', () => { jumpRow(-1); });
  registerShortcut('j', 'case', () => jumpLevel(1));
  registerShortcut('k', 'case', () => jumpLevel(-1));
  registerShortcut('v', 'case', () => setViewAnchored());
  registerShortcut('u', 'case', toggleCompare);
  registerShortcut('i', ['case', 'about', 'play'], enlargeNearest);
}
