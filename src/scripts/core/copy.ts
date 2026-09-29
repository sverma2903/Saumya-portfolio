/**
 * copy.ts · WP1. Clipboard + the polite status toast (SPEC §4.3: Copy writes the address and announces "Copied"
 * for 1.6 s; §7.1 4.1.3 status messages). The toast is the one `.toast[role=status]` region the end sheet renders.
 */
const TOAST_MS = 1600;
let timer = 0;

/** Write `text` to the clipboard; falls back to a hidden textarea + execCommand. Resolves true on success. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path (permissions, insecure origin) */
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;inset:0 auto auto 0;opacity:0;pointer-events:none';
  document.body.append(ta);
  const active = document.activeElement as HTMLElement | null;
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  active?.focus?.({ preventScroll: true });
  return ok;
}

/**
 * Say `message` politely to assistive tech, with nothing drawn (the page shows the change itself). Cleared first, so
 * the same message twice (V, V, V) is said each time.
 */
let sayTimer = 0;
export function announce(message: string): void {
  const el = document.querySelector<HTMLElement>('[data-announce]');
  if (!el || !message) return;
  window.clearTimeout(sayTimer);
  el.textContent = '';
  sayTimer = window.setTimeout(() => { el.textContent = message; }, 60);
}

/**
 * Show a status message in the toast region for 1.6 s (announced politely by screen readers). With `anchor`, the chip
 * is laid over that control (same box, centred), so the confirmation reads as the click's own feedback and covers
 * nothing else; without one (e.g. from the Sheet list, which has closed) it sits bottom-centre.
 */
export function toast(message: string, anchor?: Element | null): void {
  const el = document.querySelector<HTMLElement>('.toast[role="status"]');
  if (!el) return;
  const text = el.querySelector<HTMLElement>('[data-toast-text]') ?? el;
  const chip = el.querySelector<HTMLElement>('.toast__chip') ?? el;
  window.clearTimeout(timer);
  // re-announce the same message: clear first, then set on the next frame
  text.textContent = '';
  el.classList.remove('is-on');
  requestAnimationFrame(() => {
    text.textContent = message;
    const r = anchor?.getBoundingClientRect();
    if (r && r.width) {
      // laid over the control itself, centred on it: the button reads "✓ Copied" for the moment, covering nothing else
      el.classList.add('is-anchored');
      el.style.setProperty('--toast-w', `${Math.round(r.width)}px`);
      el.style.setProperty('--toast-h', `${Math.round(r.height)}px`);
      const w = Math.max(chip.offsetWidth, r.width);
      el.style.setProperty('--toast-x', `${Math.round(Math.max(0, r.left + r.width / 2 - w / 2))}px`);
      el.style.setProperty('--toast-y', `${Math.round(r.top)}px`);
    } else {
      el.classList.remove('is-anchored');
    }
    el.classList.add('is-on');
    timer = window.setTimeout(() => {
      el.classList.remove('is-on');
      timer = window.setTimeout(() => { text.textContent = ''; }, 400);
    }, TOAST_MS);
  });
}
