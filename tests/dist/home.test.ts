/**
 * SM2 invariants of the built home page (WP3 · Drawing index + Viewport). New file, proposed for WP7's tests/dist.
 *  - rows: one <ol> list per group, every entry ONE link, sheet numbers in order, the readout repeated for screen readers
 *  - readouts: every figure's textContent is exactly her source run (typographic splits add/remove nothing)
 *  - Viewport: aria-hidden with the preview inert, no tab stops, only A-101's cover and logo carry a src before interaction, the CSBS GIF and
 *    the C-100 video have none, and exactly one inline plate-* view-transition name (A-101) in the HTML
 */
import { beforeAll, describe, expect, test } from 'vitest';
import { sheets } from '@/data/sheets';
import { stripHtml } from '@/lib/text';
import { distExists, load } from './helpers';

beforeAll(() => {
  if (!distExists()) throw new Error('dist/ is missing — run `npm run build` first.');
});

const text = (html: string) => stripHtml(html);

describe('home · Drawing index (SM2)', () => {
  test('rows: every entry is one link, in sheet order, grouped under h3s inside #index', () => {
    const { root } = load('index');
    const index = root.querySelector('section#index')!;
    expect(index).toBeTruthy();
    expect(index.querySelector('h2#index-h')?.text.trim()).toBe('Drawing index');
    const groups = index.querySelectorAll('.dix__group');
    expect(groups).toHaveLength(3);
    for (const g of groups) expect(g.querySelector('h3')).toBeTruthy();
    const rows = index.querySelectorAll('ol > li[data-ix]');
    expect(rows).toHaveLength(sheets.length);
    rows.forEach((li, i) => {
      const links = li.querySelectorAll('a');
      expect(links, `row ${i}`).toHaveLength(1);
      expect(links[0].getAttribute('href')).toBe(sheets[i].href);
      if (sheets[i].external) expect(links[0].getAttribute('target')).toBe('_blank');
    });
    // the first case row is the Viewport's default sheet
    expect(rows[0].classList.contains('is-active')).toBe(true);
  });

  test('readouts: each figure renders exactly her text (joined splits concatenate to one verbatim run)', () => {
    const { root } = load('index');
    for (const s of sheets.filter((x) => x.readout)) {
      const key = s.slug!;
      const row = root.querySelector(`li[data-ix="${key}"]`)!;
      const panel = root.querySelector(`[data-vp-panel="${key}"]`)!;
      for (const [where, scope] of [['row', row], ['viewport', panel]] as const) {
        const figs = scope.querySelectorAll(where === 'row' ? '.rdr__line' : '.rd__fig');
        expect(figs, `${key} ${where}`).toHaveLength(s.readout!.lines.length);
        s.readout!.lines.forEach((l, i) => {
          const got = text(figs[i].innerHTML);
          const want = l.joined ? l.value.text + l.label.text : `${l.value.text} ${l.label.text}`;
          expect(got, `${key} ${where} figure ${i}`).toBe(text(want));
          if (l.joined) expect(figs[i].hasAttribute('data-v'), `${key} joined figure is one data-v element`).toBe(true);
        });
      }
      // the card's one-line readout (< 1024) is her first figure on every card (SM2 mobile wireframe)
      expect(row.querySelectorAll('.rdr__line')[0].classList.contains('rdr__line--more'), `${key} card readout`).toBe(false);
      if (s.readout!.bars) expect(text(panel.querySelector('.rd__cap')!.innerHTML)).toBe(s.readout!.bars.caption.text);
      if (s.readout!.sub) expect(text(panel.querySelector('.rd__sub')!.innerHTML)).toBe(s.readout!.sub.text);
    }
  });

  test('Viewport: aria-hidden, the preview inert, no tab stops', () => {
    const { root } = load('index');
    const vp = root.querySelector('[data-vp]')!;
    expect(vp.getAttribute('aria-hidden')).toBe('true');
    // the preview (strip, plates, panels) is inert; only the aria-hidden control layer takes the pointer
    const view = vp.querySelector('.vp__view')!;
    expect(view.hasAttribute('inert')).toBe(true);
    expect(view.querySelectorAll('a, button')).toHaveLength(0);
    expect(vp.querySelectorAll('.vp__ctl a[href]')).toHaveLength(1);
    for (const el of vp.querySelectorAll('a, button')) expect(el.getAttribute('tabindex'), el.outerHTML.slice(0, 80)).toBe('-1');
    expect(vp.querySelectorAll('h1, h2, h3, h4, h5, h6')).toHaveLength(0);
  });

  test('loading: before interaction only A-101 (cover + logo) has a src; GIF and video never in HTML', () => {
    const { root } = load('index');
    const vp = root.querySelector('[data-vp]')!;
    const withSrc = vp.querySelectorAll('img[src], video[src]').map((e) => e.getAttribute('src')!.split('/').pop());
    expect(withSrc.sort()).toEqual(['CQBzyCCtXm6Sxa1H7rjdmW35A4.webp', 'ynF3JX3AYbXmF5u4ZKwl04aGc.png']);
    const gif = vp.querySelector('[data-vp-plate="csbs"] img')!;
    expect(gif.hasAttribute('src')).toBe(false);
    expect(gif.getAttribute('data-src')).toMatch(/hc5LSNViBiB98sAACx272BNZYw\.gif$/);
    const video = vp.querySelector('[data-vp-plate="play"] video')!;
    expect(video.hasAttribute('src')).toBe(false);
    expect(video.getAttribute('preload')).toBe('none');
  });

  test('view transitions: one inline plate name (the Viewport A-101); cards carry theirs via --_vt below 1024', () => {
    const { root } = load('index');
    const inline = root.querySelectorAll('[style*="view-transition-name"]').map((e) => /view-transition-name:\s*([\w-]+)/.exec(e.getAttribute('style')!)?.[1]);
    expect(inline).toEqual(['plate-cloudflare']);
    const cards = root.querySelectorAll('.icard__plate').map((e) => /--_vt:\s*([\w-]+)/.exec(e.getAttribute('style') ?? '')?.[1]);
    expect(cards).toEqual(sheets.filter((s) => s.kind === 'case').map((s) => `plate-${s.slug}`));
  });

  test('compact index (404): sheet numbers + titles only, no Viewport, no cards', () => {
    const { root } = load('404');
    const index = root.querySelector('section#index')!;
    expect(index.querySelector('[data-vp]')).toBeNull();
    expect(index.querySelectorAll('.icard__plate')).toHaveLength(0);
    expect(index.querySelectorAll('ol > li a')).toHaveLength(sheets.length);
  });
});
