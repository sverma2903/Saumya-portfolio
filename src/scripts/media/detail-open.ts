/**
 * detail-open.ts · WP4b (split out at integration). The Enlarged detail's lazy opener and the page-wide
 * `sv:fig-open` listener.
 *
 * DetailViewer.astro (rendered on every page by Base) loads this module, so a figure-open request is answered on every
 * page, including pages that render no <Plate> and so never load plates.ts: the home Viewport's ⤢ (WP3) emits
 * `sv:fig-open {el: .vp__box}`. plates.ts imports `openDetail` from here too; an ES module is evaluated once per page,
 * so there is exactly one listener. The viewer and panzoom (detail.ts) still load only on first use.
 */
import { listen } from '../core/bus';

type DetailApi = { open: (el: Element, trigger?: HTMLElement | null) => void };
let detail: Promise<DetailApi> | null = null;

export function openDetail(el: Element, trigger?: HTMLElement | null): void {
  const from = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
  detail ??= import('./detail') as Promise<DetailApi>;
  detail.then((d) => d.open(el, from)).catch(() => { detail = null; });
}

listen('sv:fig-open', ({ el }) => openDetail(el));
