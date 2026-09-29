/**
 * Fonts on the built site (SPEC §2.1, §7.2 · WP7).
 *  · the five self-hosted files are subsets (tools/subset-fonts.mjs) of the fontsource files: every character a built
 *    page can show (page text, the Sheet-list index, script strings) that the full font has, its subset has too — so a
 *    subset never hands a character of hers to a fallback face. New copy with a new character fails here: rerun the
 *    tool, then rebuild;
 *  · every page preloads all five (her italic and the mono sheet numbers are in every first viewport), and the files
 *    it preloads are the ones its @font-face rules use.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fontace } from 'fontace';
import { beforeAll, describe, expect, test } from 'vitest';
import { DIST, distExists, load, PAGES } from './helpers';

beforeAll(() => {
  if (!distExists()) throw new Error('dist/ is missing — run `npm run build` first.');
});

const ROOT = path.resolve('.');
const FONTS: Record<string, string> = {
  'newsreader-roman.woff2': '@fontsource-variable/newsreader/files/newsreader-latin-opsz-normal.woff2',
  'newsreader-italic.woff2': '@fontsource-variable/newsreader/files/newsreader-latin-opsz-italic.woff2',
  'plex-sans.woff2': '@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wdth-normal.woff2',
  'plex-mono-400.woff2': '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2',
  'plex-mono-500.woff2': '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2',
};

/** the code points a font file maps */
function coverage(file: string): (cp: number) => boolean {
  const ranges = fontace(fs.readFileSync(file) as never).unicodeRangeArray.map((r) => {
    const [a, b] = r.replace(/^U\+/i, '').split('-');
    return [parseInt(a, 16), parseInt(b ?? a, 16)] as const;
  });
  return (cp) => ranges.some(([a, b]) => cp >= a && cp <= b);
}

/** every character the built site can put on screen: page text and attributes, the search index, script strings */
function siteChars(): Set<number> {
  const set = new Set<number>();
  const add = (s: string) => { for (const ch of s) set.add(ch.codePointAt(0)!); };
  for (const page of PAGES) {
    const { root, raw } = load(page);
    add(root.text);
    for (const m of raw.matchAll(/\s(?:alt|title|aria-label|placeholder|value|content|data-[\w-]+)="([^"]*)"/g)) add(m[1]);
  }
  const walk = (dir: string): string[] => fs.readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return fs.statSync(p).isDirectory() ? walk(p) : [p];
  });
  for (const f of walk(DIST).filter((f) => /\.(json|js)$/.test(f))) add(fs.readFileSync(f, 'utf8'));
  return set;
}

describe('font subsets (tools/subset-fonts.mjs)', () => {
  const chars = siteChars();
  test.each(Object.entries(FONTS))('%s has every character of the site that its source font has', (name, src) => {
    const full = coverage(path.join(ROOT, 'node_modules', src));
    const sub = coverage(path.join(ROOT, 'src', 'assets', 'fonts', name));
    const missing = [...chars].filter((cp) => full(cp) && !sub(cp)).map((cp) => `U+${cp.toString(16).toUpperCase().padStart(4, '0')} ${String.fromCodePoint(cp)}`);
    expect(missing, 'new characters in the copy: run `node tools/subset-fonts.mjs`, then rebuild').toEqual([]);
    // and it is a real subset (the build serves it, not the full file)
    expect(fs.statSync(path.join(ROOT, 'src', 'assets', 'fonts', name)).size).toBeLessThan(fs.statSync(path.join(ROOT, 'node_modules', src)).size);
  });
});

describe.each(PAGES)('%s', (page) => {
  test('preloads all five font files, the ones its @font-face rules use', () => {
    const { root } = load(page);
    const preloads = root.querySelectorAll('link[rel="preload"][as="font"]').map((l) => l.getAttribute('href')!);
    expect(preloads).toHaveLength(5);
    const faces = root.querySelectorAll('style').map((s) => s.text).join('');
    for (const href of preloads) {
      expect(faces).toContain(href);
      expect(fs.existsSync(path.join(DIST, href)), href).toBe(true);
    }
    for (const l of root.querySelectorAll('link[rel="preload"][as="font"]')) expect(l.hasAttribute('crossorigin')).toBe(true);
  });
});
