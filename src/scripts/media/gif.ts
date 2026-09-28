/**
 * gif.ts · WP4b (SPEC §6.3 "GIF manager"). Every managed <img data-gif> is a small state machine:
 *
 *   idle ──(within 1 viewport · Motion on · not paused by the reader)──▶ loading ──(load)──▶ playing
 *   playing ──(Pause)──▶ paused(user)          playing ──(Motion off)──▶ paused(auto)
 *   playing ──(> 3 viewports away)──▶ parked: src removed, which frees the decoded frames ──(back within 1)──▶ loading
 *   at most TWO large GIFs (> 400k CSS px²) play at once; extra ones pause by lowest visibility and resume on their own
 *
 * Paused shows the file's POSTER frame (media-staging: a complete state, never half-typed): ImageDecoder decodes that
 * one frame into a <canvas> sized to the plate (× devicePixelRatio, never above native), once per plate — no frame
 * cache, no re-encode. The moment Pause is pressed the motion stops: the canvas takes the frame drawImage hands over
 * (the GIF's first) until the poster replaces it a moment later. Without ImageDecoder, paused is the drafting X +
 * "Paused" + Play. The GIF is never decoded whole in JS, and never re-encoded.
 */
import { observe, viewportMargin } from '../core/io';
import { motionOK } from '../core/dom';
import { on as onPref } from '../core/prefs';
import { chrome } from '../../data/chrome';
import { phNote, setState } from './state';
import { isHeld, onHold } from './hold';

const LARGE = 400_000;
const MAX_LARGE = 2;

interface Gif {
  img: HTMLImageElement;
  plate: HTMLElement;
  src: string;
  poster: number;
  canvas: HTMLCanvasElement | null;
  near: boolean;      // within 1 viewport
  far: boolean;       // beyond 3 viewports
  ratio: number;      // visible fraction (concurrency ranking)
  /** the reader's choice: 'auto' follows Motion; 'play'/'pause' were pressed (Motion off can't stop a pressed Play) */
  choice: 'auto' | 'play' | 'pause';
  /** inside a link (no controls possible): always its still — the poster, or the first frame */
  still: boolean;
  autoPaused: boolean; // the two-large-GIFs rule
}

const gifs = new Map<HTMLElement, Gif>();
type DecoderCtor = new (init: { data: ReadableStream<Uint8Array> | ArrayBuffer; type: string }) => {
  decode(o: { frameIndex: number }): Promise<{ image: CanvasImageSource & { close(): void; displayWidth: number; displayHeight: number } }>;
  close(): void;
};
const Decoder = (): DecoderCtor | undefined => (window as unknown as { ImageDecoder?: DecoderCtor }).ImageDecoder;

/**
 * Decode ONE frame of a GIF with ImageDecoder and draw it into `canvas` at `w` px wide (× the file's aspect).
 * The shared poster path for the plates, the walkthrough stage and the player. false without ImageDecoder.
 */
export async function decodePoster(src: string, frame: number, canvas: HTMLCanvasElement, w: number, aspect: number): Promise<boolean> {
  const D = Decoder();
  if (!D) return false;
  try {
    const res = await fetch(src);
    if (!res.ok || !res.body) return false;
    const dec = new D({ data: res.body, type: 'image/gif' });
    const { image } = await dec.decode({ frameIndex: frame });
    const cw = Math.max(1, Math.round(w));
    const ch = Math.max(1, Math.round(cw / (aspect || 1)));
    canvas.width = cw;
    canvas.height = ch;
    canvas.getContext('2d')?.drawImage(image, 0, 0, cw, ch);
    image.close();
    dec.close();
    return true;
  } catch {
    return false;
  }
}

const jobs = new WeakMap<HTMLCanvasElement, Promise<boolean>>();

/** Without ImageDecoder: the GIF's first frame (HTML's default frame for drawImage), from a detached Image. */
export function firstFrame(src: string, canvas: HTMLCanvasElement, w: number, aspect: number): Promise<boolean> {
  const im = new Image();
  im.src = src;
  return im.decode().then(() => {
    canvas.width = Math.max(1, Math.round(w));
    canvas.height = Math.max(1, Math.round(w / (aspect || 1)));
    canvas.getContext('2d')?.drawImage(im, 0, 0, canvas.width, canvas.height);
    im.removeAttribute('src');
    return true;
  }, () => false);
}

/**
 * Poster any GIF plate (managed, the player's) into its .plate__poster canvas at its rendered width × DPR (≤ native).
 * Decoded once per plate (again only if the plate has grown by more than a quarter since). The canvas is revealed only
 * while the GIF is not mounted: a Play pressed during the decode wins.
 */
export function posterPlate(plate: HTMLElement): Promise<boolean> {
  const img = plate.querySelector<HTMLImageElement>('img[data-gif]');
  const canvas = plate.querySelector<HTMLCanvasElement>('canvas.plate__poster');
  if (!img || !canvas) return Promise.resolve(false);
  const nw = Number(img.getAttribute('width')) || 1;
  const nh = Number(img.getAttribute('height')) || 1;
  const shown = img.getBoundingClientRect().width || canvas.getBoundingClientRect().width || nw;
  const w = Math.round(Math.min(nw, shown * Math.min(devicePixelRatio || 1, 2)));
  const reveal = (ok: boolean): boolean => {
    if (ok && !img.getAttribute('src')) { canvas.hidden = false; phNote(plate, ''); }
    return ok;
  };
  const have = Number(canvas.dataset.pw ?? 0);
  if (have && w <= have * 1.25) return Promise.resolve(reveal(true));
  let job = jobs.get(canvas);
  if (!job) {
    const src = img.dataset.src ?? img.src;
    // a still plate has no Play to offer, so without ImageDecoder it shows the file's first frame, never the void
    const still = plate.hasAttribute('data-still');
    job = decodePoster(src, Number(img.dataset.poster ?? 0), canvas, w, nw / nh).then((ok) => ok || (still && firstFrame(src, canvas, w, nw / nh))).then((ok) => {
      jobs.delete(canvas);
      if (ok) canvas.dataset.pw = String(canvas.width);
      return ok;
    });
    jobs.set(canvas, job);
  }
  return job.then(reveal);
}

/**
 * Stop the motion at once. With its poster already decoded, the canvas shows it; otherwise the canvas takes the frame
 * drawImage hands over (HTML: an animated image's default, i.e. first, frame) until the poster replaces it.
 * `first`: always that first frame (a Restart: exactly what the GIF shows again a frame later); the poster is redrawn
 * on the next pause.
 */
function freeze(img: HTMLImageElement, canvas: HTMLCanvasElement | null, first = false): void {
  if (!canvas) return;
  if (canvas.dataset.pw && !first) { canvas.hidden = false; return; }
  if (!(img.getAttribute('src') && img.complete && img.naturalWidth)) return;
  delete canvas.dataset.pw;
  const nw = Number(img.getAttribute('width')) || img.naturalWidth;
  const nh = Number(img.getAttribute('height')) || img.naturalHeight;
  const cw = Math.max(1, Math.round(Math.min(nw, (img.getBoundingClientRect().width || nw) * Math.min(devicePixelRatio || 1, 2))));
  canvas.width = cw;
  canvas.height = Math.max(1, Math.round((cw * nh) / nw));
  try { canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height); canvas.hidden = false; } catch { /* undecodable: the X */ }
}

/** Hold a GIF plate on its first frame while its src is re-set (a Restart): no blank frame between the two. */
export function freezePlate(plate: HTMLElement): void {
  const img = plate.querySelector<HTMLImageElement>('img[data-gif]');
  if (img) freeze(img, plate.querySelector<HTMLCanvasElement>('canvas.plate__poster'), true);
}

/** Pause any GIF plate that no manager owns (the Highlights player): motion stops now, then its poster. */
export function pausePlate(plate: HTMLElement): void {
  const img = plate.querySelector<HTMLImageElement>('img[data-gif]');
  if (!img) return;
  freeze(img, plate.querySelector<HTMLCanvasElement>('canvas.plate__poster'));
  if (img.getAttribute('src')) img.removeAttribute('src');
  void posterPlate(plate);
}

const isLarge = (g: Gif): boolean => {
  const r = g.plate.getBoundingClientRect();
  return r.width * r.height > LARGE;
};

const hasPoster = (g: Gif): boolean => !!g.canvas?.dataset.pw;

function showPaused(g: Gif): void {
  // 1 · stop the motion now; 2 · then the representative poster frame (a complete state)
  freeze(g.img, g.canvas);
  if (g.img.getAttribute('src')) g.img.removeAttribute('src');
  setState(g.plate, 'paused');
  phNote(g.plate, hasPoster(g) || (g.canvas && !g.canvas.hidden) ? '' : chrome.wp4b.media.paused);
  void posterPlate(g.plate);
}

function mount(g: Gif): void {
  if (g.img.getAttribute('src')) return;
  setState(g.plate, 'loading');
  phNote(g.plate, '');
  g.img.src = g.src;
}

function park(g: Gif): void {
  if (g.img.getAttribute('src')) g.img.removeAttribute('src');
  if (g.canvas) g.canvas.hidden = true;
  setState(g.plate, 'parked');
}

function onLoad(g: Gif): void {
  if (!g.img.getAttribute('src')) return;
  if (g.canvas) g.canvas.hidden = true;
  setState(g.plate, 'playing', { restartProgress: true });
}

const live = (g: Gif): boolean => g.plate.dataset.state === 'playing' || g.plate.dataset.state === 'loading';
/** the two-large rule's ranking: on screen first, then a pressed Play, then the most visible, then the nearest */
const rank = (g: Gif): number => (g.ratio > 0 ? 4 : 0) + (g.choice === 'play' ? 2 : 0) + (g.near ? 1 : 0);

/** Decide every GIF's state from its visibility, Motion, the reader's choice and the two-large rule. */
function evaluate(): void {
  const motion = motionOK();
  const all = [...gifs.values()];
  const wants = (g: Gif): boolean => g.near && !g.far && (g.choice === 'play' || (g.choice === 'auto' && motion));
  // ≤ 2 large GIFs play at once: every large GIF that plays (even one scrolled just off screen) or wants to, counts
  const large = all.filter((g) => !g.far && isLarge(g) && (wants(g) || live(g)))
    .sort((a, b) => rank(b) - rank(a) || b.ratio - a.ratio);
  const blocked = new Set(large.slice(MAX_LARGE));
  const held = isHeld();
  for (const g of all) {
    // the Enlarged detail is open over the page: nothing behind it decodes (its state and the reader's choice are kept)
    if (held) { if (live(g)) park(g); continue; }
    g.autoPaused = blocked.has(g);
    const st = g.plate.dataset.state;
    if (g.far) { if (st !== 'parked' && st !== 'idle') park(g); continue; }
    if (wants(g) && !g.autoPaused) {
      if (!live(g)) mount(g);
      continue;
    }
    if (!g.near) {
      // 1–3 viewports away: a playing GIF keeps its src (no churn at the edge of the zone), unless a third large GIF
      // needs its slot; then it parks at once: nobody sees it, and its poster is drawn when it comes back
      if (g.autoPaused && live(g)) park(g);
      continue;
    }
    if (live(g)) showPaused(g);
    else if (st === 'idle' || st === 'parked') {
      // Motion off / paused before it ever played: its poster, never the motion
      setState(g.plate, 'paused');
      phNote(g.plate, hasPoster(g) ? '' : chrome.wp4b.media.paused);
      void posterPlate(g.plate);
    }
  }
}

let queued = false;
const schedule = (): void => {
  if (queued) return;
  queued = true;
  queueMicrotask(() => { queued = false; evaluate(); });
};

export function manageGif(img: HTMLImageElement, plate: HTMLElement): void {
  if (gifs.has(plate)) return;
  const src = img.dataset.src ?? img.getAttribute('src') ?? '';
  if (!src) return;
  img.dataset.src = src;
  const g: Gif = {
    img, plate, src,
    poster: Number(img.dataset.poster ?? 0),
    canvas: plate.querySelector<HTMLCanvasElement>('canvas.plate__poster'),
    near: false, far: false, ratio: 0, autoPaused: false,
    still: plate.hasAttribute('data-still'),
    choice: plate.hasAttribute('data-still') ? 'pause' : 'auto',
  };
  gifs.set(plate, g);
  img.addEventListener('load', () => onLoad(g));
  img.addEventListener('error', () => { if (g.img.getAttribute('src')) setState(g.plate, 'parked'); });
  // the LCP GIF arrives with a real src: adopt it as mounted (it may even have painted already)
  if (img.getAttribute('src')) {
    if (img.complete && img.naturalWidth) onLoad(g); else setState(plate, 'loading');
  }
  observe(plate, (en) => { g.near = en.isIntersecting; schedule(); }, { rootMargin: viewportMargin(1) });
  observe(plate, (en) => { g.far = !en.isIntersecting; schedule(); }, { rootMargin: viewportMargin(3) });
  observe(plate, (en) => { g.ratio = en.intersectionRatio; if (isLarge(g)) schedule(); }, { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] });
}

/** Pause/Play from a control (the reader's choice overrides Motion off for this one GIF). */
export function toggleGif(plate: HTMLElement): void {
  const g = gifs.get(plate);
  if (!g) return;
  if (plate.dataset.state === 'playing' || plate.dataset.state === 'loading') {
    g.choice = 'pause';
    showPaused(g);
  } else {
    // an explicit Play works even with Motion off, and outranks the two-large rule
    g.choice = 'play';
    g.autoPaused = false;
    mount(g);
  }
  schedule();
}

/** Restart from frame 0: re-set the src (the browser restarts the animation), and the hairline with it. */
export function restartGif(plate: HTMLElement): void {
  const g = gifs.get(plate);
  if (!g) return;
  if (g.choice === 'pause') g.choice = 'play';
  freeze(g.img, g.canvas, true); // the first frame holds until the GIF is back (onLoad hides the canvas)
  g.img.removeAttribute('src');
  requestAnimationFrame(() => mount(g));
}

export const isManagedGif = (plate: HTMLElement): boolean => gifs.has(plate);

/** Print: every GIF shows a frame (the file itself), never the void. */
export function mountAllForPrint(): void {
  for (const g of gifs.values()) if (!g.img.getAttribute('src')) g.img.src = g.src;
}

// the Motion switch is a fresh, site-wide choice: it resets every per-GIF choice (a still plate stays still)
onHold(() => schedule());
onPref('motion', () => { for (const g of gifs.values()) g.choice = g.still ? 'pause' : 'auto'; schedule(); });
