/**
 * viewport.ts · OWNER: WP3 (SPEC SM2). The Drawing index ↔ Viewport link on Home.
 *
 * Activation (≥ 1024, where the Viewport is displayed):
 *   pointer   pointerenter on a row = hover intent (its stills start loading); it activates after a 60 ms dwell.
 *             Leaving the list keeps the last row active. Only a pointer that really moves is hover intent: after any
 *             scroll (wheel, a jump to #index, J / K) or keyboard focus, rows sliding under a resting pointer do
 *             nothing (no activation, no hover well) until the pointer moves again; meanwhile the band leads.
 *   keyboard  focus within a row activates it at once. J / K (shortcuts on, index on screen) move focus to the
 *             next / previous row with an instant scroll (keyboard actions never animate), bringing the index into
 *             place first (its header under the title bar) if it is still low on screen. A row focused from the
 *             keyboard keeps the Viewport while it is on screen (the band stands down).
 *   scroll    with no live pointer over the list, the row crossing the reading line activates. The line is SM2's
 *             45% band once the list is being read, but it starts on A-101: while the index is at (or below) its
 *             landing place — the header under the title bar, where #index and "Selected Projects ↓" put it — A-101
 *             is the sheet; scrolling on, the line runs from A-101's middle down to 45% of the window (it gains
 *             on the rows at twice the scroll), so A-102 follows a short scroll later and the last rows are read
 *             at 45%, as with the IntersectionObserver band (rootMargin -45% 0px -54% 0px) it replaces.
 *   press     pointerdown on a row swaps instantly, so the cross-document view transition morphs from its plate (a
 *             press on the preview itself lands a running wipe the same way).
 *   default   A-101.
 * Swap: load + decode the new plate (drafting-X placeholder after 120 ms), then a clip-path wipe with the rust
 * dash-dot cut riding its leading edge (--dur-3, --ease-pen). The panel wipes with the plate (outgoing and incoming
 * clipped at the same edge, never overlaid), and the strip's sheet number changes when the wipe lands;
 * view-transition-name plate-<slug> moves to the new plate; `sv:plate {slug}` fires. Reduced motion / Motion off /
 * fast scroll / keyboard → instant.
 * Loading: data-src layers load on intent or activation. The CSBS GIF mounts only while A-103 is active (unmounted
 * 10 s after); C-100's video plays muted in a loop only while active and only with motion on. Paused or under
 * reduced motion, the GIF shows its staging poster frame (ImageDecoder) or the drafting X.
 */
import { emit } from '../core/bus';
import { registerShortcut } from '../core/keys';
import { observe, onVisibility } from '../core/io';
import { on as onPref, get as getPref } from '../core/prefs';

type Mode = 'anim' | 'instant';
type Media = HTMLImageElement | HTMLVideoElement;
const DWELL = 60;
const PH_AFTER = 120;
const PARK_AFTER = 10_000;
const FAST = 3; // viewports per second (§2.7 law 5: fast-scroll bypass)
const BAND = 0.45; // SM2's reading band, as a share of the window's height

const $$ = <T extends Element>(sel: string, root: ParentNode) => Array.from(root.querySelectorAll<T>(sel));
const wait = (t: number) => new Promise<void>((r) => setTimeout(r, t));
const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const toMs = (v: string) => (v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000) || 0;
type Decoder = { decode(o: { frameIndex: number }): Promise<{ image: VideoFrame }>; close(): void; completed?: Promise<void> };
type DecoderCtor = new (init: { data: ReadableStream<Uint8Array>; type: string }) => Decoder;

/** A still of a GIF: its staging poster frame (ImageDecoder), drawn on a canvas in the GIF's own box. */
const poster = async (img: HTMLImageElement): Promise<boolean> => {
  const prev = img.nextElementSibling as HTMLElement | null;
  if (prev?.dataset.poster != null) { prev.hidden = false; return true; }
  const ID = (window as unknown as { ImageDecoder?: DecoderCtor }).ImageDecoder;
  if (!ID || !img.dataset.src) return false;
  try {
    const stop = new AbortController();
    const res = await fetch(img.dataset.src, { signal: stop.signal });
    const dec = new ID({ data: res.body!, type: 'image/gif' });
    dec.completed?.catch(() => undefined);
    const { image } = await dec.decode({ frameIndex: +(img.dataset.frame ?? 0) });
    const c = document.createElement('canvas');
    c.width = image.displayWidth;
    c.height = image.displayHeight;
    c.getContext('2d')!.drawImage(image as unknown as CanvasImageSource, 0, 0);
    image.close();
    dec.close();
    stop.abort(); // the frame is drawn: the rest of the file is not needed
    c.className = img.className;
    c.style.cssText = img.style.cssText;
    c.dataset.poster = '';
    img.after(c);
    return true;
  } catch {
    return false;
  }
};
const isGif = (el: Element): el is HTMLImageElement => el.hasAttribute('data-gif-layer');

/**
 * Card plates (< 1024; SM2 "Loading"): a card's stills get their src only once the card itself is on screen (not the
 * browser's lazy margin, which would fetch every cover on a tablet). A card is a link, so it can carry no pause
 * control: the CSBS GIF is never mounted there. Once its card is on screen it shows the GIF's staging poster frame
 * (ImageDecoder, the download stopped once that frame is decoded), with the drafting X and its file facts meanwhile,
 * or for good where ImageDecoder is missing. The moving original lives on the Viewport (≥ 1024) and the case page.
 * At ≥ 1024 the card plates are display:none and never intersect.
 */
export function initCards(): void {
  for (const card of $$<HTMLElement>('[data-card-plate]', document)) {
    const ph = card.querySelector<HTMLElement>('[data-card-ph]');
    const off = onVisibility(card, (on) => {
      if (!on) return;
      off();
      for (const img of $$<HTMLImageElement>('[data-card-media]', card)) {
        if (img.hasAttribute('data-gif-layer')) poster(img).then((ok) => { if (ph) ph.hidden = ok; });
        else img.src = img.dataset.src!;
      }
    });
  }
}

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
  // the rows the Viewport previews: every sheet but the external ones (Architecture Portfolio ↗, Resume ↗), whose
  // rows leave the Viewport on the last sheet it showed (they have no plate)
  const seen = rows.filter((r) => plates.has(keyOf(r)));
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
  // the keyboard twins of ⤢ and Pause (a11y r1): real buttons that ride in the active row, after its link
  const kbd = vp.querySelector<HTMLTemplateElement>('template[data-vp-kbd]')?.content.firstElementChild?.cloneNode(true) as HTMLElement | undefined;
  const kPause = kbd?.querySelector<HTMLButtonElement>('[data-vp-kbd-pause]');
  const kEnl = kbd?.querySelector<HTMLButtonElement>('[data-vp-kbd-enlarge]');

  let active = vp.dataset.active!; // the sheet the Viewport shows (or is wiping to)
  let shown = active;              // the plate fully on screen underneath any wipe
  let run = 0;                     // activation counter: a newer activation supersedes an older one
  let anims: Animation[] = [];
  let wiping = '';                 // the plate a running wipe is bringing in
  let userPaused = false;
  let pointerIn = false;
  let dwell = 0;
  let fastUntil = 0;
  // the pointer is "at rest": nothing has really moved it since the page loaded, scrolled, or a row took keyboard
  // focus. Rows that slide under a resting pointer are not hover intent (no dwell, no hover well: [data-rest]).
  let rest = false;
  let px = -1;
  let py = -1;
  const setRest = (on: boolean) => {
    if (rest === on) return;
    rest = on;
    list.toggleAttribute('data-rest', on);
  };
  setRest(true);
  const parked = new Map<string, number>();
  const moving = () => getPref('motion') === 'full' && !userPaused;

  // ───────────────────────────── media ─────────────────────────────
  const media = (key: string): Media[] => [
    ...$$<Media>('[data-vp-media]', plates.get(key) ?? document.createDocumentFragment()),
    ...$$<Media>('[data-vp-media]', panels.get(key) ?? document.createDocumentFragment()),
  ];
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
    twins();
  };
  /**
   * The keyboard twins follow the active row: they sit in its <li> right after its link, so a Tab from the row that
   * started a GIF or video reaches its Pause, then Enlarge ("Pause A-103 preview", pressed while paused). They mirror
   * the drawn controls' hidden state; a twin that holds focus is never hidden or moved from under it.
   */
  function twins(): void {
    if (!kbd || !kPause || !kEnl) return;
    const row = desktop.matches ? rows.find((r) => keyOf(r) === active) : undefined;
    const focused = kbd.contains(document.activeElement);
    if (!row) { if (!focused) kbd.remove(); return; }
    if (kbd.parentElement !== row && !focused) row.append(kbd);
    if (kbd.parentElement !== row) return;
    const no = plates.get(active)?.dataset.no ?? '';
    const say = (t?: string) => (t ?? '').replace('{no}', no);
    kEnl.setAttribute('aria-label', say(kbd.dataset.tEnlarge));
    kPause.setAttribute('aria-label', say(kbd.dataset.tPause));
    kPause.setAttribute('aria-pressed', String(userPaused));
    if (document.activeElement !== kEnl) kEnl.hidden = enlarge.hidden;
    if (document.activeElement !== kPause) kPause.hidden = pauseBtn.hidden;
  }

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
  /** The panel and the strip (sheet number, file dims, ⤢) of what the plate shows. */
  const showPanel = (key: string) => {
    for (const [k, p] of panels) {
      p.classList.toggle('is-active', k === key);
      p.style.clipPath = '';
    }
    const plate = plates.get(key)!;
    noEl.textContent = plate.dataset.no ?? '';
    dimsEl.textContent = plate.dataset.dims ?? '';
    enlarge.hidden = !plate.dataset.dims;
    twins();
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
    showPanel(key);
    setVt(key);
    sync();
  };

  const activate = async (key: string, mode: Mode) => {
    if (!plates.has(key) || !panels.has(key)) return;
    if (key === active && (mode === 'anim' || shown === key)) return;
    const me = ++run;
    active = key;
    vp.dataset.active = key;
    for (const r of rows) r.classList.toggle('is-active', keyOf(r) === key);
    const plate = plates.get(key)!;
    // the preview is one link (control layer over the inert preview): it follows the sheet
    if (plate.dataset.href) hit.href = plate.dataset.href;
    if (plate.dataset.ext != null) { hit.target = '_blank'; hit.rel = 'noopener'; } else { hit.removeAttribute('target'); hit.removeAttribute('rel'); }
    if (!desktop.matches) { shown = key; showPanel(key); return; }
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
      // decoded: the placeholder covered the wait only; the cut runs from the outgoing plate to the incoming one
      ph.hidden = true;
    }
    const duration = toMs(cssVar('--dur-3'));
    const easing = cssVar('--ease-pen') || 'ease-out';
    // one edge sweeps the whole column (w): the panel spans it; the plate may be narrower (height budget) and
    // centred, so its clip is keyed to the same edge — hidden until the edge reaches it (o), whole once past (o + s)
    const w = vp.clientWidth;
    const o = stage.getBoundingClientRect().left - vp.getBoundingClientRect().left;
    const sw = stage.clientWidth;
    const timing: KeyframeAnimationOptions = { duration, easing, fill: 'forwards' };
    const reveal: Keyframe[] = [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }];
    const wipe = plate.animate([
      { clipPath: `inset(0 ${o + sw}px 0 0)`, offset: 0 },
      { clipPath: 'inset(0 0px 0 0)', offset: Math.min(1, (o + sw) / w) },
      { clipPath: 'inset(0 0px 0 0)', offset: 1 },
    ], timing);
    const line = cut.animate(
      [{ transform: 'translateX(0)', opacity: 1 }, { transform: `translateX(${w}px)`, opacity: 1, offset: 0.9 }, { transform: `translateX(${w}px)`, opacity: 0 }],
      { duration, easing },
    );
    // the panel is cut with the plate: the incoming one shows left of the edge, the outgoing one right of it
    const inPanel = panels.get(key)!;
    const outPanel = panels.get(shown);
    inPanel.classList.add('is-active');
    anims = [wipe, line, inPanel.animate(reveal, timing)];
    if (outPanel && outPanel !== inPanel) anims.push(outPanel.animate([{ clipPath: 'inset(0 0 0 0%)' }, { clipPath: 'inset(0 0 0 100%)' }], timing));
    wiping = key;
    try { await wipe.finished; } catch { return; }
    if (me === run) commit(key);
  };

  // ───────────────────────────── wiring ─────────────────────────────
  const moved = (e: PointerEvent) => px < 0 || Math.abs(e.clientX - px) + Math.abs(e.clientY - py) > 2;
  // a row reached from the keyboard: on desktop, first bring the index into place if it is still low on screen (its
  // header under the title bar, where #index lands, so the Viewport shows whole), then make sure the row shows
  const instant = { behavior: 'instant' as ScrollBehavior };
  let tabbing = false;
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    tabbing = true;
    setTimeout(() => { tabbing = false; });
  }, true);
  let pad = 0; // the page's scroll-padding under the title bar: where #index puts the section's top
  const readPad = () => { pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0; };
  readPad();
  const place = (a: HTMLElement) => {
    if (desktop.matches && section.getBoundingClientRect().top > pad + 1) section.scrollIntoView({ block: 'start', ...instant });
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
      // a row that slid under a resting pointer (scroll, jump, J / K): not intent; the next real move decides
      if (rest && !moved(e)) return;
      setRest(false);
      intent(row);
    });
    row.addEventListener('pointerleave', () => clearTimeout(dwell));
    a.addEventListener('pointerdown', () => activate(key, 'instant'));
    a.addEventListener('focus', () => {
      if (a.matches(':focus-visible')) {
        setRest(true);
        clearTimeout(dwell);
        if (tabbing) place(a); // Tab (not a window regaining focus, which re-fires focus on the same row)
      }
      activate(key, 'instant');
    });
  }
  list.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') pointerIn = true; });
  list.addEventListener('pointerleave', () => { pointerIn = false; clearTimeout(dwell); });

  // the reading line (see the header): it leads while no live pointer is over the list and no row focused from the
  // keyboard is on screen (the scroll a J / K / Tab causes must not hand the Viewport to another row)
  const keyboardHolds = () => {
    const f = document.activeElement as HTMLElement | null;
    if (!f || !list.contains(f) || !f.matches(':focus-visible')) return false;
    const r = f.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight;
  };
  let indexOnScreen = false;
  const band = () => {
    if (!indexOnScreen || !desktop.matches || (pointerIn && !rest) || keyboardHolds()) return;
    const past = pad - section.getBoundingClientRect().top; // how far the index has scrolled beyond its landing place
    let pick: HTMLElement | undefined = seen[0];
    if (past > 1) {
      const r0 = seen[0].getBoundingClientRect();
      let line = Math.min(innerHeight * BAND, (r0.top + r0.bottom) / 2 + 2 * past);
      // the end of the list: the Viewport stays stuck only until the list's bottom reaches its own (there is no runway
      // of empty paper under the index). Over the last `ramp` px of that travel the line runs on down to the last
      // previewed row, so every sheet is read while the Viewport is still whole, and the last one is active when the
      // Viewport starts to leave with the list.
      const last = seen[seen.length - 1];
      const listBottom = list.getBoundingClientRect().bottom;
      if (!stuckTop) stuckTop = parseFloat(getComputedStyle(vp).top) || 0;
      const vpBottom = stuckTop + vp.offsetHeight;
      const d = listBottom - last.getBoundingClientRect().top; // constant while scrolling
      const ramp = Math.max(0, vpBottom - d - innerHeight * BAND);
      const left = listBottom - vpBottom;
      line += Math.max(0, ramp - left);
      // the last row the line has crossed: the row under the line, or — when the line falls in a group strip after a
      // jump (End, a scrollbar drag, a restored scroll position) — the row a continuous scroll would have left
      // active, so the Viewport never keeps a stale sheet
      pick = undefined;
      for (const r of seen) {
        if (r.getBoundingClientRect().top > line) break;
        pick = r;
      }
    }
    if (pick) activate(keyOf(pick), 'anim');
  };
  let bandRaf = 0;
  const bandSoon = () => { cancelAnimationFrame(bandRaf); bandRaf = requestAnimationFrame(band); };
  observe(section, (en) => { indexOnScreen = en.isIntersecting; if (indexOnScreen) bandSoon(); });

  // scrolling: rows now slide under a resting pointer; the fast-scroll bypass; the reading line
  let lastY = scrollY;
  let lastT = performance.now();
  addEventListener('scroll', () => {
    const t = performance.now();
    if ((Math.abs(scrollY - lastY) / innerHeight) * (1000 / Math.max(1, t - lastT)) > FAST) fastUntil = t + 200;
    lastY = scrollY;
    lastT = t;
    setRest(true);
    clearTimeout(dwell);
    bandSoon();
  }, { passive: true });

  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    if (rest && moved(e)) {
      // the pointer is moving again: the row under it (if any) is hover intent once more
      setRest(false);
      const row = (e.target as Element | null)?.closest?.<HTMLElement>('[data-ix]');
      if (row && list.contains(row) && desktop.matches) intent(row);
    }
    px = e.clientX;
    py = e.clientY;
  }, { passive: true });

  // J / K move through every row (the external ones included: they are links like the others)
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
  // The control layer lives in the aria-hidden Viewport: a press never moves focus into it, and ⤢ hands focus to
  // the active row's link first, so the Enlarged detail returns focus there (not to an aria-hidden button) on close.
  for (const b of [enlarge, pauseBtn]) b.addEventListener('mousedown', (e) => e.preventDefault());
  enlarge.addEventListener('click', () => {
    const box = plates.get(active)?.querySelector('[data-vp-box]');
    const row = rows.find((r) => keyOf(r) === active);
    if (row) linkOf(row).focus({ preventScroll: true });
    if (box) emit('sv:fig-open', { el: box });
  });
  pauseBtn.addEventListener('click', () => { userPaused = !userPaused; sync(); });
  if (kbd && kPause && kEnl) {
    kPause.addEventListener('click', () => { userPaused = !userPaused; sync(); });
    // the Enlarged detail returns focus to the twin that opened it
    kEnl.addEventListener('click', () => {
      const box = plates.get(active)?.querySelector('[data-vp-box]');
      if (box) emit('sv:fig-open', { el: box });
    });
    for (const [twin, drawn] of [[kPause, pauseBtn], [kEnl, enlarge]] as const) {
      twin.addEventListener('focus', () => drawn.toggleAttribute('data-kbd', twin.matches(':focus-visible')));
      twin.addEventListener('blur', () => { drawn.removeAttribute('data-kbd'); twins(); });
    }
  }
  // clicking the preview mid-wipe: land the wipe first, so the view transition morphs from the plate being opened
  hit.addEventListener('pointerdown', () => { if (wiping || shown !== active) commit(active); });

  // Height budget: the sticky Viewport must fit under the index header, where it sticks. CSS sizes the plate from
  // --_head (that header) and --_rest (everything that is not the plate); measure both — the rest on the TALLEST
  // panel (every panel is in flow in one cell), so switching sheets never resizes the plate. The Viewport always
  // fills its column, so the rest does not depend on the plate's width: one measurement settles it.
  const head = section.querySelector<HTMLElement>('.dix__head');
  let stuckTop = 0; // where the Viewport sticks (its CSS top), read with the other measurements
  const fit = () => {
    if (!desktop.matches) return;
    if (head) vp.style.setProperty('--_head', `${Math.ceil(head.offsetHeight + parseFloat(getComputedStyle(head).marginBlockEnd || '0'))}px`);
    vp.style.setProperty('--_rest', `${Math.ceil(vp.offsetHeight - stage.offsetHeight)}px`);
    stuckTop = parseFloat(getComputedStyle(vp).top) || 0;
  };
  let fitRaf = 0;
  addEventListener('resize', () => { cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(() => { readPad(); fit(); band(); }); });
  document.fonts.ready.then(fit);

  onPref('motion', sync);
  desktop.addEventListener('change', () => { fit(); if (desktop.matches) commit(active); else sync(); });
  setVt(active);
  sync();
}
