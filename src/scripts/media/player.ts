/**
 * player.ts · WP4b (SPEC §6.2 WalkthroughPlayer — PFF Highlights).
 *   ≥ 1024: the WAI-ARIA tabs pattern (vertical, automatic activation; arrows, Home, End). Plays only while ≥ 35 % of
 *           the player is visible. Auto-advance runs once through (video `ended`, or the GIF's known length) and stops
 *           after the last step; selecting a step turns it off, and the selected step then loops (WCAG 2.2.2).
 *   < 1024: stacked; only the most visible step (≥ 35 %) plays, muted, with Pause.
 *   Motion off: nothing autoplays or advances; videos wait on their first frame, the GIF on its poster.
 *   Memory: only the selected step's media is mounted (desktop); within 1.5 viewports a video shows its first frame
 *   and the GIF's bytes are fetched ahead; beyond 3 viewports every source is removed (the GIF manager's rule).
 */
import { $$, motionOK, ready } from '../core/dom';
import { observe, viewportMargin } from '../core/io';
import { on as onPref } from '../core/prefs';
import { chrome } from '../../data/chrome';
import { openDetail } from './plates';
import { phNote, setState } from './state';
import { freezePlate, pausePlate, posterPlate } from './gif';
import { isHeld, onHold } from './hold';

const wide = matchMedia('(min-width: 1024px)');
const TH = [0, 0.35, 0.5, 0.75, 1];

function wire(root: HTMLElement): void {
  if (root.dataset.wired) return;
  root.dataset.wired = '';
  const tabsEl = root.querySelector<HTMLElement>('[data-player-tabs]');
  const tabs = $$<HTMLElement>('[data-player-tab]', root);
  const panels = $$<HTMLElement>('[data-player-panel]', root);
  const plates = panels.map((p) => p.querySelector<HTMLElement>('[data-plate]')!);
  if (!tabsEl || tabs.length !== panels.length) return;
  const tabsBox: HTMLElement = tabsEl;
  const vids = plates.map((p) => p.querySelector<HTMLVideoElement>('video[data-vid]'));
  const gifs = plates.map((p) => p.querySelector<HTMLImageElement>('img[data-gif]'));
  const secs = plates.map((p) => parseFloat(p.style.getPropertyValue('--_secs')) || 20);
  const ratios = panels.map(() => 0);
  const isNear = panels.map(() => false);
  let active = 0, auto = true, chosen = false, desktop = false, visible = false, timer = 0;
  const userPaused = new Set<number>();

  const srcOf = (i: number) => (vids[i]?.dataset.src ?? gifs[i]?.dataset.src ?? '').replace(/#t=[\d.]+$/, '');

  /** pause step i (a GIF freezes, then shows its poster); `park` removes its source altogether */
  function stop(i: number, park = false) {
    const v = vids[i], g = gifs[i];
    clearTimeout(timer);
    if (v) {
      v.pause();
      if (park && v.getAttribute('src')) { v.removeAttribute('src'); v.load(); setState(plates[i], 'idle'); }
    }
    if (g && park) {
      if (g.getAttribute('src')) g.removeAttribute('src');
      if (plates[i].dataset.state !== 'paused') setState(plates[i], 'idle');
    } else if (g && g.getAttribute('src')) {
      pausePlate(plates[i]);
      setState(plates[i], 'paused', { once: !chosen && auto });
    }
  }

  /** what a step shows while it may not play: a video its first frame, the GIF its poster */
  function rest(i: number) {
    if (!gifs[i]) { prime(i); return; }
    if (gifs[i]!.getAttribute('src')) { stop(i); return; }
    if (plates[i].dataset.state !== 'paused') {
      setState(plates[i], 'paused');
      if (!plates[i].querySelector<HTMLCanvasElement>('canvas.plate__poster')?.dataset.pw) phNote(plates[i], chrome.wp4b.media.paused);
    }
    void posterPlate(plates[i]);
  }

  /** within 1.5 viewports: a video's first frame; the GIF's bytes fetched ahead (or its poster, if it may not play) */
  const warmed = new Set<number>();
  function near(i: number) {
    if (vids[i]) { prime(i); return; }
    if (!gifs[i] || gifs[i]!.getAttribute('src')) return;
    if (motionOK() && !userPaused.has(i)) {
      if (!warmed.has(i)) { warmed.add(i); fetch(srcOf(i)).then((r) => r.blob()).catch(() => {}); }
    } else rest(i);
  }

  /** first frame for videos (#t), mounted GIFs; nothing plays yet */
  function prime(i: number) {
    const v = vids[i];
    if (v && !v.getAttribute('src')) { v.preload = 'metadata'; v.src = `${srcOf(i)}#t=0.001`; setState(plates[i], 'loading'); }
  }

  function play(i: number, fromStart = false) {
    const v = vids[i], g = gifs[i];
    const loop = chosen || !desktop;
    if (v) {
      prime(i);
      v.muted = true;
      v.loop = loop;
      if (fromStart) v.currentTime = 0;
      v.play().catch(() => {});
      return;
    }
    if (g) {
      if (fromStart && g.getAttribute('src')) { freezePlate(plates[i]); g.removeAttribute('src'); }
      const cv = plates[i].querySelector<HTMLCanvasElement>('canvas.plate__poster');
      const start = () => {
        if (!g.getAttribute('src')) return;
        if (cv) cv.hidden = true; // the poster stays up until the GIF is ready to take over
        setState(plates[i], 'playing', { restartProgress: true, once: !loop });
        clearTimeout(timer);
        if (desktop && auto && !chosen && i < tabs.length - 1) timer = window.setTimeout(() => advance(i), secs[i] * 1000);
      };
      if (g.getAttribute('src') && g.complete) start();
      else {
        if (plates[i].dataset.state !== 'paused' && plates[i].dataset.state !== 'playing') setState(plates[i], 'loading');
        g.addEventListener('load', start, { once: true });
        requestAnimationFrame(() => { g.src = srcOf(i); });
      }
    }
  }

  function advance(from: number) {
    if (!auto || chosen || from !== active) return;
    if (from >= tabs.length - 1) { auto = false; return; } // once through: stop after the last step
    select(from + 1, false);
  }

  const mayPlay = (i: number) => !isHeld() && visible && !userPaused.has(i) && (motionOK() || chosen);

  function select(i: number, byUser: boolean) {
    if (byUser) { chosen = true; auto = false; userPaused.delete(i); }
    const prev = active;
    active = i;
    for (const [k, t] of tabs.entries()) {
      const on = k === i;
      t.toggleAttribute('aria-current', false);
      if (desktop) {
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        panels[k].hidden = !on;
      }
    }
    if (prev !== i) stop(prev, true);
    if (mayPlay(i)) play(i, !byUser || prev !== i);
    else if (isNear[i]) rest(i);
  }

  function mode() {
    desktop = wide.matches;
    if (desktop) {
      tabsBox.setAttribute('role', 'tablist');
      tabsBox.setAttribute('aria-orientation', 'vertical');
      tabsBox.setAttribute('aria-label', tabsBox.dataset.label ?? '');
      for (const [k, t] of tabs.entries()) {
        t.setAttribute('role', 'tab');
        t.setAttribute('aria-controls', panels[k].id);
        panels[k].setAttribute('role', 'tabpanel');
        panels[k].setAttribute('aria-labelledby', t.id);
      }
      select(active, false);
    } else {
      tabsBox.removeAttribute('role'); tabsBox.removeAttribute('aria-orientation'); tabsBox.removeAttribute('aria-label');
      for (const [k, t] of tabs.entries()) {
        for (const a of ['role', 'aria-controls', 'aria-selected', 'tabindex']) t.removeAttribute(a);
        panels[k].hidden = false;
        panels[k].removeAttribute('role'); panels[k].removeAttribute('aria-labelledby');
      }
      stackedPlay();
    }
  }

  /** stacked: only the most visible step plays */
  function stackedPlay() {
    if (desktop || isHeld()) return;
    let best = -1;
    for (const [k, r] of ratios.entries()) if (r >= 0.35 && (best < 0 || r > ratios[best])) best = k;
    for (const k of panels.keys()) if (k !== best) stop(k);
    if (best >= 0) {
      active = best;
      if (!userPaused.has(best) && motionOK()) { if (plates[best].dataset.state !== 'playing') play(best); }
      else rest(best);
    }
  }

  // ── events ──
  for (const [k, v] of vids.entries()) {
    if (!v) continue;
    v.addEventListener('loadeddata', () => { if (plates[k].dataset.state === 'loading') setState(plates[k], v.paused ? 'ready' : 'playing'); });
    v.addEventListener('playing', () => setState(plates[k], 'playing', { restartProgress: true, at: v.currentTime, once: !v.loop }));
    v.addEventListener('pause', () => { if (v.getAttribute('src') && !v.ended) setState(plates[k], 'paused', { once: !v.loop }); });
    v.addEventListener('ended', () => { setState(plates[k], 'paused'); if (desktop) advance(k); });
  }
  tabs.forEach((t, k) => t.addEventListener('click', () => { if (desktop) select(k, true); }));
  tabsBox.addEventListener('keydown', (e) => {
    if (!desktop) return;
    const n = tabs.length;
    let to = -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') to = (active + 1) % n;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') to = (active - 1 + n) % n;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = n - 1;
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(active, true); return; }
    if (to < 0) return;
    e.preventDefault();
    select(to, true);
    tabs[to].focus();
  });
  root.addEventListener('click', (e) => {
    const b = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-mc-toggle], [data-mc-restart], [data-mc-enlarge]') : null;
    if (!b) return;
    const k = panels.findIndex((p) => p.contains(b));
    if (k < 0) return;
    if (b.matches('[data-mc-enlarge]')) { openDetail(plates[k], b); return; }
    if (desktop && k !== active) select(k, true);
    if (b.matches('[data-mc-restart]')) { userPaused.delete(k); chosen = chosen || desktop; play(k, true); return; }
    const playing = plates[k].dataset.state === 'playing' || plates[k].dataset.state === 'loading';
    if (playing) { userPaused.add(k); stop(k); if (desktop) auto = false; }
    else { userPaused.delete(k); if (desktop) { chosen = true; auto = false; } play(k); }
  });

  observe(root, (en) => {
    visible = en.isIntersecting && en.intersectionRatio >= 0.35;
    if (!desktop) return;
    if (!visible) { stop(active); return; }
    if (mayPlay(active)) { if (plates[active].dataset.state !== 'playing') play(active); }
    else rest(active);
  }, { threshold: [0, 0.35] });
  for (const [k, p] of panels.entries()) {
    observe(p, (en) => { ratios[k] = en.isIntersecting ? en.intersectionRatio : 0; stackedPlay(); }, { threshold: TH });
    // a hidden (unselected) panel never intersects: it is parked already, and near() skips it
    observe(p, (en) => { isNear[k] = en.isIntersecting; if (en.isIntersecting && !p.hidden) near(k); }, { rootMargin: viewportMargin(1.5) });
    observe(p, (en) => { if (!en.isIntersecting) stop(k, true); }, { rootMargin: viewportMargin(3) });
  }

  // the Enlarged detail is open over the page: stand down (the reader's choices are kept), resume on close
  onHold((held) => {
    if (held) { for (const k of panels.keys()) if (plates[k].dataset.state === 'playing' || plates[k].dataset.state === 'loading') stop(k); return; }
    if (!desktop) { stackedPlay(); return; }
    if (mayPlay(active)) play(active);
  });
  wide.addEventListener('change', mode);
  onPref('motion', () => {
    if (!motionOK()) { for (const k of panels.keys()) if (plates[k].dataset.state === 'playing' || plates[k].dataset.state === 'loading') stop(k); }
    else if (desktop) { if (visible) select(active, false); }
    else stackedPlay();
  });
  mode();
}

ready(() => { for (const p of $$<HTMLElement>('[data-player]')) wire(p); });
