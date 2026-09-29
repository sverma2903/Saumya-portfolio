/**
 * vt.ts · WP1. SM3 "Cut to sheet" — the script half of the native cross-document View Transitions
 * (styles/transitions.css holds the choreography). Loaded on every page by core/boot.ts.
 *
 *  - pageswap (old document, always reached: it fires on the loaded page the reader is leaving): Motion off →
 *    skipTransition(), so reduced-motion readers never see a cut, whatever the new page does.
 *  - pagereveal (new document): Motion off → skip; else mark html[data-vt] + [data-vt-dir] for the transition's
 *    lifetime. This module is deferred and may run after `pagereveal` (it fires before the first render): that is
 *    fine, because transitions.css derives the direction from html[data-page] and shows the cut line through
 *    :active-view-transition. Nothing waits on the transition; the new page is interactive immediately.
 */
type WithVT = Event & { viewTransition?: ViewTransition | null };

const root = document.documentElement;
const motionOff = () => root.dataset.motion === 'reduce';
const KEY = 'sv:vt-plates';

/* Plates morph only when BOTH ends are on screen. A plate whose other end is below the fold would slide across the
   new page during the cut and leave the screen — a stray image, not a cut. So:
   · pageswap (old): an off-screen plate is un-named (it stays in the old page's snapshot); the names still on screen
     are handed to the new document through sessionStorage.
   · pagereveal (new, before its first render): a plate is kept only if it is on screen AND the old page had it on
     screen. An old plate left without a partner (its new end is off screen or absent) does not move: it is clipped by
     the same section cut as the old page around it (same curve, same duration, from its recorded rect), so it leaves
     with the old sheet instead of fading or sliding over the new one. */
const namedPlates = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[style*="view-transition-name: plate-"], [style*="view-transition-name:plate-"]'));
const onScreen = (el: Element) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
};
const plateName = (el: HTMLElement) => el.style.viewTransitionName;
// un-named plates get their names back once the transition is over (or when the old page returns from the bfcache),
// so the next navigation from this page can morph them again
const unnamed: [HTMLElement, string][] = [];
const unname = (el: HTMLElement) => { unnamed.push([el, el.style.viewTransitionName]); el.style.viewTransitionName = 'none'; };
const rename = () => { for (const [el, n] of unnamed.splice(0)) el.style.viewTransitionName = n; };
addEventListener('pageshow', rename);

/* ---------- the sheet number rolls when the cut line crosses it ---------- */
/** --ease-draft, cubic-bezier(.65,.05,.25,1): the time fraction at which the cut has covered `p` of the width. */
function draftTimeAt(p: number): number {
  const b = (a: number, c: number, s: number) => 3 * (1 - s) ** 2 * s * a + 3 * (1 - s) * s * s * c + s ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (b(0.05, 1, m) < p) lo = m; else hi = m; }
  return b(0.65, 0.25, (lo + hi) / 2);
}
/** The fraction of --dur-4 at which the line reaches the (rendered) sheet number's leading edge, or null. */
function sheetnoAt(back: boolean): number | null {
  const el = Array.from(document.querySelectorAll<HTMLElement>('.titlebar .sheetno, .bottombar__sheet'))
    .find((x) => getComputedStyle(x).viewTransitionName === 'sheetno' && x.getClientRects().length > 0);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const edge = (back ? innerWidth - r.right : r.left) / innerWidth;
  return draftTimeAt(Math.min(1, Math.max(0, edge)));
}

addEventListener('pageswap', (e) => {
  const vt = (e as WithVT).viewTransition;
  if (!vt) return;
  if (motionOff()) { vt.skipTransition(); return; }
  const kept: { n: string; l: number; w: number }[] = [];
  for (const el of namedPlates()) {
    if (onScreen(el)) { const r = el.getBoundingClientRect(); kept.push({ n: plateName(el), l: r.left, w: r.width }); }
    else unname(el);
  }
  try { sessionStorage.setItem(KEY, JSON.stringify(kept)); } catch { /* storage off: pagereveal keeps what is on screen */ }
});

addEventListener('pagereveal', (e) => {
  const vt = (e as WithVT).viewTransition;
  let old: { n: string; l: number; w: number }[] | null = null;
  try { old = JSON.parse(sessionStorage.getItem(KEY) ?? 'null'); sessionStorage.removeItem(KEY); } catch { old = null; }
  if (!Array.isArray(old)) old = null;
  if (!vt) return;
  if (motionOff()) { vt.skipTransition(); return; }
  const paired = new Set<string>();
  for (const el of namedPlates()) {
    const name = plateName(el);
    if (onScreen(el) && (!old || old.some((o) => o.n === name))) paired.add(name);
    else unname(el);
  }
  const back = root.dataset.page === 'home';
  const orphans = (old ?? []).filter((o) => /^plate-[\w-]+$/.test(o?.n) && Number.isFinite(o.l) && Number.isFinite(o.w) && !paired.has(o.n));
  let sheet: HTMLStyleElement | null = null;
  if (orphans.length) {
    // the cut's leading edge is at p·vw (forward: the new sheet shows left of it) or (1 − p)·vw (back: right of it);
    // in the plate's own box that edge is an inset that moves linearly, so these keyframes ride the same curve
    const vw = innerWidth;
    sheet = document.createElement('style');
    sheet.textContent = orphans.map((o, i) => {
      const k = `vt-orphan-${i}`;
      const [a, b] = back
        ? [`inset(0 ${o.l + o.w - vw}px 0 0)`, `inset(0 ${o.l + o.w}px 0 0)`]
        : [`inset(0 0 0 ${-o.l}px)`, `inset(0 0 0 ${vw - o.l}px)`];
      return `@keyframes ${k}{from{clip-path:${a}}to{clip-path:${b}}}` +
        `::view-transition-group(${o.n}){animation:none!important}` +
        `::view-transition-old(${o.n}){animation:${k} var(--dur-4) var(--ease-draft) both!important;opacity:1!important}`;
    }).join('');
    document.head.append(sheet);
  }
  root.dataset.vt = 'cut';
  root.dataset.vtDir = back ? 'back' : 'forward';
  const at = sheetnoAt(back);
  if (at != null) root.style.setProperty('--vt-sheetno-at', at.toFixed(3));
  const done = () => { delete root.dataset.vt; delete root.dataset.vtDir; root.style.removeProperty('--vt-sheetno-at'); sheet?.remove(); rename(); };
  vt.finished.then(done, done);
});

export {};
