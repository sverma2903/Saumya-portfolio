/**
 * palette/open.ts · WP1. Always loaded (≈ 1 KB): opens the Sheet list (SPEC §4.4) from ⌘K / Ctrl K, `/`, `?`
 * (filtered to Keys), the title-bar button and the drawer's search field, and lazy-loads the UI + search module
 * (palette.ts) on intent (pointer/focus on the button, a held ⌘/Ctrl) or on first open.
 * The dialog's frame and its empty state are server-rendered (Palette.astro), so it opens complete and instantly.
 * ⌘K always works, including with single-key shortcuts off and inside the other dialogs (it hands over to the list).
 *
 * It also finishes a cross-page citation: a passage chosen on another sheet lands here as
 * /<slug>?view=section&cite=<block-id>#:~:text=…; the browser scrolls to and highlights the sentence natively, and if
 * the first match was an earlier verbatim quote of it (Key plan, Decision schedule) this brings the cited block into view.
 */
import { registerShortcut } from '../core/keys';
import { landOn } from '../core/shortcuts';

export interface OpenOpts {
  query?: string;
  mode?: 'search' | 'keys';
}

type PaletteModule = typeof import('./palette');
let mod: Promise<PaletteModule> | null = null;
export const loadPalette = (): Promise<PaletteModule> => (mod ??= import('./palette'));

const dialog = () => document.querySelector<HTMLDialogElement>('dialog.palette');
/** where focus goes back to when the list closes without taking the reader anywhere */
let returnTo: HTMLElement | null = null;

export function openPalette(opts: OpenOpts = {}): void {
  const d = dialog();
  if (!d) return;
  const input = d.querySelector<HTMLInputElement>('[data-pl-input]');
  if (!d.open) {
    // Another dialog hands over (one modal at a time): close it, then park focus on a visible opener so the Sheet
    // list's native focus-restore returns there (the page is inert until the other dialog has closed).
    const others = Array.from(document.querySelectorAll<HTMLDialogElement>('dialog[open]')).filter((o) => o !== d);
    if (others.length) {
      others.forEach((o) => o.close());
      const back = Array.from(document.querySelectorAll<HTMLElement>('[data-drawer-open], [data-palette-open]')).find((b) => b.offsetParent !== null);
      back?.focus({ preventScroll: true });
    }
    returnTo = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    d.showModal();
  }
  if (input) {
    input.value = opts.query ?? '';
    input.focus();
  }
  d.dataset.mode = opts.mode === 'keys' ? 'keys' : opts.query ? 'results' : 'home';
  loadPalette().then((m) => m.opened(d, opts)).catch(() => { /* offline: the SSR list still works as links */ });
}

export function closePalette(): void {
  const d = dialog();
  if (!d?.open) return;
  release(d);
  d.close();
}

/**
 * Take focus out of the list as it closes, synchronously: left on the (now hidden) combobox until the browser's own
 * focus fix-up, the next key would count as typing and the page's shortcuts would ignore it.
 */
function release(d: HTMLDialogElement): void {
  const a = document.activeElement;
  if (!(a instanceof HTMLElement) || !d.contains(a)) return;
  const back = returnTo;
  returnTo = null;
  if (back && back.isConnected && !d.contains(back) && back.getClientRects().length) back.focus({ preventScroll: true });
  else a.blur();
}

let installed = false;
export function installPalette(): void {
  if (installed) return;
  installed = true;
  const toggle = () => (dialog()?.open ? closePalette() : openPalette());
  registerShortcut('mod+k', 'all', toggle);
  registerShortcut('mod+k', ['dialog:palette', 'dialog:drawer', 'dialog:detail'], toggle);
  registerShortcut('/', 'all', () => openPalette());
  registerShortcut('?', 'all', () => openPalette({ mode: 'keys' }));
  const d = dialog();
  if (d) {
    d.addEventListener('cancel', () => release(d)); // Esc
    d.addEventListener('close', () => release(d));  // the form's esc button, the backdrop, a choice
  }

  document.addEventListener('click', (e) => {
    const b = (e.target as Element | null)?.closest?.('[data-palette-open]');
    if (b) { e.preventDefault(); openPalette(); }
  });
  // intent: start fetching the module (and its index) before the reader asks
  const warm = () => { loadPalette().then((m) => m.warm()).catch(() => {}); };
  document.querySelectorAll('[data-palette-open]').forEach((b) => {
    b.addEventListener('pointerenter', warm, { once: true });
    b.addEventListener('focus', warm, { once: true });
  });
  addEventListener('keydown', (e) => { if (e.key === 'Meta' || e.key === 'Control') warm(); }, { passive: true });

  landCitation();
}

/** Arrival from a cross-page citation (?cite=<block-id>): make sure the cited block ends up in view. */
function landCitation(): void {
  const id = new URLSearchParams(location.search).get('cite');
  if (!id) return;
  const check = () => {
    const el = document.getElementById(id);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const inView = r.bottom > 0 && r.top < innerHeight;
    // the browser scrolled to the first verbatim match; if that was an earlier quote (Key plan, schedule), re-aim
    if (!inView) landOn(el, { block: 'center' });
    el.classList.add('is-cited');
    window.setTimeout(() => el.classList.remove('is-cited'), 4000);
  };
  const later = () => window.setTimeout(check, 700); // after the browser's own scroll to the text directive
  if (document.readyState === 'complete') later();
  else addEventListener('load', later, { once: true });
}
