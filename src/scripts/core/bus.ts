/**
 * bus.ts · P0. The only channel between packages: `sv:*` CustomEvents on window (SPEC §8.3).
 * Nothing imports another package's internals; shared helpers come from core/* only.
 */
import type { PrefKey, PrefValues } from './prefs';

export interface SvEvents {
  /** any preference changed (prefs.set) */
  'sv:prefs': { key: PrefKey; value: PrefValues[PrefKey] };
  /** theme changed (prefs.set('theme')) — the hero re-reads --ink / --rust */
  'sv:theme': { theme: PrefValues['theme'] };
  /** view changed (prefs.set('view')) — Levels / Plan view / drawer */
  'sv:view': { view: PrefValues['view'] };
  /** the current level while reading a case (WP5 → WP1 running head, bottom bar) */
  'sv:level': { index: number; label: string; elev: string };
  /** the Viewport activated a sheet (WP3) */
  'sv:plate': { slug: string };
  /** open the Enlarged detail for a figure (any → WP4b) */
  'sv:fig-open': { el: Element };
}
export type SvEventName = keyof SvEvents;

export function emit<K extends SvEventName>(name: K, detail: SvEvents[K]): void {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

/** Subscribe; returns an unsubscribe function. */
export function listen<K extends SvEventName>(name: K, cb: (detail: SvEvents[K], e: CustomEvent<SvEvents[K]>) => void): () => void {
  const h = (e: Event) => cb((e as CustomEvent<SvEvents[K]>).detail, e as CustomEvent<SvEvents[K]>);
  window.addEventListener(name, h);
  return () => window.removeEventListener(name, h);
}
