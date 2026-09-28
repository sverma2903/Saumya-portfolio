/**
 * keys.ts · P0 API (WP1 registers the actual shortcuts). SPEC §4.11.
 *
 *   registerShortcut(key, scope, handler, opts?) → unregister()
 *     key:   'j' | 'k' | 'v' | 'u' | 'i' | '?' | '/' | 'Escape' | 'mod+k' (⌘K on Apple, Ctrl K elsewhere) …
 *            single characters are matched case-insensitively against KeyboardEvent.key.
 *     scope: 'all' | 'home' | 'case' | 'about' | 'play' | '404' (matched against html[data-page]),
 *            a list of those, or 'dialog:<name>' (fires only while focus is inside <dialog data-dialog="<name>">).
 *   Guards (built in):
 *     - ignored while typing (input, textarea, select, [contenteditable]) — except `mod+` shortcuts;
 *     - page-scoped shortcuts are ignored while focus is inside any open <dialog>; dialog-scoped ones only fire
 *       inside their own dialog;
 *     - single-key shortcuts obey the `sv:keys` switch (html[data-keys="off"]); `mod+` shortcuts always work (⌘K).
 *   Handlers run synchronously and must not animate (law 1: keyboard-initiated actions never animate).
 */
export type KeyScope = 'all' | 'home' | 'case' | 'about' | 'play' | '404' | `dialog:${string}`;
export interface ShortcutOptions {
  /** also fire while typing in a field (defaults to true only for mod+ shortcuts) */
  inInputs?: boolean;
  /** call preventDefault() (default true) */
  preventDefault?: boolean;
}
type Entry = { key: string; mod: boolean; scopes: KeyScope[]; handler: (e: KeyboardEvent) => void; opts: ShortcutOptions };

const entries: Entry[] = [];
let installed = false;

export const isApple = (): boolean =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test((navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? navigator.userAgent);

/** Label for the palette keycap: '⌘K' or 'Ctrl K' (render ⌘ with <Icon name="keycap-cmd">). */
export const modLabel = (): string => (isApple() ? '⌘K' : 'Ctrl K');

export function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof Element)) return false;
  if (el.closest('[contenteditable=""], [contenteditable="true"]')) return true;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = (el as HTMLInputElement).type;
    return !['button', 'checkbox', 'radio', 'range', 'reset', 'submit', 'color', 'file', 'image'].includes(type);
  }
  return false;
}

export const shortcutsEnabled = (): boolean => document.documentElement.dataset.keys !== 'off';

function parse(key: string): { key: string; mod: boolean } {
  const m = /^mod\+(.+)$/i.exec(key);
  return m ? { key: m[1].toLowerCase(), mod: true } : { key: key.length === 1 ? key.toLowerCase() : key, mod: false };
}

function onKeydown(e: KeyboardEvent) {
  if (e.defaultPrevented || e.isComposing) return;
  const page = document.documentElement.dataset.page ?? 'all';
  const target = e.target as Element | null;
  const dialog = target instanceof Element ? target.closest('dialog[open]') : null;
  const dialogName = dialog ? (dialog as HTMLElement).dataset.dialog ?? dialog.id : null;
  const typing = isTypingTarget(target);
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const modDown = isApple() ? e.metaKey : e.ctrlKey;
  for (let i = entries.length - 1; i >= 0; i--) {
    const en = entries[i];
    if (en.key !== k) continue;
    if (en.mod) {
      if (!modDown || e.altKey) continue;
    } else {
      if (e.metaKey || e.ctrlKey || e.altKey) continue;
      if (en.key.length === 1 && !shortcutsEnabled()) continue; // WCAG 2.1.4: single-character keys can be turned off
    }
    const inInputs = en.opts.inInputs ?? en.mod;
    if (typing && !inInputs) continue;
    const dialogScoped = en.scopes.some((s) => s.startsWith('dialog:'));
    if (dialogScoped) {
      if (!dialogName || !en.scopes.includes(`dialog:${dialogName}` as KeyScope)) continue;
    } else {
      if (dialog) continue;
      if (!en.scopes.includes('all') && !en.scopes.includes(page as KeyScope)) continue;
    }
    if (en.opts.preventDefault !== false) e.preventDefault();
    en.handler(e);
    return;
  }
}

export function registerShortcut(
  key: string,
  scope: KeyScope | KeyScope[],
  handler: (e: KeyboardEvent) => void,
  opts: ShortcutOptions = {},
): () => void {
  if (!installed && typeof document !== 'undefined') {
    document.addEventListener('keydown', onKeydown);
    installed = true;
  }
  const p = parse(key);
  const entry: Entry = { key: p.key, mod: p.mod, scopes: Array.isArray(scope) ? scope : [scope], handler, opts };
  entries.push(entry);
  return () => {
    const i = entries.indexOf(entry);
    if (i >= 0) entries.splice(i, 1);
  };
}

/** Registered shortcuts (for the Sheet list "Show keys" action). */
export function listShortcuts(): { key: string; scopes: KeyScope[] }[] {
  return entries.map((e) => ({ key: e.mod ? `mod+${e.key}` : e.key, scopes: e.scopes }));
}
