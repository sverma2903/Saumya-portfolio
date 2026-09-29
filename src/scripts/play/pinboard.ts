/**
 * pinboard.ts · WP6 (SPEC §5.4). The Play board's two videos while the page renders the P0 Plate.
 *
 *   Conversense (GHjG21…mp4, 6.3 s, silent)  muted loop while ≥ 35% visible and Motion is on; a Pause/Play control
 *                                           (WCAG 2.2.2: the loop runs longer than 5 s); pausing is remembered
 *   Teachable AI (6GwunO…mp4, 47.8 s, audio, 38 MB, remote)  NEVER autoplays: the unplayed state is the dark bezel and a
 *                                           centred "Play · 0:48 · sound"; a click loads and plays it WITH sound (a user
 *                                           gesture), then Pause/Play, Mute and Restart. If a browser still refuses sound,
 *                                           it plays muted and Mute shows it
 *
 * The media system (WP4b) owns video management: when its Plate renders a board plate (its <video data-vid>, its
 * .plate__view, its [data-mc-sound]) this module stands down for that plate and PinItem's controls stay hidden.
 * Nothing here runs without JS: the plain <video controls> of the P0 Plate is the no-JS player.
 */
import { motionOK } from '../core/dom';
import { onVisibility } from '../core/io';
import { on as onPref } from '../core/prefs';

for (const pin of document.querySelectorAll<HTMLElement>('.pin')) {
  const plate = pin.querySelector<HTMLElement>('[data-plate]');
  const v = plate?.querySelector('video');
  if (!plate || !v) continue;
  if (v.hasAttribute('data-vid') || plate.querySelector('.plate__view, [data-mc-sound]')) continue; // WP4b's Plate
  wire(pin, v);
}

function wire(pin: HTMLElement, v: HTMLVideoElement): void {
  const ctl = pin.querySelector<HTMLElement>('[data-pin-ctl]');
  const toggle = pin.querySelector<HTMLButtonElement>('[data-pin-toggle]');
  const mute = pin.querySelector<HTMLButtonElement>('[data-pin-mute]');
  const restart = pin.querySelector<HTMLButtonElement>('[data-pin-restart]');
  const soundBtn = pin.querySelector<HTMLButtonElement>('[data-pin-sound]');
  v.removeAttribute('controls');
  v.playsInline = true;

  const sync = () => {
    if (toggle) {
      const paused = v.paused;
      toggle.dataset.state = paused ? 'paused' : 'playing';
      toggle.setAttribute('aria-label', (paused ? toggle.dataset.lPlay : toggle.dataset.lPause) ?? '');
    }
    mute?.setAttribute('aria-pressed', String(v.muted));
  };
  v.addEventListener('play', sync);
  v.addEventListener('pause', sync);
  v.addEventListener('volumechange', sync);

  if (soundBtn) {
    // the unplayed state: no src is fetched until the reader asks (preload=none; 38 MB)
    v.preload = 'none';
    soundBtn.hidden = false;
    soundBtn.addEventListener('click', () => {
      v.muted = false;
      v.play().then(() => {
        soundBtn.hidden = true;
        if (ctl) ctl.hidden = false;
        toggle?.focus({ preventScroll: true });
      }, (err: unknown) => {
        if ((err as { name?: string } | null)?.name !== 'NotAllowedError') return;
        v.muted = true; // sound refused: play silently, one tap from Unmute
        v.play().then(() => { soundBtn.hidden = true; if (ctl) ctl.hidden = false; }, () => {});
      });
    });
    toggle?.addEventListener('click', () => { if (v.paused) v.play().catch(() => {}); else v.pause(); sync(); });
    mute?.addEventListener('click', () => { v.muted = !v.muted; sync(); });
    restart?.addEventListener('click', () => { v.currentTime = 0; v.play().catch(() => {}); sync(); });
    sync();
    return;
  }

  // the ambient loop: muted, only while seen, only with Motion on, and never against the reader's Pause
  v.muted = true;
  v.loop = true;
  if (ctl) ctl.hidden = false;
  let seen = false;
  let chosen: 'auto' | 'play' | 'pause' = 'auto';
  const evaluate = () => {
    const want = seen && (chosen === 'play' || (chosen === 'auto' && motionOK()));
    if (want && v.paused) v.play().catch(() => {});
    else if (!want && !v.paused) v.pause();
    sync();
  };
  toggle?.addEventListener('click', () => {
    chosen = v.paused ? 'play' : 'pause';
    evaluate();
  });
  onVisibility(v, (visible) => { seen = visible; evaluate(); }, 0.35);
  onPref('motion', () => { chosen = 'auto'; evaluate(); });
  sync();
}
