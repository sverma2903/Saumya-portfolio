/**
 * state.ts · WP4b. The one place a media plate's state is written, so the plate, its view (the placeholder's host),
 * its controls and its loop hairline never disagree.
 *
 *   idle     nothing mounted yet (no src)            → the drafting X
 *   loading  src set, pixels not decoded yet          → the drafting X
 *   ready    a still image has decoded                → pixels (the X fades out over --dur-2)
 *   playing  a GIF/video is moving                    → pixels; controls show Pause; the hairline runs
 *   paused   stopped by the reader, by Motion off, or by the two-large-GIFs rule → the poster frame (or the X + "Paused")
 *   parked   unmounted far away (> 3 viewports) to free decode memory → the drafting X
 */
export type MediaState = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'parked';

/** Write the state on a plate-like host (the plate root, or a walkthrough stage) and everything that mirrors it. */
export function setState(host: HTMLElement, state: MediaState, opts: { restartProgress?: boolean; once?: boolean; at?: number } = {}): void {
  const prev = host.dataset.state;
  host.dataset.state = state;
  const view = host.querySelector<HTMLElement>('[data-ph-host]');
  if (view) view.dataset.state = state;
  const playing = state === 'playing';
  for (const mc of host.querySelectorAll<HTMLElement>('[data-mc]')) {
    mc.toggleAttribute('data-playing', playing);
    const t = mc.querySelector<HTMLElement>('[data-mc-toggle]');
    if (t) t.setAttribute('aria-label', (playing ? t.dataset.labelPause : t.dataset.labelPlay) ?? '');
  }
  for (const p of host.querySelectorAll<HTMLElement>('[data-mc-prog]')) {
    if (!playing) {
      if (state === 'paused' && prev === 'playing' && opts.once) p.setAttribute('data-hold', '');
      else { p.removeAttribute('data-run'); p.removeAttribute('data-hold'); }
      continue;
    }
    p.removeAttribute('data-hold');
    if (opts.restartProgress || !p.dataset.run) {
      p.removeAttribute('data-run');
      void p.offsetWidth; // restart the CSS animation from 0
      p.style.setProperty('--_d', `${-(opts.at ?? 0)}s`);
      p.dataset.run = opts.once ? 'once' : 'loop';
    }
  }
}

/** The placeholder's state line ('Paused'), or clear it. */
export function phNote(host: HTMLElement, text: string): void {
  const s = host.querySelector<HTMLElement>('[data-ph-state]');
  if (s) s.textContent = text;
}

/** Is the element inside a link or button (a decorative plate in a card)? Then it must not carry controls. */
export const inInteractive = (el: Element): boolean => !!el.parentElement?.closest('a[href], button');
