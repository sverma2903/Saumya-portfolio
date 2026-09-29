/**
 * Links on the built site (SPEC §8.5 · WP7).
 *  · every internal link resolves: its path is a built file (clean URLs, like Cloudflare's auto-trailing-slash) and its
 *    fragment is an element id on the target page — nav, index rows, Key plan "Go ↓", Decision-schedule sources,
 *    permalink bubbles, match lines, the skip link, the level rail;
 *  · the Framer-era section anchors are all present (§5.2.9);
 *  · every Sheet-list anchor (search-index details and passage shards) lands on an id on its page;
 *  · external links are https, open in a new tab with rel=noopener and the "opens in a new tab" description;
 *  · every `plate-*` view-transition name is unique on its page (inline names and the cards' --_vt).
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'node-html-parser';
import { beforeAll, describe, expect, test } from 'vitest';
import { legacyAnchors } from '@/data/legacy-anchors';
import { DIST, distExists, load, PAGES } from './helpers';
import type { PageKey } from '@/lib/verbatim';

beforeAll(() => {
  if (!distExists()) throw new Error('dist/ is missing — run `npm run build` first.');
});

const ORIGIN = 'https://www.saumya-verma.com';

/** the dist file a root-relative path serves, like Cloudflare's assets with html_handling auto-trailing-slash */
function fileFor(p: string): string | null {
  const clean = decodeURIComponent(p.replace(/\/+$/, '')) || '/index';
  const cands = [path.join(DIST, clean), path.join(DIST, `${clean}.html`), path.join(DIST, clean, 'index.html')];
  return cands.find((c) => fs.existsSync(c) && fs.statSync(c).isFile()) ?? null;
}
const idCache = new Map<string, Set<string>>();
function idsOf(file: string): Set<string> {
  let s = idCache.get(file);
  if (!s) {
    const root = parse(fs.readFileSync(file, 'utf8'), { comment: false, blockTextElements: { script: false, style: false, noscript: true } });
    s = new Set([...root.querySelectorAll('[id]').map((e) => e.id), ...root.querySelectorAll('a[name]').map((e) => e.getAttribute('name')!)]);
    idCache.set(file, s);
  }
  return s;
}
const pageFile = (page: PageKey) => path.join(DIST, page === 'index' ? 'index.html' : `${page}.html`);

describe.each(PAGES)('%s', (page) => {
  test('every internal link resolves to a built page and, with a fragment, to an id on it', () => {
    const { root } = load(page);
    const bad: string[] = [];
    for (const a of root.querySelectorAll('a[href]')) {
      const href = a.getAttribute('href')!;
      if (/^(mailto:|tel:|https?:|\/\/)/.test(href)) continue;
      const u = new URL(href, `${ORIGIN}/${page === 'index' ? '' : page}`);
      const target = href.startsWith('#') ? pageFile(page) : fileFor(u.pathname);
      if (!target) { bad.push(`${href} → no file`); continue; }
      const frag = decodeURIComponent(u.hash.slice(1));
      if (frag && !idsOf(target).has(frag)) bad.push(`${href} → #${frag} not on ${path.basename(target)}`);
    }
    expect(bad).toEqual([]);
  });

  test('no absolute link back to this site (every internal link is root-relative)', () => {
    const { root } = load(page);
    const self = root.querySelectorAll('a[href]').map((a) => a.getAttribute('href')!).filter((h) => /^https?:\/\/(www\.)?saumya-verma\.com/.test(h));
    expect(self).toEqual([]);
  });

  test('external links: https, a new tab with rel=noopener, and the "opens in a new tab" description', () => {
    const { root } = load(page);
    const bad: string[] = [];
    for (const a of root.querySelectorAll('a[href^="http"]')) {
      const href = a.getAttribute('href')!;
      if (!href.startsWith('https://')) bad.push(`not https: ${href}`);
      if (a.getAttribute('target') === '_blank') {
        if (!/\bnoopener\b/.test(a.getAttribute('rel') ?? '')) bad.push(`no rel=noopener: ${href}`);
        if (!(a.getAttribute('aria-describedby') ?? '').split(/\s+/).includes('sv-newtab')) bad.push(`no new-tab description: ${href}`);
      }
    }
    expect(bad).toEqual([]);
  });

  test('plate-* view-transition names are unique on the page (inline names and card --_vt)', () => {
    const { root } = load(page);
    const names = root.querySelectorAll('[style]').flatMap((e) => {
      const st = e.getAttribute('style') ?? '';
      return [...st.matchAll(/(?:view-transition-name|--_vt)\s*:\s*(plate-[\w-]+)/g)].map((m) => `${/--_vt/.test(m[0]) ? 'vt' : 'name'}:${m[1]}`);
    });
    const dup = names.filter((n, i) => names.indexOf(n) !== i);
    expect(dup).toEqual([]);
  });
});

describe('legacy anchors (Framer-era section links, §5.2.9)', () => {
  test.each(Object.entries(legacyAnchors))('%s', (slug, map) => {
    const ids = idsOf(pageFile(slug as PageKey));
    const { root } = load(slug as PageKey);
    for (const [alias, target] of Object.entries(map)) {
      expect(ids.has(alias), `${slug}#${alias}`).toBe(true);
      expect(ids.has(target), `${slug}#${target}`).toBe(true);
      // the alias sits at its target: the chapter's top edge, or inside the heading / title / block it names
      const el = root.querySelector(`[id="${alias}"]`)!;
      expect(el.getAttribute('data-alias-of'), `${slug}#${alias}`).toBe(target);
      const host = root.querySelector(`[id="${target}"]`)!;
      expect(host.tagName === 'SECTION' ? el.parentNode === host : host.querySelector(`[id="${alias}"]`) != null, `${slug}#${alias} inside #${target}`).toBe(true);
    }
  });
  // polish r1: her Framer ids that are not in a case chapter
  test.each([['index', 'projects', 'index'], ['fun', 'projects', null]] as const)('%s#%s', (page, alias, inside) => {
    const { root } = load(page as PageKey);
    const el = root.querySelector(`[id="${alias}"]`);
    expect(el, `${page}#${alias}`).not.toBeNull();
    if (inside) expect(el!.closest(`#${inside}`), `${page}#${alias} inside #${inside}`).not.toBeNull();
  });
});

describe('Sheet list anchors', () => {
  const main = JSON.parse(fs.readFileSync(path.join(DIST, 'search-index.json'), 'utf8')) as {
    pages: { href: string; slug?: string; ids?: string[] }[];
    items: { k: string; p: number; a?: string }[];
    shards: Record<string, number>;
  };
  test('every page entry is a built page (or an external link) and its level ids exist', () => {
    for (const p of main.pages) {
      if (/^https:/.test(p.href)) continue;
      const f = fileFor(p.href);
      expect(f, p.href).toBeTruthy();
      for (const id of p.ids ?? []) expect(idsOf(f!).has(id), `${p.href}#${id}`).toBe(true);
    }
  });
  test('every detail anchor exists on its page', () => {
    const bad = main.items.filter((i) => i.a).filter((i) => !idsOf(fileFor(main.pages[i.p].href)!).has(i.a!));
    expect(bad.map((i) => `${main.pages[i.p].href}#${i.a}`)).toEqual([]);
  });
  test.each(Object.entries(main.shards))('passage shard %s: every anchor exists on its page', (slug, p) => {
    const shard = JSON.parse(fs.readFileSync(path.join(DIST, 'search-index', `${slug}.json`), 'utf8')) as { items: { a?: string }[] };
    const ids = idsOf(fileFor(main.pages[p].href)!);
    const bad = shard.items.filter((i) => i.a && !ids.has(i.a)).map((i) => i.a);
    expect(bad).toEqual([]);
    expect(shard.items.length).toBeGreaterThan(20);
  });
});
