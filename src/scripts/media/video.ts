/**
 * video.ts · WP4b (SPEC §6.3 "Video manager"). Every managed <video data-vid>:
 *
 *   within 1.5 viewports   src = data-src (+ #t=0.001) and preload=metadata, so its first frame shows
 *   ≥ 35 % visible          play() (muted) when Motion is on and the reader hasn't paused it; below 35 %: pause()
 *   beyond 3 viewports      parked: src removed + load(), which releases the decoder
 *   loops only where authored as ambient (the default); the walkthrough player drives its own videos (managed=false)
 *   the one video with sound (Teachable AI, remote, 38 MB) NEVER autoplays: a click on "Play · 0:48 · sound" loads and
 *   plays it unmuted (a user gesture); then Pause, Mute/Unmute and Restart.
 */
import { observe, viewportMargin } from '../core/io';
import { motionOK } from '../core/dom';
import { on as onPref } from '../core/prefs';
import { setState } from './state';
import { isHeld, onHold } from './hold';

interface Vid {
  v: HTMLVideoElement;
  plate: HTMLElement;
  src: string;
  sound: boolean;
  near: boolean;
  visible: boolean;
  far: boolean;
  choice: 'auto' | 'play' | 'pause';
}
const vids = new Map<HTMLElement, Vid>();

function attach(x: Vid): void {
  if (x.v.getAttribute('src')) return;
  x.v.preload = 'metadata';
  x.v.src = x.src;
  if (x.plate.dataset.state === 'idle' || x.plate.dataset.state === 'parked') setState(x.plate, 'loading');
}

function park(x: Vid): void {
  if (!x.v.getAttribute('src')) return;
  x.v.pause();
  x.v.removeAttribute('src');
  x.v.load();
  setState(x.plate, 'parked');
}

function evaluate(x: Vid): void {
  if (x.far) { park(x); return; }
  // the Enlarged detail is open over the page: a playing video pauses (its source and the reader's choice are kept)
  if (isHeld()) { if (!x.v.paused) x.v.pause(); return; }
  if (x.sound) return; // never automatic
  if (x.near) attach(x);
  const want = x.visible && (x.choice === 'play' || (x.choice === 'auto' && motionOK()));
  if (want) {
    attach(x);
    x.v.muted = true;
    x.v.play().catch(() => { /* autoplay refused or no decoder: stays on its first frame */ });
  } else if (!x.v.paused) {
    x.v.pause();
  }
}

export function manageVideo(v: HTMLVideoElement, plate: HTMLElement): void {
  if (vids.has(plate)) return;
  const src = v.dataset.src ?? '';
  if (!src) return;
  const still = plate.hasAttribute('data-still'); // inside a link: its first frame only (no controls possible)
  const x: Vid = { v, plate, src, sound: !v.muted || plate.querySelector('[data-mc-sound]') != null, near: false, visible: false, far: false, choice: still ? 'pause' : 'auto' };
  vids.set(plate, x);
  v.addEventListener('loadeddata', () => { if (plate.dataset.state === 'loading') setState(plate, v.paused ? 'ready' : 'playing'); });
  v.addEventListener('playing', () => { plate.toggleAttribute('data-played', true); setState(plate, 'playing', { restartProgress: true, at: v.currentTime }); });
  v.addEventListener('pause', () => { if (v.getAttribute('src')) setState(plate, v.readyState >= 2 ? 'paused' : 'loading'); });
  v.addEventListener('ended', () => setState(plate, 'paused'));
  observe(plate, (en) => { x.near = en.isIntersecting; evaluate(x); }, { rootMargin: viewportMargin(1.5) });
  observe(plate, (en) => { x.far = !en.isIntersecting; evaluate(x); }, { rootMargin: viewportMargin(3) });
  observe(plate, (en) => { x.visible = en.isIntersecting && en.intersectionRatio >= 0.35; evaluate(x); }, { threshold: [0, 0.35] });
}

export function toggleVideo(plate: HTMLElement): void {
  const x = vids.get(plate);
  if (!x) return;
  if (!x.v.paused) { x.choice = 'pause'; x.v.pause(); return; }
  x.choice = 'play';
  attach(x);
  x.v.play().catch(() => {});
}

export function restartVideo(plate: HTMLElement): void {
  const x = vids.get(plate);
  if (!x) return;
  attach(x);
  x.v.currentTime = 0;
  if (x.choice !== 'pause') x.v.play().catch(() => {});
  setState(plate, x.v.paused ? 'paused' : 'playing', { restartProgress: true });
}

/** The Teachable video: a click is the user gesture that allows sound. */
export function playWithSound(plate: HTMLElement): void {
  const x = vids.get(plate);
  if (!x) return;
  x.choice = 'play';
  attach(x);
  x.v.preload = 'auto';
  x.v.muted = false;
  syncMute(plate);
  // a click is a user activation, so sound is allowed; only if a browser still refuses it (NotAllowedError) do we fall
  // back to muted playback (the Unmute button stays one tap away). A load failure is not a reason to mute.
  x.v.play().catch((e: unknown) => {
    if ((e as { name?: string } | null)?.name !== 'NotAllowedError') return;
    x.v.muted = true;
    syncMute(plate);
    x.v.play().catch(() => {});
  });
}

export function toggleMute(plate: HTMLElement): void {
  const x = vids.get(plate);
  if (!x) return;
  x.v.muted = !x.v.muted;
  syncMute(plate);
}

function syncMute(plate: HTMLElement): void {
  const x = vids.get(plate);
  const b = plate.querySelector<HTMLButtonElement>('[data-mc-mute]');
  if (!x || !b) return;
  const on = !x.v.muted;
  b.setAttribute('aria-pressed', String(on));
  b.setAttribute('aria-label', (on ? b.dataset.labelMute : b.dataset.labelUnmute) ?? '');
}

export const isManagedVideo = (plate: HTMLElement): boolean => vids.has(plate);

/** Print: attach every source so each video shows its first frame. */
export function attachAllForPrint(): void {
  for (const x of vids.values()) if (!x.sound) attach(x);
}

onHold(() => { for (const x of vids.values()) evaluate(x); });
onPref('motion', () => { for (const x of vids.values()) { x.choice = x.plate.hasAttribute('data-still') ? 'pause' : 'auto'; evaluate(x); } });
