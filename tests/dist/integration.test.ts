/**
 * Integration · cross-package contracts on the built pages (written at integration; proposed for WP7's suite).
 *
 * The packages were built apart, so the seams between them are what break first:
 *  · a script looks up ONE element with document.querySelector('<hook>') — if another package puts the same hook on an
 *    earlier element, the lookup silently lands on it (WP1's title bar carried `data-cover`, WP2's hero hook, and the
 *    live site plan never started). Every singleton hook a script uses must match at most one element on every page.
 *  · the cover sheet's parse-time WebGL2 probe must stand down while a view transition reveals the page (Chromium
 *    drops the cross-document cut when a context is created then; siteplan.ts creates it once the cut has finished).
 *  · the Enlarged detail answers `sv:fig-open` on every page (DetailViewer loads the listener; home has no <Plate>).
 */
import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, test } from 'vitest';
import { distExists, load, PAGES } from './helpers';

beforeAll(() => {
  if (!distExists()) throw new Error('dist/ is missing — run `npm run build` first.');
});

/** every selector a script hands to document.querySelector (a singleton lookup), read from the source */
function singletonHooks(): string[] {
  const out = new Set<string>();
  const walk = (dir: string) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|astro)$/.test(name)) {
        const src = fs.readFileSync(p, 'utf8');
        for (const m of src.matchAll(/document\.querySelector(?:<[^>]*>)?\(\s*(['"`])([^'"`]+)\1\s*\)/g)) out.add(m[2]);
      }
    }
  };
  walk(path.resolve('src'));
  return [...out].sort();
}
// the title bar's and the bottom bar's sheet numbers are the same text by design (one is always display:none);
// detail.ts reads either one
const SAME_TEXT_BY_DESIGN = new Set(['.sheetno']);

describe('singleton hooks', () => {
  const hooks = singletonHooks();
  test('scripts look up at least the known hooks (the scan works)', () => {
    for (const h of ['[data-cover]', '[data-vp]', 'dialog.detail', '[data-home-title]']) expect(hooks).toContain(h);
  });
  test.each(PAGES)('%s: every document.querySelector hook matches at most one element', (page) => {
    const { root } = load(page);
    const over = hooks.filter((h) => !SAME_TEXT_BY_DESIGN.has(h)).map((h) => [h, root.querySelectorAll(h).length] as const).filter(([, n]) => n > 1);
    expect(over).toEqual([]);
  });
  test('the cover hook is the cover sheet itself', () => {
    const { root } = load('index');
    const hits = root.querySelectorAll('[data-cover]');
    expect(hits).toHaveLength(1);
    expect(hits[0].tagName).toBe('SECTION');
    expect(hits[0].getAttribute('id')).toBe('cover');
    // …and the GL canvas the hero boots from sits inside it
    expect(hits[0].querySelector('canvas[data-gl-canvas]')).toBeTruthy();
  });
});

describe('view transitions × the live site plan', () => {
  test('the parse-time WebGL2 probe stands down while a view transition reveals the page', () => {
    const { raw } = load('index');
    const probe = raw.match(/<script>\(function\(c,d\)\{[^<]*getContext\('webgl2'[^<]*<\/script>/)?.[0] ?? '';
    expect(probe).not.toBe('');
    expect(probe).toContain(':active-view-transition');
  });
});

describe('Enlarged detail', () => {
  test.each(PAGES)('%s: the page loads the detail opener (sv:fig-open listener) through DetailViewer', (page) => {
    const { root } = load(page);
    expect(root.querySelectorAll('dialog.detail[data-dialog="detail"]')).toHaveLength(1);
    const scripts = root.querySelectorAll('script[type="module"]').map((s) => s.getAttribute('src') ?? '');
    expect(scripts.some((s) => /DetailViewer/.test(s))).toBe(true);
  });
});
