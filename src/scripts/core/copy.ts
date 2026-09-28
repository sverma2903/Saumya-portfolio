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

/** Show a status message in the toast region for 1.6 s (announced politely by screen readers). */
export function toast(message: string): void {
  const el = document.querySelector<HTMLElement>('.toast[role="status"]');
  if (!el) return;
  const text = el.querySelector<HTMLElement>('[data-toast-text]') ?? el;
  window.clearTimeout(timer);
  // re-announce the same message: clear first, then set on the next frame
  text.textContent = '';
  el.classList.remove('is-on');
  requestAnimationFrame(() => {
    text.textContent = message;
    el.classList.add('is-on');
    timer = window.setTimeout(() => {
      el.classList.remove('is-on');
      timer = window.setTimeout(() => { text.textContent = ''; }, 400);
    }, TOAST_MS);
  });
}
