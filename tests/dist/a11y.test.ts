/**
 * Static accessibility contracts on the built pages (SPEC §7.1 · WP7). axe (tools/axe.mjs) covers the rendered pages;
 * these hold the parts a later edit could silently break:
 *  · 1.1.1 every media file a page renders has an alt DRAFT (src/data/alt.ts) — "every referenced image";
 *  · an <img> carries its draft verbatim, or alt="" only where it is a decorative duplicate: inside an aria-hidden
 *    subtree (the home Viewport), inside a link or button that already has a text name (index cards), the next-sheet
 *    preview beside its titled link (the match line: that cover is described on its own sheet), or the lower layer of
 *    a staged plate (a cover's backdrop). The <noscript> twins follow the same rule;
 *  · every <video> is named by its draft (aria-label), unless it sits in an aria-hidden subtree;
 *  · an image with no name never carries a description (aria-describedby on a presentational <img>);
 *  · every id that aria-labelledby / aria-describedby / aria-controls / for points to exists on the page;
 *  · the Enlarge controls are named by the figure (and her caption), never by the long alt draft.
 */
import { parse, type HTMLElement } from 'node-html-parser';
import { beforeAll, describe, expect, test } from 'vitest';
import { alt, altDrafts } from '@/data/alt';
import { distExists, load, PAGES } from './helpers';

beforeAll(() => {
  if (!distExists()) throw new Error('dist/ is missing — run `npm run build` first.');
});

const APPLE_TOUCH = 'ACwkGtncbgGidk0PGO4wEAjBQ4.png';
const fileOf = (src: string) => src.split('#')[0].split('?')[0].split('/').pop() ?? '';
const srcOf = (el: HTMLElement) => el.getAttribute('src') ?? el.getAttribute('data-src') ?? '';

/** the page's own elements plus every <noscript> twin, parsed */
function mediaEls(root: HTMLElement): HTMLElement[] {
  const own = root.querySelectorAll('img, video');
  const twins = root.querySelectorAll('noscript').flatMap((n) => {
    const frag = parse(`<div>${n.innerHTML}</div>`);
    // keep the twin's context: its host (for aria-hidden / link ancestry checks)
    return frag.querySelectorAll('img, video').map((e) => Object.assign(e, { __host: n }));
  });
  return [...own, ...twins];
}
const hostOf = (e: HTMLElement): HTMLElement => (e as HTMLElement & { __host?: HTMLElement }).__host ?? e;
const hiddenAncestor = (e: HTMLElement) => !!hostOf(e).closest('[aria-hidden="true"]');
function namedControlAncestor(e: HTMLElement): boolean {
  const c = hostOf(e).closest('a, button');
  if (!c) return false;
  const text = (c.getAttribute('aria-label') ?? c.text).replace(/\s+/g, ' ').trim();
  return text.length > 0;
}
function lowerLayer(e: HTMLElement): boolean {
  const view = hostOf(e).closest('.plate__view, .vp__box, .icard__box, .og__plate');
  if (!view) return false;
  const layers = view.querySelectorAll('img.plate__media, img.vp__layer, img.icard__layer, video.plate__media');
  return layers.length > 1 && layers[layers.length - 1] !== e && fileOf(srcOf(layers[layers.length - 1])) !== fileOf(srcOf(e));
}

describe('alt drafts', () => {
  test('every media file any page renders has a non-empty draft', () => {
    const files = new Set<string>();
    for (const p of PAGES) for (const e of mediaEls(load(p).root)) { const f = fileOf(srcOf(e)); if (f) files.add(f); }
    files.delete(APPLE_TOUCH);
    const missing = [...files].filter((f) => !alt(f));
    expect(missing).toEqual([]);
    expect(files.size).toBeGreaterThanOrEqual(215);
  });
  test('drafts are drafts, not captions: no "image of", no filename, sentence-like', () => {
    for (const [f, a] of Object.entries(altDrafts)) {
      expect(a, f).toMatch(/^[A-Z0-9“"‘']/);
      expect(a, f).toMatch(/[.”"’)]$/);
      expect(a.toLowerCase(), f).not.toMatch(/^(an? )?(image|picture|photo) of\b/);
      expect(a, f).not.toMatch(/\.(png|jpe?g|gif|webp|mp4)\b/i);
    }
  });
});

describe.each(PAGES)('%s', (page) => {
  test('images carry their draft, or alt="" only as a decorative duplicate', () => {
    const { root } = load(page);
    const bad: string[] = [];
    for (const e of mediaEls(root)) {
      if (e.tagName !== 'IMG' || hostOf(e).closest('dialog')) continue;
      const f = fileOf(srcOf(e));
      if (!f || f === APPLE_TOUCH) continue;
      const a = e.getAttribute('alt');
      if (a == null) { bad.push(`${f}: no alt attribute`); continue; }
      if (a === '') {
        const nextSheet = !!hostOf(e).closest('[data-matchline-card]');
        if (!(hiddenAncestor(e) || namedControlAncestor(e) || nextSheet || lowerLayer(e))) bad.push(`${f}: alt="" outside a decorative context`);
      } else if (a !== alt(f)) bad.push(`${f}: alt is not its draft`);
    }
    expect(bad).toEqual([]);
  });

  test('videos are named by their draft', () => {
    const { root } = load(page);
    const bad = mediaEls(root)
      .filter((e) => e.tagName === 'VIDEO' && !hiddenAncestor(e) && !hostOf(e).closest('dialog') && !(e as HTMLElement & { __host?: HTMLElement }).__host)
      .filter((v) => v.getAttribute('aria-label') !== alt(fileOf(srcOf(v))))
      .map((v) => fileOf(srcOf(v)));
    expect(bad).toEqual([]);
  });

  test('an image without a name never carries a description', () => {
    const { root } = load(page);
    const bad = root.querySelectorAll('img[aria-describedby]').filter((i) => !i.getAttribute('alt')).map((i) => fileOf(srcOf(i)));
    expect(bad).toEqual([]);
  });

  test('every aria-labelledby / aria-describedby / aria-controls / label[for] target exists', () => {
    const { root } = load(page);
    const ids = new Set(root.querySelectorAll('[id]').map((e) => e.id));
    const bad: string[] = [];
    for (const attr of ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'aria-activedescendant']) {
      for (const e of root.querySelectorAll(`[${attr}]`)) {
        for (const id of (e.getAttribute(attr) ?? '').split(/\s+/).filter(Boolean)) if (!ids.has(id)) bad.push(`${attr}=${id}`);
      }
    }
    for (const l of root.querySelectorAll('label[for]')) if (!ids.has(l.getAttribute('for')!)) bad.push(`for=${l.getAttribute('for')}`);
    expect([...new Set(bad)]).toEqual([]);
  });

  test('Enlarge controls are named by the figure, never by an alt draft', () => {
    const { root } = load(page);
    const drafts = new Set(Object.values(altDrafts));
    const bad = root.querySelectorAll('[data-fig][aria-label], [data-mc-enlarge][aria-label]')
      .map((b) => b.getAttribute('aria-label')!)
      .filter((l) => [...drafts].some((d) => l.includes(d)) || l.length > 160);
    expect(bad).toEqual([]);
  });
});
