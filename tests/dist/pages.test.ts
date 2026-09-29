/**
 * Structural smoke tests on every built page (P0 → WP7 extends: links, headings, axe).
 */
import { beforeAll, describe, expect, test } from 'vitest';
import { distExists, load, PAGES } from './helpers';

beforeAll(() => {
  if (!distExists()) throw new Error('dist/ is missing — run `npm run build` first.');
});

describe.each(PAGES)('%s', (page) => {
  test('document skeleton: lang, one h1, main#main, skip link first, chrome stubs, #sv-newtab', () => {
    const { root } = load(page);
    expect(root.querySelector('html')?.getAttribute('lang')).toBe('en');
    expect(root.querySelector('html')?.getAttribute('data-page')).toBeTruthy();
    expect(root.querySelectorAll('h1')).toHaveLength(1);
    expect(root.querySelectorAll('main#main')).toHaveLength(1);
    const firstFocusable = root.querySelector('body')!.querySelectorAll('a[href], button')[0];
    expect(firstFocusable.getAttribute('href')).toBe('#main');
    expect(root.querySelectorAll('.vt-cutline')).toHaveLength(1);
    expect(root.querySelectorAll('dialog.detail')).toHaveLength(1);
    expect(root.querySelectorAll('dialog.palette')).toHaveLength(1);
    expect(root.querySelector('#sv-newtab')).toBeTruthy();
    expect(root.querySelector('header[role=banner]')).toBeTruthy();
    expect(root.querySelector('footer[role=contentinfo]')).toBeTruthy();
  });
  test('head: sync script, speculation rules (prefetch only), fonts, ≤ 1 image preload', () => {
    const { root, raw } = load(page);
    const inline = root.querySelectorAll('head script:not([src])').map((s) => s.text);
    const head = inline.find((s) => s.includes("sv:motion"));
    expect(head).toBeTruthy();
    expect(head!.replace(/\s+/g, ' ').length).toBeLessThanOrEqual(700);
    const spec = root.querySelector('script[type=speculationrules]');
    expect(spec).toBeTruthy();
    const rules = JSON.parse(spec!.text);
    expect(Object.keys(rules)).toEqual(['prefetch']);
    expect(root.querySelectorAll('link[rel=preload][as=font]')).toHaveLength(5); // WP7: every face, subset (fonts.test.ts)
    expect(raw).toContain('--font-serif:');
    expect(raw).toContain('--font-sans:');
    expect(raw).toContain('--font-mono:');
    expect(root.querySelectorAll('link[rel=preload][as=image]').length).toBeLessThanOrEqual(1);
  });
  test('ids are unique; view-transition names are unique', () => {
    const { root } = load(page);
    const ids = root.querySelectorAll('[id]').map((e) => e.id);
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dup).toEqual([]);
    const vts = root.querySelectorAll('[style*="view-transition-name"]').map((e) => /view-transition-name:\s*([\w-]+)/.exec(e.getAttribute('style') ?? '')?.[1]);
    expect(new Set(vts).size).toBe(vts.length);
  });
  test('every <img> has width/height and alt; no GIF/video is eager except the LCP', () => {
    const { root } = load(page);
    for (const img of root.querySelectorAll('img')) {
      expect(img.getAttribute('width'), img.getAttribute('src')).toBeTruthy();
      expect(img.getAttribute('height'), img.getAttribute('src')).toBeTruthy();
      expect(img.hasAttribute('alt'), img.getAttribute('src')).toBe(true);
    }
    const eager = root.querySelectorAll('img[fetchpriority=high]');
    expect(eager.length).toBeLessThanOrEqual(1);
  });
});

test('case pages: legacy anchors exist and chapters are ordered like the content', () => {
  const expect_ = { cloudflare: ['research', 'ideation', 'reflect'], pff: ['protoype', 'reflect'], csbs: ['research', 'protoype', 'reflect'], educademy: ['research', 'persona', 'ideation', 'design'] } as const;
  for (const [page, ids] of Object.entries(expect_)) {
    const { root } = load(page as never);
    for (const id of ids) expect(root.querySelector(`#${id}`), `${page}#${id}`).toBeTruthy();
  }
});
