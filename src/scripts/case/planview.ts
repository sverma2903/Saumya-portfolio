/**
 * planview.ts · WP5. Section · full text ↔ Plan · bold only (SPEC SM5c). ≤ 2 KB gz.
 *
 *   - Every View toggle on the page (header, Levels rail, WP1's drawer) is a radiogroup: click, ← → ↑ ↓ (move and
 *     select), roving tabindex; `V` flips the view. The drawn state follows html[data-view] (CSS), aria-checked is
 *     synced here.
 *   - Switching is an attribute flip through core/prefs (persisted as sv:view; ?view=section wins for one load, head
 *     script) with the reading position anchored in the same frame: the block under the 40% reading line keeps its
 *     offset from the line. No animation. A switch made elsewhere (the Sheet list's "Plan view") is anchored too, from
 *     the position recorded when scrolling last came to rest.
 *   - Omit runs: the break line's Show / Hide opens or closes that run only (aria-expanded).
 */
import { listen } from '../core/bus';
import { announce } from '../core/copy';
import { focusNoScroll } from '../core/dom';
import { registerShortcut } from '../core/keys';
import { get, set } from '../core/prefs';

type View = 'section' | 'plan';
const READ = 0.4;
const vh = () => window.innerHeight || document.documentElement.clientHeight;
const radios = () => Array.from(document.querySelectorAll<HTMLElement>('[data-view-value]'));

function sync(): void {
  const v = get('view');
  radios().forEach((b) => {
    const on = b.dataset.viewValue === v;
    b.setAttribute('aria-checked', String(on));
    b.tabIndex = on ? 0 : -1;
  });
}

// ── the reading anchor ──
interface Anchor { el: Element; off: number }
/** The first block (section mark, block, run, or a block inside an open run) reaching below the reading line. */
function anchor(): Anchor | null {
  const line = vh() * READ;
  const chapters = Array.from(document.querySelectorAll<HTMLElement>('main section.chapter'));
  const ch = chapters.filter((c) => c.getBoundingClientRect().top <= line).pop() ?? chapters[0];
  if (!ch) return null;
  const cands = ch.querySelectorAll(':scope > .section-mark, :scope > .blk, :scope > [data-omit-run] > .breakline, :scope > [data-omit-run] > .omit-run__body > .blk');
  for (const el of cands) {
    const r = el.getBoundingClientRect();
    if (!r.height && !r.width) continue; // hidden in this view
    if (r.bottom > line) return { el, off: r.top - line };
  }
  return null;
}
function restore(a: Anchor | null): void {
  if (!a) return;
  let el: Element | null = a.el;
  let off = a.off;
  const hidden = (x: Element) => { const r = x.getBoundingClientRect(); return !r.height && !r.width; };
  if (hidden(el)) {
    // hidden by the switch: its omit run's break line (Plan), else the run's first block (Section)
    const run = el.closest('[data-omit-run]');
    el = run ? (run.querySelector(':scope > .breakline') as Element | null) : null;
    if (!el || hidden(el)) el = run?.querySelector(':scope > .omit-run__body > .blk') ?? run;
    off = Math.min(off, 0);
    if (!el || hidden(el)) return;
  }
  const d = el.getBoundingClientRect().top - vh() * READ - off;
  if (Math.abs(d) > 1) window.scrollBy({ top: d, behavior: 'instant' as ScrollBehavior });
}

// ── keeping focus (a11y r1): Skim hides most of the page; what held focus may be among it ──
let held: HTMLElement | null = null; // the last element that held focus in the page (the Sheet list returns it on close)
const gone = (el: Element) => !el.isConnected || !el.getClientRects().length;
/**
 * If the switch hid the focused element (an Enlarge button, a link in a paragraph Skim drops), hand focus to what
 * now stands for it: its omit run's Show button, else its chapter's heading — never to <body>.
 */
let standIn: { from: HTMLElement; to: HTMLElement } | null = null; // V, V: focus goes back where it was
function rescue(el: HTMLElement | null): void {
  if (!el) return;
  if (standIn && el === standIn.to && document.activeElement === el && !gone(standIn.from)) {
    standIn.from.focus({ preventScroll: true });
    standIn = null;
    return;
  }
  if (!gone(el)) return;
  const f = document.activeElement;
  if (f && f !== document.body && f !== el && !gone(f)) return; // focus has already moved on (the Sheet list)
  const run = el.closest('[data-omit-run]');
  const brk = run?.querySelector<HTMLElement>(':scope > .breakline');
  const to = brk && !gone(brk) ? brk : el.closest('section.chapter')?.querySelector<HTMLElement>('h2');
  if (!to || gone(to)) return;
  if (to === brk) to.focus({ preventScroll: true }); else focusNoScroll(to);
  standIn = { from: el, to };
}
/** What changed, said politely: the checked toggle's own words ("Skim · bold only" / "Full story"). */
function say(): void {
  const on = radios().find((b) => b.getAttribute('aria-checked') === 'true');
  const t = (on?.querySelector('.viewtoggle__label') ?? on)?.textContent?.replace(/\s+/g, ' ').trim();
  if (t) announce(t);
}

let mine = false;
let rest: Anchor | null = null;
/** Set the view, keeping the reader's place (and focus). */
export function setView(v: View, opts: { persist?: boolean } = {}): void {
  if (get('view') === v) return;
  const a = anchor();
  const f = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  mine = true;
  set('view', v, opts);
  mine = false;
  restore(a);
  rescue(f);
  rest = null;
}

function onKey(e: KeyboardEvent): void {
  const b = (e.target as Element | null)?.closest<HTMLElement>('[data-view-value]');
  if (!b) return;
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
  e.preventDefault();
  const group = b.closest('[data-viewtoggle]');
  const opts = group ? Array.from(group.querySelectorAll<HTMLElement>('[data-view-value]')) : [b];
  const i = opts.indexOf(b);
  const next = opts[(i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? opts.length - 1 : 1)) % opts.length];
  setView(next.dataset.viewValue === 'plan' ? 'plan' : 'section');
  next.focus();
}

function toggleRun(b: HTMLButtonElement): void {
  const run = b.closest('[data-omit-run]');
  if (!run) return;
  const open = !run.classList.contains('is-open');
  run.classList.toggle('is-open', open);
  b.setAttribute('aria-expanded', String(open));
  const act = b.querySelector('.breakline__act');
  if (act) act.textContent = (open ? b.dataset.hide : b.dataset.show) ?? '';
}

export function initPlanview(): void {
  sync();
  document.addEventListener('click', (e) => {
    const t = e.target as Element | null;
    const radio = t?.closest<HTMLElement>('[data-view-value]');
    if (radio) { setView(radio.dataset.viewValue === 'plan' ? 'plan' : 'section'); return; }
    const brk = t?.closest<HTMLButtonElement>('[data-omit-run] > .breakline');
    if (brk) toggleRun(brk);
  });
  document.addEventListener('keydown', onKey);
  document.addEventListener('focusin', (e) => {
    const t = e.target as HTMLElement;
    if (!t.closest('dialog')) held = t;
  });
  listen('sv:view', () => {
    sync();
    if (!mine) {
      restore(rest); rest = anchor();
      say();
      // a switch made from the Sheet list: it gives focus back as it closes, possibly to what just hid
      const h = held;
      requestAnimationFrame(() => rescue(h));
    }
  });
  // remember where the reader rests, for a switch made by someone else (Sheet list action); measured in a frame
  let idle = 0;
  const note = () => requestAnimationFrame(() => { rest = anchor(); });
  addEventListener('scroll', () => { window.clearTimeout(idle); rest = null; idle = window.setTimeout(note, 160); }, { passive: true });
  note();
  registerShortcut('v', 'case', () => { setView(get('view') === 'plan' ? 'section' : 'plan'); say(); });
}
