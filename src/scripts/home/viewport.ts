/**
 * viewport.ts · OWNER: WP3 (SPEC SM2). The Drawing index ↔ Viewport link on Home.
 *
 * Activation (≥ 1024, where the Viewport is displayed):
 *   pointer   pointerenter on a row = hover intent (its stills start loading); it activates after a 60 ms dwell.
 *             Leaving the list keeps the last row active.
 *   keyboard  focus within a row activates it at once. J / K (shortcuts on, index on screen) move focus to the
 *             next / previous row with an instant scroll (keyboard actions never animate), bringing the index into
 *             place first (its header under the title bar) if it is still low on screen. A row focused from the
 *             keyboard keeps the Viewport while it is on screen (the band stands down) and until the pointer really
 *             moves (rows sliding under a resting pointer are not hover intent).
 *   scroll    with no pointer over the list, the row crossing the band at 45% of the viewport activates
 *             (IntersectionObserver, rootMargin -45% 0px -54% 0px).
 *   press     pointerdown on a row swaps instantly, so the cross-document view transition morphs from its plate (a
 *             press on the preview itself lands a running wipe the same way).
 *   default   A-101.
 * Swap: load + decode the new plate (drafting-X placeholder after 120 ms), then a clip-path wipe with the rust
 * dash-dot cut riding its leading edge (--dur-3, --ease-pen); the panels cross-fade (--dur-1); view-transition-name
 * plate-<slug> moves to the new plate; `sv:plate {slug}` fires. Reduced motion / Motion off / fast scroll → instant.
 * Loading: data-src layers load on intent or activation. The CSBS GIF mounts only while A-103 is active (unmounted
 * 10 s after); C-100's video plays muted in a loop only while active and only with motion on. Paused or under
 * reduced motion, the GIF shows its staging poster frame (ImageDecoder) or the drafting X.
 */
import { emit } from '../core/bus';
import { registerShortcut } from '../core/keys';
import { observe } from '../core/io';
import { on as onPref, get as getPref } from '../core/prefs';

type Mode = 'anim' | 'instant';
type Media = HTMLImageElement | HTMLVideoElement;
const DWELL = 60;
const PH_AFTER = 120;
const PARK_AFTER = 10_000;
const FAST = 3; // viewports per second (§2.7 law 5: fast-scroll bypass)

const $$ = <T extends Element>(sel: string, root: ParentNode) => Array.from(root.querySelectorAll<T>(sel));
const wait = (t: number) => new Promise<void>((r) => setTimeout(r, t));
const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const toMs = (v: string) => (v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000) || 0;
type Decoder = { decode(o: { frameIndex: number }): Promise<{ image: VideoFrame }>; close(): void };
type DecoderCtor = new (init: { data: ReadableStream<Uint8Array>; type: string }) => Decoder;

export function initViewport(): void {
  const vp = document.querySelector<HTMLElement>('[data-vp]');
  const list = document.querySelector<HTMLElement>('[data-dix-list]');
  const section = list?.closest<HTMLElement>('[data-dix]');
  if (!vp || !list || !section || vp.dataset.ready) return;
  vp.dataset.ready = '1';

  const desktop = matchMedia('(min-width: 1024px)');
  const rows = $$<HTMLElement>('[data-ix]', list);
  const keyOf = (row: HTMLElement) => row.dataset.ix!;
  const linkOf = (row: HTMLElement) => row.querySelector<HTMLAnchorElement>('a')!;
  const plates = new Map($$<HTMLElement>('[data-vp-plate]', vp).map((p) => [p.dataset.vpPlate!, p]));
  const panels = new Map($$<HTMLElement>('[data-vp-panel]', vp).map((p) => [p.dataset.vpPanel!, p]));
  const one = <T extends HTMLElement>(sel: string) => vp.querySelector<T>(sel)!;
  const stage = one('[data-vp-stage]');
  const ph = one('[data-vp-ph]');
  const phLabel = one('[data-vp-ph-l]');
  const cut = one('[data-vp-cut]');
  const noEl = one('[data-vp-no]');
  const dimsEl = one('[data-vp-dims]');
  const enlarge = one<HTMLButtonElement>('[data-vp-enlarge]');
  const pauseBtn = one<HTMLButtonElement>('[data-vp-pause]');
  const pauseLabel = one('[data-vp-pause-l]');
  const hit = one<HTMLAnchorElement>('[data-vp-hit]');

  let active = vp.dataset.active!; // the sheet the Viewport shows (or is wiping to)
  let shown = active;              // the plate fully on screen underneath any wipe
  let run = 0;                     // activation counter: a newer activation supersedes an older one
  let anims: Animation[] = [];
  let wiping = '';                 // the plate a running wipe is bringing in
  let userPaused = false;
  let pointerIn = false;
  let dwell = 0;
  let fastUntil = 0;
  let kbdLock = false; // hover stands down after keyboard focus until the pointer really moves
  let px = -1;
  let py = -1;
  const parked = new Map<string, number>();
  const moving = () => getPref('motion') === 'full' && !userPaused;

  // ───────────────────────────── media ─────────────────────────────
  const media = (key: string): Media[] => [
    ...$$<Media>('[data-vp-media]', plates.get(key) ?? document.createDocumentFragment()),
    ...$$<Media>('[data-vp-media]', panels.get(key) ?? document.createDocumentFragment()),
  ];
  const isGif = (el: Element): el is HTMLImageElement => el.hasAttribute('data-gif-layer');
  const isVideo = (el: Element): el is HTMLVideoElement => el instanceof HTMLVideoElement;
  const still = (el: Media) => !isGif(el) && !isVideo(el);
  const mount = (el: Media) => {
    const src = el.dataset.src;
    if (!src || el.getAttribute('src')) return;
    if (isVideo(el)) {
      el.preload = 'auto';
      el.src = src;
    } else {
      (el as HTMLImageElement).loading = 'eager';
      el.src = src;
    }
  };
  const unmount = (el: Media) => {
    if (!el.dataset.src || !el.getAttribute('src')) return;
    el.removeAttribute('src');
    if (isVideo(el)) el.load();
  };
  const decoded = (key: string) =>
    Promise.all(media(key).map((el) => {
      if (!el.getAttribute('src')) return undefined;
      if (isVideo(el)) {
        return el.readyState >= 2 ? undefined : new Promise<void>((r) => {
          el.addEventListener('loadeddata', () => r(), { once: true });
          el.addEventListener('error', () => r(), { once: true });
          setTimeout(r, 4000);
        });
      }
      return el.decode().catch(() => undefined);
    })).then(() => undefined);

  /** A still of a GIF: its staging poster frame (ImageDecoder), drawn on a canvas in the GIF's own box. */
  const poster = async (img: HTMLImageElement): Promise<boolean> => {
    const prev = img.nextElementSibling as HTMLElement | null;
    if (prev?.dataset.poster != null) { prev.hidden = false; return true; }
    const ID = (window as unknown as { ImageDecoder?: DecoderCtor }).ImageDecoder;
    if (!ID || !img.dataset.src) return false;
    try {
      const res = await fetch(img.dataset.src);
      const dec = new ID({ data: res.body!, type: 'image/gif' });
      const { image } = await dec.decode({ frameIndex: +(img.dataset.frame ?? 0) });
      const c = document.createElement('canvas');
      c.width = image.displayWidth;
      c.height = image.displayHeight;
      c.getContext('2d')!.drawImage(image as unknown as CanvasImageSource, 0, 0);
      image.close();
      dec.close();
      c.className = img.className;
      c.style.cssText = img.style.cssText;
      c.dataset.poster = '';
      img.after(c);
      return true;
    } catch {
      return false;
    }
  };

  /** Play / pause what moves on the active plate; park what stopped being active (10 s). */
  const sync = () => {
    const on = desktop.matches;
    let hasMoving = false;
    for (const key of plates.keys()) {
      const isActive = on && key === active;
      for (const el of media(key)) {
        if (isVideo(el)) {
          if (isActive) {
            hasMoving = true;
            mount(el);
            if (moving()) el.play().catch(() => undefined); else el.pause();
          } else el.pause();
        } else if (isGif(el) && isActive) {
          hasMoving = true;
          const posterEl = el.nextElementSibling as HTMLElement | null;
          if (moving()) {
            mount(el);
            if (posterEl?.dataset.poster != null) posterEl.hidden = true;
            if (shown === key) ph.hidden = true;
          } else {
            unmount(el);
            // held: its poster frame (ImageDecoder); the drafting X stands in until it is drawn, or for good without it
            if (posterEl?.dataset.poster == null && shown === key) { phLabel.textContent = plates.get(key)?.dataset.ph ?? ''; ph.hidden = false; }
            poster(el).then((ok) => { if (key === active && shown === key) ph.hidden = ok; });
          }
        }
      }
      const heavy = media(key).some((el) => !still(el) && el.getAttribute('src'));
      if (!isActive && heavy && !parked.has(key)) {
        parked.set(key, window.setTimeout(() => {
          parked.delete(key);
          if (key !== active || !desktop.matches) for (const el of media(key)) if (!still(el)) unmount(el);
        }, PARK_AFTER));
      }
      if (isActive && parked.has(key)) { clearTimeout(parked.get(key)); parked.delete(key); }
    }
    pauseBtn.hidden = !hasMoving || getPref('motion') !== 'full';
    pauseBtn.classList.toggle('is-paused', userPaused);
    pauseLabel.textContent = (userPaused ? pauseBtn.dataset.play : pauseBtn.dataset.pause) ?? '';
  };

  // ───────────────────────────── swap ─────────────────────────────
  const setVt = (key: string) => {
    for (const [k, p] of plates) {
      const box = p.querySelector<HTMLElement>('[data-vp-box]');
      if (box) box.style.viewTransitionName = k === key && p.dataset.vt ? p.dataset.vt : '';
    }
  };
  const settle = () => {
    for (const a of anims) a.cancel();
    anims = [];
    cut.getAnimations().forEach((a) => a.cancel());
  };
  const commit = (key: string) => {
    settle();
    wiping = '';
    for (const [k, p] of plates) {
      p.hidden = k !== key;
      p.classList.remove('is-incoming');
      p.style.clipPath = '';
    }
    shown = key;
    ph.hidden = true;
    setVt(key);
    sync();
  };

  const activate = async (key: string, mode: Mode) => {
    if (!plates.has(key) || !panels.has(key)) return;
    if (key === active && (mode === 'anim' || shown === key)) return;
    const me = ++run;
    const prev = active;
    active = key;
    vp.dataset.active = key;
    for (const r of rows) r.classList.toggle('is-active', keyOf(r) === key);
    const plate = plates.get(key)!;
    noEl.textContent = plate.dataset.no ?? '';
    dimsEl.textContent = plate.dataset.dims ?? '';
    enlarge.hidden = !plate.dataset.dims;
    // the preview is one link (control layer over the inert preview): it follows the sheet
    if (plate.dataset.href) hit.href = plate.dataset.href;
    if (plate.dataset.ext != null) { hit.target = '_blank'; hit.rel = 'noopener'; } else { hit.removeAttribute('target'); hit.removeAttribute('rel'); }
    panels.get(prev)?.classList.remove('is-active');
    panels.get(key)!.classList.add('is-active');
    if (!desktop.matches) { shown = key; return; }
    emit('sv:plate', { slug: key });
    for (const el of media(key)) if (still(el)) mount(el);

    if (mode === 'instant' || getPref('motion') !== 'full' || performance.now() < fastUntil) {
      commit(key);
      // no wipe to wait behind: while its pixels decode, the plate shows the drafting X with its file facts
      const slow = $$<Media>('[data-vp-media]', plate).some((el) => el.getAttribute('src') && !isVideo(el) && !(el as HTMLImageElement).complete);
      if (slow) {
        phLabel.textContent = plate.dataset.ph ?? '';
        ph.hidden = false;
        decoded(key).then(() => { if (me === run) ph.hidden = true; });
      }
      return;
    }
    // a wipe in flight lands at once, so the next one continues from it (no flash back to the older plate)
    if (wiping && wiping !== key) commit(wiping);
    settle();
    pauseBtn.hidden = true; // it belongs to the outgoing plate; sync() brings it back once a moving plate lands
    for (const [k, p] of plates) if (k !== shown && k !== key) { p.hidden = true; p.classList.remove('is-incoming'); p.style.clipPath = ''; }
    plate.hidden = false;
    plate.classList.add('is-incoming');
    plate.style.clipPath = 'inset(0 100% 0 0)';
    if (moving()) for (const el of media(key)) if (isGif(el)) mount(el);
    const loaded = decoded(key);
    const quick = await Promise.race([loaded.then(() => true), wait(PH_AFTER).then(() => false)]);
    if (me !== run) return;
    if (!quick) {
      phLabel.textContent = plate.dataset.ph ?? '';
      ph.hidden = false;
      await loaded;
      if (me !== run) return;
    }
    const duration = toMs(cssVar('--dur-3'));
    const easing = cssVar('--ease-pen') || 'ease-out';
    const w = stage.clientWidth;
    const wipe = plate.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }], { duration, easing, fill: 'forwards' });
    const line = cut.animate(
      [{ transform: 'translateX(0)', opacity: 1 }, { transform: `translateX(${w}px)`, opacity: 1, offset: 0.9 }, { transform: `translateX(${w}px)`, opacity: 0 }],
      { duration, easing },
    );
    anims = [wipe, line];
    wiping = key;
    try { await wipe.finished; } catch { return; }
    if (me === run) commit(key);
  };

  // ───────────────────────────── wiring ─────────────────────────────
  const moved = (e: PointerEvent) => Math.abs(e.clientX - px) + Math.abs(e.clientY - py) > 2;
  // a row reached from the keyboard: on desktop, first bring the index into place if it is still low on screen (its
  // header under the title bar, where #index lands, so the Viewport shows whole), then make sure the row shows
  const instant = { behavior: 'instant' as ScrollBehavior };
  let tabbing = false;
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    tabbing = true;
    setTimeout(() => { tabbing = false; });
  }, true);
  const place = (a: HTMLElement) => {
    if (desktop.matches) {
      const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      if (section.getBoundingClientRect().top > pad + 1) section.scrollIntoView({ block: 'start', ...instant });
    }
    a.scrollIntoView({ block: 'nearest', ...instant });
  };
  const intent = (row: HTMLElement) => {
    const key = keyOf(row);
    for (const el of media(key)) if (still(el)) mount(el); // hover intent: stills only, never the GIF or video
    clearTimeout(dwell);
    dwell = window.setTimeout(() => activate(key, 'anim'), DWELL);
  };
  for (const row of rows) {
    const key = keyOf(row);
    const a = linkOf(row);
    row.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'touch' || !desktop.matches) return;
      if (kbdLock) { if (!moved(e)) return; kbdLock = false; }
      intent(row);
    });
    row.addEventListener('pointerleave', () => clearTimeout(dwell));
    a.addEventListener('pointerdown', () => activate(key, 'instant'));
    a.addEventListener('focus', () => {
      if (a.matches(':focus-visible')) {
        kbdLock = true;
        clearTimeout(dwell);
        if (tabbing) place(a); // Tab (not a window regaining focus, which re-fires focus on the same row)
      }
      activate(key, 'instant');
    });
  }
  list.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') pointerIn = true; });
  list.addEventListener('pointerleave', () => { pointerIn = false; clearTimeout(dwell); });

  // the 45% band: activates the row crossing it while no pointer is over the list and no row focused from the
  // keyboard is on screen (the scroll a J / K / Tab causes must not hand the Viewport to another row)
  const keyboardHolds = () => {
    const f = document.activeElement as HTMLElement | null;
    if (!f || !list.contains(f) || !f.matches(':focus-visible')) return false;
    const r = f.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight;
  };
  for (const row of rows) {
    observe(row, (en) => {
      if (en.isIntersecting && !pointerIn && desktop.matches && !keyboardHolds()) activate(keyOf(row), 'anim');
    }, { rootMargin: '-45% 0px -54% 0px' });
  }

  // fast-scroll bypass
  let lastY = scrollY;
  let lastT = performance.now();
  addEventListener('scroll', () => {
    const t = performance.now();
    if ((Math.abs(scrollY - lastY) / innerHeight) * (1000 / Math.max(1, t - lastT)) > FAST) fastUntil = t + 200;
    lastY = scrollY;
    lastT = t;
  }, { passive: true });

  addEventListener('pointermove', (e) => {
    if (kbdLock && e.pointerType !== 'touch' && moved(e)) {
      // the pointer is moving again: the row under it (if any) is hover intent once more
      kbdLock = false;
      const row = (e.target as Element | null)?.closest?.<HTMLElement>('[data-ix]');
      if (row && list.contains(row) && desktop.matches) intent(row);
    }
    px = e.clientX;
    py = e.clientY;
  }, { passive: true });

  // J / K
  let indexOnScreen = false;
  observe(section, (en) => { indexOnScreen = en.isIntersecting; });
  const step = (dir: 1 | -1) => (e: KeyboardEvent) => {
    if (!indexOnScreen) return;
    e.preventDefault();
    const links = rows.map(linkOf);
    const at = links.indexOf(document.activeElement as HTMLAnchorElement);
    const from = at >= 0 ? at : rows.findIndex((r) => keyOf(r) === active) - dir;
    const next = links[Math.min(links.length - 1, Math.max(0, from + dir))];
    next.focus({ preventScroll: true });
    place(next);
  };
  registerShortcut('j', 'home', step(1), { preventDefault: false });
  registerShortcut('k', 'home', step(-1), { preventDefault: false });

  // ⤢ → Enlarged detail (WP4b opens it on sv:fig-open)
  enlarge.addEventListener('click', () => {
    const box = plates.get(active)?.querySelector('[data-vp-box]');
    if (box) emit('sv:fig-open', { el: box });
  });
  pauseBtn.addEventListener('click', () => { userPaused = !userPaused; sync(); });
  // clicking the preview mid-wipe: land the wipe first, so the view transition morphs from the plate being opened
  hit.addEventListener('pointerdown', () => { if (wiping || shown !== active) commit(active); });

  // Height budget: the sticky Viewport must fit under the index header, where it sticks. CSS sizes it from --_head
  // (that header) and --_rest (everything that is not the plate); measure both — the rest on the TALLEST panel, so
  // switching sheets never resizes the plate. A narrower Viewport wraps its text more (a larger rest), so settle from
  // the widest the column allows downwards: the first width whose rest no longer grows is the largest that fits.
  const panelBox = one('.vp__panels');
  const head = section.querySelector<HTMLElement>('.dix__head');
  const fit = () => {
    if (!desktop.matches) return;
    if (head) vp.style.setProperty('--_head', `${Math.ceil(head.offsetHeight)}px`);
    let prev = 0;
    vp.style.setProperty('--_rest', '0px');
    for (let i = 0; i < 5; i++) {
      const tallest = Math.max(...[...panels.values()].map((p) => p.offsetHeight));
      const rest = Math.ceil(vp.offsetHeight - stage.offsetHeight - panelBox.offsetHeight + tallest);
      if (rest <= prev) break;
      vp.style.setProperty('--_rest', `${rest}px`);
      prev = rest;
    }
  };
  let fitRaf = 0;
  addEventListener('resize', () => { cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(fit); });
  document.fonts.ready.then(fit);

  onPref('motion', sync);
  desktop.addEventListener('change', () => { fit(); if (desktop.matches) commit(active); else sync(); });
  setVt(active);
  sync();
}
