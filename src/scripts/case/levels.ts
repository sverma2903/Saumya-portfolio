/**
 * levels.ts · WP5. The reading instrument (SPEC SM4): where the reader is in the building section.
 *
 *   reading line   40% of the viewport height
 *   level i        the last chapter whose top has passed the line (−1 above the first: the header, Key plan, schedule)
 *   p_i            clamp((line − top_i) / height_i, 0, 1)  — measured on the current and the next chapter only
 *   datum ▼        y = y_i + p_i·h_i on the rail (a transform; floors are laid out by CSS, cached here)
 *   trace          trace_i = max(trace_i, p_i) while reading (not while flinging past at > 3 viewports/s, nor while a
 *                  citation / J / K landing moves the page — cite.ts isLanding(); a skipped floor stays blank), shown as a
 *                  --hatch-acc strip; sessionStorage['sv:trace:<slug>'] (array of 0–1 per level; WP1's drawer reads it)
 *   current level  rust label + aria-current="location" (rail) and sv:level {index, label, elev} → WP1's running
 *                  head, bottom-bar pill and drawer; the Key plan hatches the level you are in — and keeps the last
 *                  one marked when you scroll back up to it (where you left off)
 *   J / K          next / previous level: an instant jump, focus on the chapter's h2 (law 1: keys never animate)
 *   section marks  draft across once at ≥ 30% visibility; a fast scroll completes them instantly
 *   Key plan       a stop and its strip segment light together (pointer hover; keyboard focus, instantly); a
 *                  segment is a pointer shortcut to its level (the stops' Go ↓ links are the accessible control)
 * One passive scroll listener, throttled to rAF; every layout read happens inside that frame (the rail is re-measured
 * there after a resize), reads first, writes after; nothing runs while the page is still.
 */
import { emit } from '../core/bus';
import { registerShortcut } from '../core/keys';
import { goTo, isLanding, onLanded } from './cite';

const READ = 0.4;
const FAST = 3; // viewports per second

const root = document.documentElement;
const chapters = Array.from(document.querySelectorAll<HTMLElement>('main section.chapter[id]'));
const n = chapters.length;
const rail = document.querySelector<HTMLElement>('[data-levels-rail]');
const slug = rail?.dataset.slug ?? document.querySelector<HTMLElement>('article[data-case]')?.dataset.case ?? '';
const floors = Array.from(document.querySelectorAll<HTMLElement>('[data-levels-rail] [data-floor]'));
const railLinks = floors.map((f) => f.querySelector<HTMLAnchorElement>('[data-level-link]'));
const datum = rail?.querySelector<HTMLElement>('[data-datum]') ?? null;
const segs = Array.from(document.querySelectorAll<HTMLElement>('[data-kp-seg]'));
const stops = Array.from(document.querySelectorAll<HTMLElement>('[data-kp-stop]'));
const marks = Array.from(document.querySelectorAll<HTMLElement>('[data-smark]'));
const railMatch = document.querySelector<HTMLElement>('[data-rail-match]');
// px: the datum is "at" a floor line, whose tick then stands in for the datum's own level line. The ▼ hangs ABOVE its
// level (tip on y), so just below a floor line (every J/K or Go ↓ landing rests there) the ▼ would sit on that floor's
// tick with its own rule a triangle's height under it (a doubled line): that band is the triangle's height plus a
// margin (AT_BELOW); just above the next floor line the two rules would touch (AT_ABOVE).
const AT_BELOW = 20;
const AT_ABOVE = 8;
const KEY = `sv:trace:${slug}`;

// ── state ──
let cur = -2; // −1 = above the building
let last = -1; // the last level the reader was in (the Key plan keeps it marked when they scroll back up to it)
let lastY = window.scrollY;
let lastT = performance.now();
let fast = false;
const trace: number[] = (() => {
  try {
    const t = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
    if (Array.isArray(t)) return chapters.map((_, i) => Math.min(1, Math.max(0, Number(t[i]) || 0)));
  } catch { /* storage blocked */ }
  return chapters.map(() => 0);
})();

// ── rail geometry (floors are laid out by CSS flexbox; cached, re-measured in the next frame after a resize) ──
let floorTop: number[] = [];
let floorH: number[] = [];
let stale = true;
function measureFloors(): void {
  floorTop = floors.map((f) => f.offsetTop);
  floorH = floors.map((f) => f.offsetHeight);
  stale = false;
}

let saveTimer = 0;
function save(): void {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try { sessionStorage.setItem(KEY, JSON.stringify(trace.map((t) => Math.round(t * 1000) / 1000))); } catch { /* ignore */ }
  }, 300);
}

function paintTrace(i: number): void {
  floors[i]?.style.setProperty('--t', trace[i].toFixed(3));
}

function setCurrent(i: number): void {
  if (i === cur) return;
  const prev = cur;
  cur = i;
  floors.forEach((f, k) => f.classList.toggle('is-current', k === i));
  railLinks.forEach((a, k) => { if (!a) return; if (k === i) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
  if (i >= 0) last = i;
  segs.forEach((s, k) => s.classList.toggle('is-current', k === last));
  stops.forEach((s, k) => s.classList.toggle('is-current', k === last));
  // reading straight on from one level into the next finishes the one behind (never while a landing moves the page)
  if (!fast && !isLanding() && prev >= 0 && i === prev + 1 && trace[prev] < 1) { trace[prev] = 1; paintTrace(prev); save(); }
  const link = i >= 0 ? railLinks[i] : null;
  const label = i >= 0 ? (link?.querySelector('.floor__label')?.textContent ?? chapters[i].querySelector('h2')?.textContent ?? '') : '';
  emit('sv:level', { index: i, label: label.trim(), elev: i >= 0 ? (link?.dataset.elev ?? '') : '' });
}

/** One reading frame: where is the line, how far through the current level, and draw it. */
function frame(): void {
  raf = 0;
  if (!n) return;
  const now = performance.now();
  const y = window.scrollY;
  const h = window.innerHeight || root.clientHeight;
  const dt = Math.max(1, now - lastT);
  const speed = (Math.abs(y - lastY) / h) * (1000 / dt);
  fast = speed > FAST;
  lastY = y; lastT = now;
  if (stale) measureFloors();
  const line = h * READ;
  let i = Math.max(0, Math.min(n - 1, cur));
  let r = chapters[i].getBoundingClientRect();
  while (i > 0 && r.top > line) r = chapters[--i].getBoundingClientRect();
  while (i < n - 1) {
    const rn = chapters[i + 1].getBoundingClientRect();
    if (rn.top > line) break;
    i++; r = rn;
  }
  const above = i === 0 && r.top > line;
  const p = above ? 0 : Math.min(1, Math.max(0, (line - r.top) / Math.max(1, r.height)));

  // writes
  // a fling completes any section mark that is still drafting
  if (fast) marks.forEach((m) => { if (m.classList.contains('is-drawn')) m.classList.add('is-instant'); });
  setCurrent(above ? -1 : i);
  if (!above && !fast && !isLanding() && p > trace[i] + 0.002) { trace[i] = p; paintTrace(i); save(); }
  if (datum && floorH.length) {
    const yy = floorTop[i] + (above ? 0 : p * floorH[i]);
    datum.style.setProperty('--_y', `${yy.toFixed(1)}px`);
    const below = yy - floorTop[i];
    const onFloor = (below > -AT_ABOVE && below < AT_BELOW) || Math.abs(floorTop[i] + floorH[i] - yy) < AT_ABOVE;
    if (onFloor !== datum.classList.contains('is-at-floor')) datum.classList.toggle('is-at-floor', onFloor);
  }
}
let raf = 0;
const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
// when scrolling comes to rest the reader is reading: one trailing frame records where (speed 0 → not a fling)
let restT = 0;
const onScroll = () => { kick(); window.clearTimeout(restT); restT = window.setTimeout(kick, 160); };

// ── section marks: draft across once at ≥ 30% visibility (fast scroll → complete instantly) ──
function initMarks(): void {
  const h = window.innerHeight || root.clientHeight;
  // marks already on screen when the script starts are drawn as they are (no hide-then-draw flash)
  chapters.forEach((c, k) => {
    const r = c.getBoundingClientRect();
    if (r.top < h && r.bottom > 0) marks[k]?.classList.add('is-drawn', 'is-instant');
  });
  root.dataset.case = 'live';
  if (!('IntersectionObserver' in window)) { marks.forEach((m) => m.classList.add('is-drawn')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting || en.intersectionRatio < 0.3) continue;
      const m = en.target as HTMLElement;
      if (fast) m.classList.add('is-instant');
      m.classList.add('is-drawn');
      io.unobserve(m);
    }
  }, { threshold: [0.3] });
  marks.forEach((m) => { if (!m.classList.contains('is-drawn')) io.observe(m); });
}

// ── Match line: the rail's hands over to the sheet's own once that comes on screen (never two at once) ──
function initHandover(): void {
  const ml = document.querySelector<HTMLElement>('[data-matchline]');
  if (!ml || !railMatch || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(([en]) => {
    // on screen, or already scrolled past (above the viewport)
    railMatch.classList.toggle('is-handed', en.isIntersecting || en.boundingClientRect.top < 0);
  }).observe(ml);
}

// ── Key plan: pair each stop with its strip segment ──
function initKeyplan(): void {
  const kp = document.querySelector<HTMLElement>('[data-keyplan]');
  if (!kp || !segs.length) return;
  const which = (t: EventTarget | null): number => {
    const x = t instanceof Element ? t.closest<HTMLElement>('[data-kp-stop], [data-kp-seg]') : null;
    return x ? Number(x.dataset.kpStop ?? x.dataset.kpSeg) : -1;
  };
  // exactly one stop is lit besides the rust "current" one: the last thing the reader did wins (moving the pointer onto
  // a stop takes over from keyboard focus, and focusing a Go ↓ takes over from the pointer)
  const light = (i: number, cls: 'is-hover' | 'is-focus'): void => {
    const other = cls === 'is-hover' ? 'is-focus' : 'is-hover';
    for (const list of [segs, stops]) list.forEach((s, k) => {
      s.classList.toggle(cls, k === i);
      if (i >= 0) s.classList.remove(other);
    });
  };
  let hover = -1;
  kp.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'touch') return; // no sticky hover on touch
    const i = which(e.target);
    if (i !== hover) light((hover = i), 'is-hover');
  });
  kp.addEventListener('pointerleave', () => light((hover = -1), 'is-hover'));
  kp.addEventListener('focusin', (e) => { hover = -1; light(which(e.target), 'is-focus'); });
  kp.addEventListener('focusout', () => light(-1, 'is-focus'));
  kp.addEventListener('click', (e) => {
    const seg = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-kp-seg]') : null;
    const ch = seg ? chapters[Number(seg.dataset.kpSeg)] : null;
    if (ch) goTo(ch, { keyboard: false, hash: `#${ch.id}` });
  });
}

// ── J / K ──
function jump(dir: 1 | -1): void {
  frame(); // fresh position
  const next = dir === 1 ? Math.min(cur + 1, n - 1) : cur - 1;
  if (next < 0 || !chapters[next]) return;
  goTo(chapters[next], { keyboard: true, hash: `#${chapters[next].id}` });
}

export function initLevels(): void {
  if (!n) return;
  initMarks();
  initKeyplan();
  initHandover();
  floors.forEach((_, i) => paintTrace(i));
  datum?.classList.add('is-live');
  frame();
  addEventListener('scroll', onScroll, { passive: true });
  // a landing has come to rest: from here the reader is reading (one frame at rest, speed 0)
  onLanded(() => { lastY = window.scrollY; lastT = performance.now(); kick(); });
  const remeasure = () => { stale = true; kick(); };
  addEventListener('resize', remeasure, { passive: true });
  if (rail && 'ResizeObserver' in window) new ResizeObserver(remeasure).observe(rail);
  addEventListener('pagehide', () => {
    window.clearTimeout(saveTimer);
    try { sessionStorage.setItem(KEY, JSON.stringify(trace.map((t) => Math.round(t * 1000) / 1000))); } catch { /* ignore */ }
  });
  registerShortcut('j', 'case', () => jump(1));
  registerShortcut('k', 'case', () => jump(-1));
}
