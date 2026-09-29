/**
 * Stylesheets on the built site (SPEC §7.2 · WP7).
 *  · every page's render-blocking CSS (linked sheets + inline <style>, gzip -9 each) is within the 28 KB budget, and
 *    its HTML within §7.2's (home 40, case 60, About / Play and the 404 30 KB gzip);
 *  · the Sheet-list and print sheets never block the first render, and the Enlarged-detail sheet is not linked at all
 *    (scripts/media/detail.ts injects it on first use);
 *  · each case page carries its own case rules inline (tools/route-css.mjs), naming only components that render on it,
 *    and no built script creates scoped elements (which is what makes that pruning exact).
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { beforeAll, describe, expect, test } from 'vitest';
import { cases } from '@/content/site';
import { DIST, distExists, load, PAGES } from './helpers';
import type { PageKey } from '@/lib/verbatim';

beforeAll(() => {
  if (!distExists()) throw new Error('dist/ is missing — run `npm run build` first.');
});

const BUDGET = 28 * 1024;
const gz = (s: string | Uint8Array) => zlib.gzipSync(s, { level: 9 }).length;
const sheets = (page: PageKey) =>
  load(page).root.querySelectorAll('link[rel="stylesheet"]').map((l) => ({ href: l.getAttribute('href')!, media: l.getAttribute('media') ?? null, onload: l.getAttribute('onload') ?? null }));
const cssFile = (href: string) => path.join(DIST, href);
const CID = /data-astro-cid-([a-z0-9]+)/g;

describe.each(PAGES)('%s', (page) => {
  test('every linked stylesheet exists', () => {
    for (const s of sheets(page)) expect(fs.existsSync(cssFile(s.href)), s.href).toBe(true);
  });

  test('render-blocking CSS ≤ 28 KB gzip (§7.2)', () => {
    const linked = sheets(page).filter((s) => !s.media || s.media === 'all' || s.media === 'screen');
    const inline = load(page).root.querySelectorAll('style').map((s) => s.text).join('');
    const total = linked.reduce((n, s) => n + gz(fs.readFileSync(cssFile(s.href))), 0) + gz(inline);
    expect(total).toBeLessThanOrEqual(BUDGET);
  });

  test('HTML ≤ its §7.2 budget gzip (home 40, case 60, About / Play 30 KB; the case rules are inline now)', () => {
    const kb = page === 'index' ? 40 : cases.some((c) => c.slug === page) ? 60 : 30;
    expect(gz(load(page).raw) / 1024).toBeLessThanOrEqual(kb);
  });

  test('the Sheet-list and print sheets load without blocking; the detail sheet is lazy', () => {
    const all = sheets(page);
    const print = all.filter((s) => /\/print\.[^/]+\.css$/.test(s.href));
    const palette = all.filter((s) => /\/palette\.[^/]+\.css$/.test(s.href));
    expect(print).toEqual([expect.objectContaining({ media: 'print', onload: null })]);
    expect(palette).toEqual([expect.objectContaining({ media: 'print', onload: "this.media='all'" })]);
    expect(all.some((s) => /\/detail\.[^/]+\.css$/.test(s.href))).toBe(false);
  });
});

describe('case styles (tools/route-css.mjs)', () => {
  const slugs = cases.map((c) => c.slug) as PageKey[];
  /** the page's own case rules, inlined where the route stylesheet was linked */
  const own = (page: PageKey) => load(page).root.querySelectorAll('style[data-route-css]').map((s) => s.text);

  test('each case inlines its own case rules, and links no route stylesheet', () => {
    for (const slug of slugs) {
      expect(own(slug), slug).toHaveLength(1);
      expect(sheets(slug).some((s) => /\/_slug_[.-]/.test(s.href)), slug).toBe(false);
    }
    expect(new Set(slugs.map((s) => own(s)[0])).size).toBe(slugs.length);
    for (const p of PAGES.filter((p) => !slugs.includes(p))) expect(own(p), p).toHaveLength(0);
  });

  test.each(slugs)('%s: its case rules only name components that render on the page', (slug) => {
    const present = new Set([...load(slug).raw.matchAll(CID)].map((m) => m[1]));
    const css = own(slug)[0];
    const named = new Set([...css.matchAll(CID)].map((m) => m[1]));
    expect([...named].filter((c) => !present.has(c))).toEqual([]);
    // and every component on the page that has case rules on another case page has them here too
    for (const other of slugs) {
      for (const c of new Set([...own(other)[0].matchAll(CID)].map((m) => m[1]))) if (present.has(c)) expect(named.has(c), `${c} (styled on ${other})`).toBe(true);
    }
  });

  test('no built script creates scoped elements', () => {
    const js = fs.readdirSync(path.join(DIST, '_astro')).filter((f) => f.endsWith('.js'));
    expect(js.length).toBeGreaterThan(0);
    for (const f of js) expect(fs.readFileSync(path.join(DIST, '_astro', f), 'utf8').includes('data-astro-cid'), f).toBe(false);
  });
});
