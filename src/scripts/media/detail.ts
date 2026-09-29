/**
 * detail.ts · WP4b (SPEC §4.5). The Enlarged detail — loaded on first use (with @panzoom/panzoom).
 *
 *   open(el, trigger)  el = a [data-plate] (any figure) or another package's element (the home Viewport's box carries
 *                      data-file + its layers). Prev/Next step through EVERY figure on the page in DOM order.
 *   stage              her ORIGINAL file (same URL): an <img> (GIFs animate; Pause shows the poster frame, decoded at
 *                      native size), or a <video> with our own controls (so pan/zoom works on it too)
 *   pan/zoom           panzoom on a native-size box: min = fit, max = max(2 × fit, 1:1); wheel zooms (no modifier),
 *                      pinch, drag, double-click toggles fit ↔ 1:1 at the pointer; a zoom chip bottom-left
 *   panel              FIG · n / N · her nearest heading · her caption (cloned, verbatim) · a back-link to the sheet
 *                      and level · File info, folded: file · native px · size + real format (magic bytes, from the plate)
 *   keys               ← → prev/next (pan when zoomed) · + − · 0 fit · 1 1:1 · Space play/pause · Home/End · Esc
 *   opening            a 180 ms FLIP from the figure's rect when opened by pointer with Motion on; instant otherwise
 *   mobile             full screen; the panel is a 72px bottom sheet that expands to 50vh; swipe steps figures at fit
 * Keyboard-initiated actions never animate (§2.7 law 1). Everything is cleaned up on close (sources removed).
 */
import detailCss from '../../styles/detail.css?url';
import Panzoom, { type PanzoomObject } from '@panzoom/panzoom';
import { motionOK } from '../core/dom';
import { setHold } from './hold';

/** The viewer's stylesheet (WP7): requested when this module first loads, and awaited before the dialog opens, so no
 *  page carries it in its first render (Astro would hoist a plain CSS import into every page's <head>). */
const cssReady: Promise<void> = new Promise((resolve) => {
  if (document.querySelector(`link[rel="stylesheet"][href="${detailCss}"]`)) { resolve(); return; }
  const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: detailCss });
  link.addEventListener('load', () => resolve(), { once: true });
  link.addEventListener('error', () => resolve(), { once: true });
  document.head.append(link);
});

type Kind = 'image' | 'gif' | 'video';
interface Item {
  el: Element;
  plate: HTMLElement | null;
  src: string;
  kind: Kind;
  w: number;
  h: number;
  file: string;
  fmt: string;
  size: string;
  fig: string;
  alt: string;
  cap: () => Node | null;
  capText: string;
  back: { href: string; text: string } | null;
  /** her nearest heading above the figure in its chapter (polish r1): the panel's context line */
  ctx?: string;
  poster: number;
  sound: boolean;
  zoom: string;
}

const dlg = document.querySelector<HTMLDialogElement>('dialog.detail');
const q = <T extends Element = HTMLElement>(s: string): T => dlg!.querySelector<T>(s)!;

let items: Item[] = [];
let idx = 0;
let trigger: HTMLElement | null = null;
let pz: PanzoomObject | null = null;
let fit = 1;
let loadToken = 0;
let byKeyboard = false;
let rafTime = 0;

const stage = q('[data-dt-stage]');
const canvas = q('[data-dt-canvas]');
const flip = q('[data-dt-flip]');
const box = q('[data-dt-item]');
const img = q<HTMLImageElement>('[data-dt-img]');
const vid = q<HTMLVideoElement>('[data-dt-video]');
const poster = q<HTMLCanvasElement>('[data-dt-poster]');
const phLabel = q('[data-dt-ph-label]');
const zoomChip = q('[data-dt-zoom]');
const panel = q('[data-dt-panel]');
const mediaTools = q('[data-dt-mediatools]');
const scrub = q<HTMLInputElement>('[data-dt-scrub]');
const timeEl = q('[data-dt-time]');
const tpl = (k: string, vars: Record<string, string | number>) =>
  (dlg!.dataset[k] ?? '').replace(/\{(\w+)\}/g, (m, n: string) => (n in vars ? String(vars[n]) : m));

// ────────────────────────────── collecting figures ──────────────────────────────

function kindOfFmt(fmt: string): Kind {
  return fmt === 'GIF' ? 'gif' : fmt === 'MP4' ? 'video' : 'image';
}

function levelOf(el: Element): { href: string; text: string } | null {
  // the nearest titled part of the sheet: a case chapter (section#id, its h2), or on About the love the figure belongs
  // to (article#historical-fiction…, her h3) rather than the band around it (integration: WP6 review note)
  const sec = el.closest<HTMLElement>('article[id][aria-labelledby], section[id]');
  const block = el.closest<HTMLElement>('.blk[id], [id].blk--run') ?? el.closest<HTMLElement>('[id]');
  const sheet = document.querySelector('.sheetno')?.textContent?.trim() ?? '';
  const label = sec ? (document.getElementById(`${sec.id}-h`)?.textContent ?? sec.querySelector('h2')?.textContent ?? '').trim() : '';
  if (!block && !sec) return null;
  const text = [sheet, label].filter(Boolean).join(' · ');
  return text ? { href: `#${(block ?? sec)!.id}`, text } : null;
}

/** Her nearest block heading (h3 of an `h` block) above the element, inside its chapter / section. */
function headingOf(el: Element): string {
  const sec = el.closest<HTMLElement>('section[id], article[id]');
  if (!sec) return '';
  let found = '';
  for (const h of sec.querySelectorAll<HTMLElement>('h3[id]')) {
    if (h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) found = (h.textContent ?? '').trim();
    else break;
  }
  return found;
}

function fromPlate(plate: HTMLElement): Item {
  const [w, h] = (plate.dataset.native ?? '0×0').split('×').map(Number);
  const fmt = plate.dataset.fmt ?? '';
  const media = plate.querySelector<HTMLImageElement | HTMLVideoElement>('.plate__view > .plate__media:last-of-type, .plate__media');
  const capId = plate.dataset.capId;
  const tplCap = plate.querySelector<HTMLTemplateElement>('template[data-cap]');
  const capSrc = capId ? document.getElementById(capId) : null;
  return {
    el: plate,
    plate,
    src: plate.dataset.srcOrig ?? '',
    kind: kindOfFmt(fmt),
    w, h,
    file: plate.dataset.file ?? '',
    fmt,
    size: plate.dataset.size ?? '',
    fig: plate.dataset.figNo ?? '',
    alt: (media?.getAttribute('alt') ?? media?.getAttribute('aria-label') ?? '') || '',
    cap: () => {
      if (capSrc) { const f = document.createDocumentFragment(); for (const n of capSrc.childNodes) f.append(n.cloneNode(true)); return f; }
      return tplCap ? tplCap.content.cloneNode(true) : null;
    },
    capText: (capSrc?.textContent ?? tplCap?.content.textContent ?? '').trim(),
    back: levelOf(plate),
    ctx: headingOf(plate),
    poster: Number(plate.querySelector<HTMLElement>('img[data-gif]')?.dataset.poster ?? 0),
    sound: !!plate.querySelector('[data-mc-sound]'),
    zoom: plate.dataset.zoom ?? '',
  };
}

/** Another package's element (the home Viewport's box): its file, its layers and the facts label it carries. */
function fromForeign(el: Element): Item | null {
  const layers = [...el.querySelectorAll<HTMLImageElement | HTMLVideoElement>('img, video')];
  const top = layers[layers.length - 1];
  const file = (el as HTMLElement).dataset.file ?? '';
  if (!top || !file) return null;
  const src = top.getAttribute('src') ?? (top as HTMLElement).dataset.src ?? '';
  const host = el.closest<HTMLElement>('[data-ph], [data-dims]');
  const label = host?.dataset.ph ?? host?.dataset.dims ?? '';
  const [dims = '', fmt = '', size = ''] = label.split(' · ');
  const [w, h] = dims.split('×').map((s) => Number(s.trim()));
  return {
    el, plate: null, src: src.split('#')[0], kind: kindOfFmt(fmt || (file.endsWith('.mp4') ? 'MP4' : file.endsWith('.gif') ? 'GIF' : '')),
    w: w || Number(top.getAttribute('width')) || 0, h: h || Number(top.getAttribute('height')) || 0,
    file, fmt, size, fig: host?.dataset.no ?? '', alt: (el as HTMLElement).dataset.alt ?? '', cap: () => null, capText: '',
    back: host?.dataset.href ? { href: host.dataset.href, text: host.dataset.no ?? '' } : null,
    poster: Number(host?.querySelector<HTMLElement>('[data-frame]')?.dataset.frame ?? 0), sound: false, zoom: '',
  };
}

function collect(el: Element): { list: Item[]; at: number } {
  const plate = el.closest<HTMLElement>('[data-plate]');
  if (plate && plate.closest('main') && plate.dataset.figNo) {
    const plates = [...document.querySelectorAll<HTMLElement>('main [data-plate][data-fig-no]')].filter((p) => p.querySelector('[data-fig]'));
    const list = plates.map(fromPlate);
    const at = Math.max(0, plates.indexOf(plate));
    return { list, at };
  }
  if (plate) return { list: [fromPlate(plate)], at: 0 };
  const f = fromForeign(el);
  return { list: f ? [f] : [], at: 0 };
}

// ────────────────────────────── pan / zoom ──────────────────────────────

const css = (name: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

/**
 * Centre the native-size box on the canvas with MARGINS, not left/top: panzoom's focal-point math (wheel zoom,
 * zoomToPoint) measures the element from its parent's content origin plus its margins, so a left/top offset would
 * make every zoom-at-the-pointer drift away from the pointer.
 */
function centre(cw: number, ch: number, item: Item): void {
  box.style.marginLeft = `${(cw - item.w) / 2}px`;
  box.style.marginTop = `${(ch - item.h) / 2}px`;
}

function layout(item: Item): void {
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  const margin = cw < 768 ? 12 : 32;
  fit = Math.min(1, (cw - 2 * margin) / item.w, (ch - 2 * margin) / item.h);
  box.style.width = `${item.w}px`;
  box.style.height = `${item.h}px`;
  centre(cw, ch, item);
  // the void's label is set at the file's native size; keep it legible at fit
  phLabel.style.transform = `scale(${1 / Math.max(fit, 0.05)})`;
  const max = Math.max(2 * fit, 1);
  if (!pz) {
    pz = Panzoom(box, {
      minScale: fit, maxScale: max, startScale: fit, step: 0.28,
      animate: false, duration: parseFloat(css('--dur-2', '180')) || 180, easing: css('--ease-ui', 'ease'),
      // canvas: a drag or pinch may start anywhere on the stage, not only on the image (the dark surround shows
      // whenever an edge is in view); the cursor is ours (CSS: zoom-in at fit, grab once zoomed)
      canvas: true, cursor: '', panOnlyWhenZoomed: true,
      handleStartEvent: (e: Event) => { e.preventDefault(); },
    });
    box.addEventListener('panzoomchange', onZoom as EventListener);
  } else {
    pz.setOptions({ minScale: fit, maxScale: max, startScale: fit });
  }
  pz.zoom(fit, { animate: false, force: true });
  pz.pan(0, 0, { animate: false, force: true });
  onZoom();
}

function onZoom(): void {
  if (!pz) return;
  const s = pz.getScale();
  zoomChip.textContent = `${Math.round(s * 100)}%`;
  const atFit = s <= fit * 1.01;
  canvas.toggleAttribute('data-zoomed', !atFit);
  q<HTMLButtonElement>('[data-dt-act="fit"]').disabled = atFit;
  q<HTMLButtonElement>('[data-dt-act="out"]').disabled = atFit;
  q<HTMLButtonElement>('[data-dt-act="in"]').disabled = s >= Math.max(2 * fit, 1) * 0.99;
  q<HTMLButtonElement>('[data-dt-act="one"]').disabled = Math.abs(s - 1) < 0.01 || fit >= 1;
}

const zoomed = (): boolean => !!pz && pz.getScale() > fit * 1.01;

function zoomTo(scale: number, point?: { clientX: number; clientY: number }): void {
  if (!pz) return;
  const animate = motionOK() && !byKeyboard;
  if (scale <= fit * 1.001) { pz.zoom(fit, { animate }); pz.pan(0, 0, { animate, force: true }); return; }
  if (point) pz.zoomToPoint(scale, point, { animate });
  else pz.zoom(scale, { animate });
}

// ────────────────────────────── media ──────────────────────────────

const setMedia = (state: 'loading' | 'ready' | 'playing' | 'paused') => {
  box.dataset.state = state;
  mediaTools.toggleAttribute('data-playing', state === 'playing');
  const t = q<HTMLButtonElement>('[data-dt-act="toggle"]');
  t.setAttribute('aria-label', (state === 'playing' ? t.dataset.labelPause : t.dataset.labelPlay) ?? '');
};

function clearMedia(): void {
  loadToken++;
  img.hidden = true;
  img.removeAttribute('src');
  img.alt = '';
  vid.pause();
  vid.hidden = true;
  if (vid.getAttribute('src')) { vid.removeAttribute('src'); vid.load(); }
  poster.hidden = true;
  poster.width = 0;
  poster.height = 0;
  cancelAnimationFrame(rafTime);
}

async function drawPosterNative(item: Item, token: number): Promise<boolean> {
  const D = (window as unknown as { ImageDecoder?: new (i: { data: ReadableStream<Uint8Array>; type: string }) => { decode(o: { frameIndex: number }): Promise<{ image: CanvasImageSource & { close(): void } }>; close(): void } }).ImageDecoder;
  if (!D) return false;
  try {
    const res = await fetch(item.src);
    if (!res.body || token !== loadToken) return false;
    const dec = new D({ data: res.body, type: 'image/gif' });
    const { image } = await dec.decode({ frameIndex: item.poster });
    if (token !== loadToken) { image.close(); dec.close(); return false; }
    poster.width = item.w;
    poster.height = item.h;
    poster.getContext('2d')?.drawImage(image, 0, 0, item.w, item.h);
    image.close();
    dec.close();
    return true;
  } catch {
    return false;
  }
}

function fmtTime(s: number): string {
  if (!isFinite(s)) return '0:00';
  const t = Math.floor(s);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

function tickTime(): void {
  if (vid.hidden) return;
  const d = vid.duration || 0;
  if (d && document.activeElement !== scrub) scrub.value = String(Math.round((vid.currentTime / d) * 1000));
  timeEl.textContent = `${fmtTime(vid.currentTime)} / ${fmtTime(d)}`;
  if (!vid.paused) rafTime = requestAnimationFrame(tickTime);
}

function loadMedia(item: Item): void {
  clearMedia();
  const token = loadToken;
  setMedia('loading');
  phLabel.textContent = [`${item.w} × ${item.h}`, item.fmt, item.size].filter(Boolean).join(' · ');
  const isVideo = item.kind === 'video';
  mediaTools.hidden = item.kind === 'image';
  q('[data-dt-speed]').hidden = !isVideo;
  scrub.hidden = !isVideo;
  timeEl.hidden = !isVideo;
  const mute = q<HTMLButtonElement>('[data-dt-act="mute"]');
  mute.hidden = !(isVideo && item.sound);
  if (isVideo) {
    vid.hidden = false;
    vid.muted = true; // sound only on an explicit Unmute (the one file with audio)
    mute.setAttribute('aria-pressed', 'false');
    mute.setAttribute('aria-label', mute.dataset.labelUnmute ?? '');
    vid.loop = true;
    vid.playbackRate = 1;
    for (const b of dlg!.querySelectorAll<HTMLElement>('[data-dt-rate]')) b.setAttribute('aria-checked', String(b.dataset.dtRate === '1'));
    // the one narrated video (38 MB, remote) waits on its first frame: its sound is the point, so it never starts by
    // itself, and only its metadata + first frame load until the reader presses Play
    vid.preload = item.sound ? 'metadata' : 'auto';
    vid.src = item.sound ? `${item.src}#t=0.001` : item.src;
    vid.setAttribute('aria-label', item.alt);
    vid.addEventListener('loadeddata', () => {
      if (token !== loadToken) return;
      setMedia('paused');
      if (motionOK() && !item.sound) vid.play().catch(() => {});
      tickTime();
    }, { once: true });
    return;
  }
  img.alt = item.alt;
  img.setAttribute('width', String(item.w));
  img.setAttribute('height', String(item.h));
  img.src = item.src;
  const reveal = () => {
    if (token !== loadToken) return;
    img.hidden = false;
    if (item.kind === 'gif' && !motionOK()) { pauseGif(item, token); return; }
    setMedia(item.kind === 'gif' ? 'playing' : 'ready');
  };
  if (img.complete && img.naturalWidth) reveal();
  else img.decode().then(reveal, () => img.addEventListener('load', reveal, { once: true }));
}

function pauseGif(item: Item, token = loadToken): void {
  setMedia('paused');
  drawPosterNative(item, token).then((ok) => {
    if (!ok || token !== loadToken) return;
    poster.hidden = false;
    img.removeAttribute('src');
    img.hidden = true;
  });
}

function toggleMedia(): void {
  const item = items[idx];
  if (!item) return;
  if (item.kind === 'video') {
    if (vid.paused) { vid.play().catch(() => {}); } else vid.pause();
    return;
  }
  if (item.kind === 'gif') {
    if (box.dataset.state === 'playing') pauseGif(item);
    else { poster.hidden = true; img.hidden = false; img.src = item.src; setMedia('playing'); }
  }
}

function restartMedia(): void {
  const item = items[idx];
  if (!item) return;
  if (item.kind === 'video') { vid.currentTime = 0; vid.play().catch(() => {}); return; }
  if (item.kind === 'gif') {
    poster.hidden = true;
    img.removeAttribute('src');
    requestAnimationFrame(() => { img.src = item.src; img.hidden = false; setMedia('playing'); });
  }
}

vid.addEventListener('play', () => { setMedia('playing'); tickTime(); });
vid.addEventListener('pause', () => { if (!vid.hidden && vid.getAttribute('src')) setMedia('paused'); });
scrub.addEventListener('input', () => { const d = vid.duration || 0; if (d) { vid.currentTime = (Number(scrub.value) / 1000) * d; tickTime(); } });

// ────────────────────────────── the panel ──────────────────────────────

function fillPanel(item: Item): void {
  q('[data-dt-fig]').textContent = item.fig || item.file;
  q('[data-dt-count]').textContent = items.length > 1 ? tpl('tCount', { i: idx + 1, n: items.length }) : '';
  const cap = q('[data-dt-cap]');
  cap.replaceChildren();
  const c = item.cap();
  if (c) cap.append(c);
  q('[data-dt-handle-fig]').textContent = item.fig || item.file;
  const ctx = q('[data-dt-ctx]');
  ctx.textContent = item.ctx ?? '';
  ctx.hidden = !item.ctx;
  q('[data-dt-handle-cap]').textContent = item.capText || item.ctx || '';
  q('[data-dt-file]').textContent = item.file;
  q('[data-dt-native]').textContent = tpl('tPx', { w: item.w, h: item.h });
  q('[data-dt-size]').textContent = [item.size, item.fmt].filter(Boolean).join(' · ');
  const back = q<HTMLAnchorElement>('[data-dt-back]');
  back.hidden = !item.back;
  if (item.back) {
    back.href = item.back.href;
    q('[data-dt-back-t]').textContent = item.back.text;
    back.setAttribute('aria-label', tpl('tBack', { where: item.back.text }));
  }
  // deep-zoom showpieces put the 1:1 forward; soft ones never advertise legibility at 1:1
  const one = q<HTMLElement>('[data-dt-act="one"]');
  one.toggleAttribute('data-emph', item.zoom === 'deep');
  q<HTMLButtonElement>('[data-dt-act="prev"]').disabled = items.length < 2;
  q<HTMLButtonElement>('[data-dt-act="next"]').disabled = items.length < 2;
}

function show(i: number): void {
  if (!items.length) return;
  idx = (i + items.length) % items.length;
  const item = items[idx];
  fillPanel(item);
  layout(item);
  loadMedia(item);
}

// ────────────────────────────── open / close ──────────────────────────────

function flipFrom(el: Element): void {
  const src = (el.querySelector('.plate__view') ?? el).getBoundingClientRect();
  if (!src.width || !pz) return;
  const c = canvas.getBoundingClientRect();
  const item = items[idx];
  const tw = item.w * fit;
  const th = item.h * fit;
  const tl = c.left + (c.width - tw) / 2;
  const tt = c.top + (c.height - th) / 2;
  const s = src.width / tw;
  const tx = src.left - c.left - (tl - c.left) * s;
  const ty = src.top - c.top - (tt - c.top) * s;
  const dur = parseFloat(css('--dur-2', '180')) || 180;
  const ease = css('--ease-pen', 'ease-out');
  flip.animate([{ transform: `translate(${tx}px, ${ty}px) scale(${s})` }, { transform: 'none' }], { duration: dur, easing: ease });
  dlg!.animate([{ backgroundColor: 'transparent' }, { backgroundColor: getComputedStyle(dlg!).backgroundColor }], { duration: dur, easing: ease });
  panel.animate([{ transform: `translateX(${css('--s-4', '16px')})`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: dur, easing: ease });
}

export function open(el: Element, from?: HTMLElement | null): void {
  cssReady.then(() => openStyled(el, from));
}

function openStyled(el: Element, from?: HTMLElement | null): void {
  if (!dlg) return;
  const { list, at } = collect(el);
  if (!list.length) return;
  items = list;
  trigger = from ?? null;
  byKeyboard = !!from && from.matches(':focus-visible');
  if (!dlg.open) dlg.showModal();
  setHold(true);
  panel.removeAttribute('data-open');
  q('[data-dt-handle]').setAttribute('aria-expanded', 'false');
  show(at);
  if (motionOK() && !byKeyboard && list[at].plate) flipFrom(list[at].el);
  // focus lands on the FIG heading for screen readers; its ring shows only once the reader Tabs back to it (a shortcut
  // key after opening must not box the heading)
  const head = q('[data-dt-fig]');
  head.setAttribute('data-autofocus', '');
  head.focus({ preventScroll: true });
}

function close(): void {
  if (dlg?.open) dlg.close();
}

dlg?.addEventListener('close', () => {
  clearMedia();
  setHold(false);
  const plate = items[idx]?.plate;
  items = [];
  const back = trigger && trigger.isConnected && trigger.getClientRects().length ? trigger
    : plate?.querySelector<HTMLElement>('[data-mc-enlarge]') ?? plate?.querySelector<HTMLElement>('[data-fig]') ?? null;
  back?.focus({ preventScroll: true });
  trigger = null;
});

// ────────────────────────────── input ──────────────────────────────

dlg?.addEventListener('click', (e) => {
  const t = e.target instanceof Element ? e.target : null;
  const b = t?.closest<HTMLElement>('[data-dt-act], [data-dt-rate], [data-dt-handle], [data-dt-back]');
  if (!b) return;
  byKeyboard = e.detail === 0; // a keyboard "click" on a button never animates
  if (b.matches('[data-dt-handle]')) {
    const open = !panel.hasAttribute('data-open');
    panel.toggleAttribute('data-open', open);
    b.setAttribute('aria-expanded', String(open));
    return;
  }
  if (b.matches('[data-dt-back]')) {
    e.preventDefault();
    const href = (b as HTMLAnchorElement).getAttribute('href') ?? '';
    const plate = items[idx]?.plate;
    close();
    if (href.startsWith('#')) {
      const target = plate ?? document.querySelector(href);
      target?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
    } else if (href) location.href = href;
    return;
  }
  if (b.matches('[data-dt-rate]')) {
    vid.playbackRate = Number(b.dataset.dtRate);
    for (const r of dlg.querySelectorAll<HTMLElement>('[data-dt-rate]')) r.setAttribute('aria-checked', String(r === b));
    return;
  }
  switch (b.dataset.dtAct) {
    case 'close': close(); break;
    case 'prev': show(idx - 1); break;
    case 'next': show(idx + 1); break;
    case 'fit': zoomTo(fit); break;
    case 'one': zoomTo(1); break;
    case 'in': pz?.zoomIn({ animate: motionOK() && !byKeyboard }); break;
    case 'out': if (pz && pz.getScale() / 1.28 <= fit) zoomTo(fit); else pz?.zoomOut({ animate: motionOK() && !byKeyboard }); break;
    case 'toggle': toggleMedia(); break;
    case 'restart': restartMedia(); break;
    case 'mute': {
      vid.muted = !vid.muted;
      b.setAttribute('aria-pressed', String(!vid.muted));
      b.setAttribute('aria-label', (vid.muted ? b.dataset.labelUnmute : b.dataset.labelMute) ?? '');
      break;
    }
  }
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  byKeyboard = false;
  if (!pz) return;
  if (e.deltaY > 0 && pz.getScale() <= fit * 1.001) return;
  pz.zoomWithWheel(e);
  if (pz.getScale() <= fit * 1.001) pz.pan(0, 0, { force: true });
}, { passive: false });

canvas.addEventListener('dblclick', (e) => {
  byKeyboard = false;
  if (!pz) return;
  if (zoomed()) zoomTo(fit);
  else zoomTo(Math.max(1, fit * 2 > 1 ? fit * 2 : 1), { clientX: e.clientX, clientY: e.clientY });
});

// swipe between figures at fit scale (panzoom pans only when zoomed)
let sx = 0, sy = 0, st = 0, pid = -1;
canvas.addEventListener('pointerdown', (e) => { if (zoomed() || e.pointerType === 'mouse') return; sx = e.clientX; sy = e.clientY; st = performance.now(); pid = e.pointerId; });
canvas.addEventListener('pointerup', (e) => {
  if (e.pointerId !== pid) return;
  pid = -1;
  const dx = e.clientX - sx, dy = e.clientY - sy;
  if (!zoomed() && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4 && performance.now() - st < 600) show(idx + (dx < 0 ? 1 : -1));
});

dlg?.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target as HTMLElement;
  if (e.key === 'Tab') q('[data-dt-fig]').removeAttribute('data-autofocus');
  if (t === scrub) return; // the range owns its arrows
  byKeyboard = true;
  const onButton = t.closest('button, a[href]') != null;
  const step = Math.round(canvas.clientWidth * 0.1);
  switch (e.key) {
    case 'ArrowRight': e.preventDefault(); if (zoomed()) pz?.pan(-step, 0, { relative: true }); else show(idx + 1); break;
    case 'ArrowLeft': e.preventDefault(); if (zoomed()) pz?.pan(step, 0, { relative: true }); else show(idx - 1); break;
    case 'ArrowUp': if (zoomed()) { e.preventDefault(); pz?.pan(0, step, { relative: true }); } break;
    case 'ArrowDown': if (zoomed()) { e.preventDefault(); pz?.pan(0, -step, { relative: true }); } break;
    case '+': case '=': e.preventDefault(); pz?.zoomIn({ animate: false }); break;
    case '-': case '_': e.preventDefault(); if (pz && pz.getScale() / 1.28 <= fit) zoomTo(fit); else pz?.zoomOut({ animate: false }); break;
    case '0': e.preventDefault(); zoomTo(fit); break;
    case '1': e.preventDefault(); zoomTo(1); break;
    case 'Home': e.preventDefault(); show(0); break;
    case 'End': e.preventDefault(); show(items.length - 1); break;
    case ' ': if (!onButton && items[idx]?.kind !== 'image') { e.preventDefault(); toggleMedia(); } break;
  }
});

/**
 * The stage changes size with the window AND with the mobile sheet (72px ↔ 50vh, animated): at fit the figure re-fits
 * every frame of that change; zoomed, the reader's scale and pan are kept and only the frame of reference moves.
 */
function relayout(): void {
  const item = items[idx];
  if (!dlg?.open || !item || !pz) return;
  if (!zoomed()) { layout(item); return; }
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  const margin = cw < 768 ? 12 : 32;
  fit = Math.min(1, (cw - 2 * margin) / item.w, (ch - 2 * margin) / item.h);
  centre(cw, ch, item);
  pz.setOptions({ minScale: fit, maxScale: Math.max(2 * fit, 1) });
  onZoom();
}
new ResizeObserver(() => relayout()).observe(canvas);
// once focus has left the FIG heading, coming back to it (Shift+Tab) shows the ring as usual
dlg?.querySelector('[data-dt-fig]')?.addEventListener('blur', (e) => (e.currentTarget as HTMLElement).removeAttribute('data-autofocus'));
