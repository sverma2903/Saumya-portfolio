/**
 * prefs.ts · P0. Preferences (SPEC §4.12): get(key) · set(key, value) · on(key, cb).
 *   motion: 'full' | 'reduce'     localStorage 'sv:motion'  → html[data-motion]  (overrides the OS both ways)
 *   theme:  'vellum' | 'dusk'     localStorage 'sv:theme'   → html[data-theme]   (never follows the OS)
 *   view:   'section' | 'plan'    localStorage 'sv:view'    → html[data-view]    (?view=section wins for one load)
 *   keys:   'on' | 'off'          localStorage 'sv:keys'    → html[data-keys]    (single-key shortcuts, WCAG 2.1.4)
 * The synchronous head script in Base.astro applies the stored values before first paint; this module keeps them
 * in sync afterwards. set() writes localStorage (try/catch), writes the dataset and dispatches
 * CustomEvent('sv:prefs', {detail:{key,value}}) — plus 'sv:theme' / 'sv:view' for those two keys.
 */
import { emit } from './bus';

export type PrefValues = {
  motion: 'full' | 'reduce';
  theme: 'vellum' | 'dusk';
  view: 'section' | 'plan';
  keys: 'on' | 'off';
};
export type PrefKey = keyof PrefValues;

export const STORAGE_KEYS: Record<PrefKey, string> = { motion: 'sv:motion', theme: 'sv:theme', view: 'sv:view', keys: 'sv:keys' };
const ALLOWED: { [K in PrefKey]: PrefValues[K][] } = {
  motion: ['full', 'reduce'],
  theme: ['vellum', 'dusk'],
  view: ['section', 'plan'],
  keys: ['on', 'off'],
};
const DEFAULTS: PrefValues = { motion: 'full', theme: 'vellum', view: 'section', keys: 'on' };
const THEME_COLOR: Record<PrefValues['theme'], string> = { vellum: '#EEEBE3', dusk: '#1D1614' };

const root = () => document.documentElement;

function read(k: string): string | null {
  try { return localStorage.getItem(k); } catch { return null; }
}
function write(k: string, v: string): void {
  try { localStorage.setItem(k, v); } catch { /* private mode / blocked storage: the dataset still changes */ }
}

/** Current value (from html[data-*], which the head script initialised). */
export function get<K extends PrefKey>(key: K): PrefValues[K] {
  const v = root().dataset[key] as PrefValues[K] | undefined;
  return v && (ALLOWED[key] as string[]).includes(v) ? v : DEFAULTS[key];
}

/** Stored value only (null when the user never chose). */
export function stored<K extends PrefKey>(key: K): PrefValues[K] | null {
  const v = read(STORAGE_KEYS[key]);
  return v && (ALLOWED[key] as string[]).includes(v) ? (v as PrefValues[K]) : null;
}

export function set<K extends PrefKey>(key: K, value: PrefValues[K], opts: { persist?: boolean } = {}): void {
  if (!(ALLOWED[key] as string[]).includes(value)) throw new Error(`prefs: bad value ${String(value)} for ${key}`);
  if (opts.persist !== false) write(STORAGE_KEYS[key], value);
  root().dataset[key] = value;
  if (key === 'theme') syncThemeColor();
  emit('sv:prefs', { key, value });
  if (key === 'theme') emit('sv:theme', { theme: value as PrefValues['theme'] });
  if (key === 'view') emit('sv:view', { view: value as PrefValues['view'] });
}

export function toggle<K extends PrefKey>(key: K): PrefValues[K] {
  const [a, b] = ALLOWED[key];
  const next = (get(key) === a ? b : a) as PrefValues[K];
  set(key, next);
  return next;
}

/** Subscribe to one key; returns an unsubscribe function. The callback does NOT fire for the current value. */
export function on<K extends PrefKey>(key: K, cb: (value: PrefValues[K]) => void): () => void {
  const h = (e: Event) => {
    const d = (e as CustomEvent<{ key: PrefKey; value: PrefValues[PrefKey] }>).detail;
    if (d && d.key === key) cb(d.value as PrefValues[K]);
  };
  window.addEventListener('sv:prefs', h);
  return () => window.removeEventListener('sv:prefs', h);
}

/** Keep <meta name="theme-color"> in step with the theme (§7.3). */
export function syncThemeColor(): void {
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', THEME_COLOR[get('theme')]);
}

/** true when motion is allowed right now (Motion toggle on AND no stored/OS reduce). */
export const motionOK = (): boolean => get('motion') === 'full';

/** Cross-tab sync: another tab changed a preference. */
export function initPrefs(): void {
  syncThemeColor();
  window.addEventListener('storage', (e) => {
    const key = (Object.keys(STORAGE_KEYS) as PrefKey[]).find((k) => STORAGE_KEYS[k] === e.key);
    if (!key || !e.newValue || key === 'view') return; // view is per-tab on purpose (a reader may be mid-case)
    if ((ALLOWED[key] as string[]).includes(e.newValue) && get(key) !== e.newValue) set(key, e.newValue as never, { persist: false });
  });
}
