/**
 * core/* APIs under a tiny DOM shim (no jsdom dependency): prefs get/set/on + events, keys registerShortcut guards.
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';

class FakeElement extends EventTarget {
  dataset: Record<string, string> = {};
  attrs = new Map<string, string>();
  tagName: string;
  type = '';
  parent: FakeElement | null = null;
  constructor(tag = 'DIV') { super(); this.tagName = tag; }
  setAttribute(k: string, v: string) { this.attrs.set(k, v); }
  getAttribute(k: string) { return this.attrs.get(k) ?? null; }
  closest(sel: string): FakeElement | null {
    // supports 'dialog[open]' and contenteditable selectors used by keys.ts
    let n: FakeElement | null = this;
    while (n) {
      if (sel.includes('dialog') && n.tagName === 'DIALOG' && n.attrs.has('open')) return n;
      if (sel.includes('contenteditable') && ['', 'true'].includes(n.attrs.get('contenteditable') ?? 'x')) return n;
      n = n.parent;
    }
    return null;
  }
}
const store = new Map<string, string>();
const html = new FakeElement('HTML');
const meta = new FakeElement('META');
const win = new EventTarget();
const doc = Object.assign(new EventTarget(), {
  documentElement: html,
  readyState: 'complete',
  querySelector: (s: string) => (s.includes('theme-color') ? meta : null),
});
Object.assign(globalThis, {
  window: win,
  document: doc,
  Element: FakeElement,
  localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) },
});
Object.defineProperty(globalThis, 'navigator', { value: { platform: 'MacIntel', userAgent: 'Mac' }, configurable: true });

/** Dispatch a keydown on `document` (where keys.ts listens), as if it bubbled up from `target`. */
const key = (k: string, init: Partial<{ metaKey: boolean; ctrlKey: boolean; altKey: boolean; shiftKey: boolean }> = {}, target?: FakeElement) => {
  const e = Object.assign(new Event('keydown', { cancelable: true, bubbles: true }), { key: k, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, isComposing: false, ...init });
  if (target) Object.defineProperty(e, 'target', { value: target });
  doc.dispatchEvent(e);
  return e;
};

describe('prefs', async () => {
  const prefs = await import('@/scripts/core/prefs');
  beforeEach(() => { store.clear(); html.dataset = { motion: 'full', view: 'section', keys: 'on' }; });
  test('get() reads html[data-*] with defaults', () => {
    expect(prefs.get('motion')).toBe('full');
    expect(prefs.get('theme')).toBe('vellum');
    html.dataset.theme = 'dusk';
    expect(prefs.get('theme')).toBe('dusk');
  });
  test('set() persists, writes the dataset and dispatches sv:prefs (+ sv:theme / sv:view)', () => {
    const seen: string[] = [];
    win.addEventListener('sv:prefs', (e) => seen.push(`prefs:${JSON.stringify((e as CustomEvent).detail)}`));
    win.addEventListener('sv:theme', (e) => seen.push(`theme:${(e as CustomEvent).detail.theme}`));
    win.addEventListener('sv:view', (e) => seen.push(`view:${(e as CustomEvent).detail.view}`));
    prefs.set('theme', 'dusk');
    prefs.set('view', 'plan');
    expect(store.get('sv:theme')).toBe('dusk');
    expect(store.get('sv:view')).toBe('plan');
    expect(html.dataset.theme).toBe('dusk');
    expect(html.dataset.view).toBe('plan');
    expect(meta.getAttribute('content')).toBe('#1D1614');
    expect(seen).toEqual(['prefs:{"key":"theme","value":"dusk"}', 'theme:dusk', 'prefs:{"key":"view","value":"plan"}', 'view:plan']);
  });
  test('on() subscribes to one key and unsubscribes', () => {
    const cb = vi.fn();
    const off = prefs.on('motion', cb);
    prefs.set('view', 'plan');
    prefs.set('motion', 'reduce');
    off();
    prefs.set('motion', 'full');
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith('reduce');
  });
  test('set() rejects unknown values; toggle() flips', () => {
    expect(() => prefs.set('motion', 'slow' as never)).toThrow();
    expect(prefs.toggle('keys')).toBe('off');
    expect(html.dataset.keys).toBe('off');
  });
});

describe('keys.registerShortcut', async () => {
  const keys = await import('@/scripts/core/keys');
  beforeEach(() => { html.dataset = { page: 'case', keys: 'on' }; });
  test('fires in scope, not out of scope; unregister works', () => {
    const h = vi.fn();
    const off = keys.registerShortcut('j', 'case', h);
    key('j');
    html.dataset.page = 'home';
    key('j');
    off();
    html.dataset.page = 'case';
    key('j');
    expect(h).toHaveBeenCalledTimes(1);
  });
  test('single-key shortcuts obey sv:keys; mod+k always works', () => {
    const j = vi.fn();
    const k = vi.fn();
    const off1 = keys.registerShortcut('v', 'all', j);
    const off2 = keys.registerShortcut('mod+k', 'all', k);
    html.dataset.keys = 'off';
    key('v');
    key('k', { metaKey: true });
    expect(j).not.toHaveBeenCalled();
    expect(k).toHaveBeenCalledTimes(1);
    off1(); off2();
  });
  test('ignored while typing (except mod+ shortcuts) and inside foreign dialogs', () => {
    const v = vi.fn();
    const pal = vi.fn();
    const off1 = keys.registerShortcut('v', 'all', v);
    const off2 = keys.registerShortcut('Escape', 'dialog:palette', pal);
    const input = new FakeElement('INPUT');
    input.type = 'text';
    key('v', {}, input);
    expect(v).not.toHaveBeenCalled();
    const dialog = new FakeElement('DIALOG');
    dialog.setAttribute('open', '');
    dialog.dataset.dialog = 'palette';
    const btn = new FakeElement('BUTTON');
    btn.parent = dialog;
    key('v', {}, btn);
    expect(v).not.toHaveBeenCalled();
    key('Escape', {}, btn);
    expect(pal).toHaveBeenCalledTimes(1);
    key('Escape');
    expect(pal).toHaveBeenCalledTimes(1);
    off1(); off2();
  });
  test('modifier keys never trigger single-key shortcuts; case-insensitive keys', () => {
    const j = vi.fn();
    const off = keys.registerShortcut('J', 'all', j);
    key('j', { ctrlKey: true });
    key('J');
    expect(j).toHaveBeenCalledTimes(1);
    off();
  });
  test('isTypingTarget + modLabel', () => {
    const ta = new FakeElement('TEXTAREA');
    const cb = new FakeElement('INPUT');
    cb.type = 'checkbox';
    expect(keys.isTypingTarget(ta as never)).toBe(true);
    expect(keys.isTypingTarget(cb as never)).toBe(false);
    expect(keys.modLabel()).toBe('⌘K');
  });
});
