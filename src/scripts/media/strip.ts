/**
 * strip.ts · WP4b. Pan strips (Strip.astro): the region semantics + keyboard focus only while the strip is active
 * (below 768px, or always for the filmstrip), edge fades that follow the scroll position, mouse drag-to-scroll, and the
 * Enlarge button (a tap on a scroller must never open the viewer by accident).
 */
import { $$, rafThrottle, ready } from '../core/dom';
import { openDetail } from './plates';

const narrow = matchMedia('(max-width: 767.98px)');

function wire(strip: HTMLElement): void {
  const win = strip.querySelector<HTMLElement>('[data-strip-win]');
  if (!win || strip.dataset.wired) return;
  strip.dataset.wired = '';
  const all = strip.classList.contains('strip--all');

  const edges = rafThrottle(() => {
    const max = win.scrollWidth - win.clientWidth;
    strip.toggleAttribute('data-at-start', win.scrollLeft <= 1);
    strip.toggleAttribute('data-at-end', max <= 1 || win.scrollLeft >= max - 1);
  });
  const sync = () => {
    const on = all || narrow.matches;
    win.toggleAttribute('data-strip-on', on);
    if (on) {
      win.tabIndex = 0;
      win.setAttribute('role', 'region');
      if (win.dataset.label) win.setAttribute('aria-label', win.dataset.label);
    } else {
      win.removeAttribute('tabindex');
      win.removeAttribute('role');
      win.removeAttribute('aria-label');
    }
    edges();
  };
  win.addEventListener('scroll', edges, { passive: true });
  narrow.addEventListener('change', sync);
  addEventListener('resize', edges, { passive: true });
  sync();

  // a mouse can drag the image sideways (touch and trackpads scroll natively)
  let x0 = 0, s0 = 0, moved = 0, pid = -1;
  win.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !win.hasAttribute('data-strip-on')) return;
    x0 = e.clientX; s0 = win.scrollLeft; moved = 0; pid = e.pointerId;
  });
  win.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pid) return;
    const dx = e.clientX - x0;
    moved = Math.max(moved, Math.abs(dx));
    if (moved > 4) {
      if (!win.hasAttribute('data-dragging')) { win.setAttribute('data-dragging', ''); win.setPointerCapture(pid); }
      win.scrollLeft = s0 - dx;
    }
  });
  const end = (e: PointerEvent) => {
    if (e.pointerId !== pid) return;
    pid = -1;
    win.removeAttribute('data-dragging');
  };
  win.addEventListener('pointerup', end);
  win.addEventListener('pointercancel', end);
  // a drag is not a click on the plate underneath
  win.addEventListener('click', (e) => { if (moved > 4) { e.stopPropagation(); e.preventDefault(); moved = 0; } }, true);

  strip.querySelector<HTMLElement>('[data-strip-enlarge]')?.addEventListener('click', (e) => {
    const plate = strip.querySelector<HTMLElement>('[data-plate]');
    if (plate) openDetail(plate, e.currentTarget as HTMLElement);
  });
}

ready(() => { for (const s of $$<HTMLElement>('[data-strip]')) wire(s); });
