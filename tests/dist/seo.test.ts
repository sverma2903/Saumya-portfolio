/**
 * SEO, sharing and structured data on the built site (SPEC §7.3 · WP7).
 *  · <title> and meta description per the §7.3 table (her words, tags stripped), unique titles;
 *  · canonical = og:url = the page's clean URL; the 404 has neither, and is noindex;
 *  · Open Graph / Twitter: og:type, og:image = the page's 1200 × 630 share sheet (the PNG exists in dist with that
 *    size), og:image:alt, twitter:card = summary_large_image; theme-color;
 *  · JSON-LD parses; Person (/, /about) with name, url, jobTitle, worksFor, alumniOf, sameAs; WebSite on /; each case a
 *    CreativeWork crediting that same Person (@id) + a BreadcrumbList with absolute items;
 *  · sitemap.xml lists exactly the nine canonical URLs; robots.txt allows all and points to it;
 *  · the /og/* sheet pages never ship.
 */
import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, test } from 'vitest';
import { about, cases, home, play } from '@/content/site';
import { deckOf } from '@/data/sheets';
import { chrome } from '@/data/chrome';
import { stripHtml } from '@/lib/text';
import { DIST, distExists, load, PAGES } from './helpers';
import type { CaseSlug, PageKey } from '@/lib/verbatim';

beforeAll(() => {
  if (!distExists()) throw new Error('dist/ is missing — run `npm run build` first.');
});

const ORIGIN = 'https://www.saumya-verma.com';
const P = chrome.p0.person;
const INDEXABLE = PAGES.filter((p) => p !== '404');
const pathOf = (p: PageKey) => (p === 'index' ? '/' : `/${p}`);
const meta = (page: PageKey, sel: string) => load(page).root.querySelector(sel)?.getAttribute('content') ?? null;

function expected(page: PageKey): { title: string; description: string } {
  if (page === 'index') return { title: `${P} — ${chrome.p0.jobTitle}`, description: stripHtml(home.headline) };
  if (page === 'about') return { title: `${chrome.wp1.titleBar.about} — ${P}`, description: stripHtml(about.headline) };
  if (page === 'fun') return { title: `${chrome.wp1.titleBar.play} — ${P}`, description: play.sub };
  if (page === '404') return { title: `${chrome.wp1.titleBar.notInSet} — ${P}`, description: chrome.wp1.notFound.h1 };
  const cs = cases.find((c) => c.slug === page)!;
  return { title: `${cs.metaTitle} — ${P}`, description: deckOf(page as CaseSlug).text };
}

/** width × height from a PNG's IHDR */
function pngSize(file: string): [number, number] {
  const b = fs.readFileSync(file);
  expect(b.toString('ascii', 1, 4)).toBe('PNG');
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}
function ld(page: PageKey): Record<string, unknown>[] {
  return load(page).root.querySelectorAll('script[type="application/ld+json"]').flatMap((s) => {
    const v = JSON.parse(s.text);
    return Array.isArray(v) ? v : [v];
  });
}

describe.each(PAGES)('%s', (page) => {
  test('title and meta description (§7.3 table)', () => {
    const e = expected(page);
    expect(load(page).root.querySelector('title')?.text).toBe(e.title);
    expect(meta(page, 'meta[name=description]')).toBe(e.description);
    expect(meta(page, 'meta[name=theme-color]')).toBe('#EEEBE3');
  });

  test('canonical, robots and Open Graph / Twitter tags', () => {
    const { root } = load(page);
    const canonical = root.querySelector('link[rel=canonical]')?.getAttribute('href') ?? null;
    if (page === '404') {
      expect(canonical).toBeNull();
      expect(meta(page, 'meta[name=robots]')).toBe('noindex');
      return;
    }
    expect(canonical).toBe(new URL(pathOf(page), ORIGIN).href);
    expect(meta(page, 'meta[name=robots]')).toBeNull();
    expect(meta(page, 'meta[property="og:url"]')).toBe(canonical);
    expect(meta(page, 'meta[property="og:type"]')).toBe(cases.some((c) => c.slug === page) ? 'article' : 'website');
    expect(meta(page, 'meta[property="og:title"]')).toBe(expected(page).title);
    expect(meta(page, 'meta[property="og:description"]')).toBe(expected(page).description);
    expect(meta(page, 'meta[property="og:site_name"]')).toBe(P);
    expect(meta(page, 'meta[name="twitter:card"]')).toBe('summary_large_image');
    const img = meta(page, 'meta[property="og:image"]')!;
    expect(img).toBe(`${ORIGIN}/og/${page}.png`);
    const file = path.join(DIST, new URL(img).pathname);
    expect(fs.existsSync(file), file).toBe(true);
    expect(pngSize(file)).toEqual([1200, 630]);
    expect(fs.statSync(file).size).toBeLessThan(600 * 1024); // messengers drop previews above ~600 KB
    expect(meta(page, 'meta[property="og:image:width"]')).toBe('1200');
    expect(meta(page, 'meta[property="og:image:height"]')).toBe('630');
    const alt = meta(page, 'meta[property="og:image:alt"]') ?? '';
    expect(alt.length).toBeGreaterThan(30);
    expect(meta(page, 'meta[name="twitter:image:alt"]')).toBe(alt);
  });

  test('titles are unique across the site', () => {
    const titles = PAGES.map((p) => load(p).root.querySelector('title')?.text);
    expect(new Set(titles).size).toBe(PAGES.length);
  });
});

describe('structured data (JSON-LD)', () => {
  const person = (page: PageKey) => ld(page).find((n) => n['@type'] === 'Person') as Record<string, any> | undefined;
  test.each(['index', 'about'] as PageKey[])('%s: Person', (page) => {
    const p = person(page)!;
    expect(p).toBeTruthy();
    expect(p['@context']).toBe('https://schema.org');
    expect(p['@id']).toBe(`${ORIGIN}/#person`);
    expect(p.name).toBe(P);
    expect(p.url).toBe(`${ORIGIN}/`);
    expect(p.jobTitle).toBe('Product Designer');
    expect(p.worksFor).toEqual({ '@type': 'Organization', name: 'Fulcrum GT' });
    expect(p.alumniOf.map((a: any) => a.name)).toEqual(['University of Maryland, College Park', 'NIT Bhopal']);
    expect(p.sameAs).toEqual([expect.stringMatching(/^https:\/\/www\.linkedin\.com\//)]);
    expect(fs.existsSync(path.join(DIST, new URL(p.image).pathname))).toBe(true);
  });
  test('home: WebSite', () => {
    const w = ld('index').find((n) => n['@type'] === 'WebSite') as Record<string, any>;
    expect(w).toMatchObject({ name: P, url: `${ORIGIN}/` });
  });
  test.each(cases.map((c) => c.slug))('%s: CreativeWork by the same Person + BreadcrumbList', (slug) => {
    const nodes = ld(slug as PageKey);
    const cw = nodes.find((n) => n['@type'] === 'CreativeWork') as Record<string, any>;
    const cs = cases.find((c) => c.slug === slug)!;
    expect(cw).toMatchObject({ name: cs.title, description: deckOf(slug as CaseSlug).text, url: `${ORIGIN}/${slug}`, image: `${ORIGIN}/og/${slug}.png` });
    expect(cw.author).toMatchObject({ '@type': 'Person', '@id': `${ORIGIN}/#person`, name: P });
    const bc = nodes.find((n) => n['@type'] === 'BreadcrumbList') as Record<string, any>;
    expect(bc.itemListElement.map((i: any) => i.position)).toEqual([1, 2]);
    expect(bc.itemListElement.map((i: any) => i.item)).toEqual([`${ORIGIN}/`, `${ORIGIN}/${slug}`]);
  });
  test('no structured data on the 404 sheet', () => {
    expect(ld('404')).toEqual([]);
  });
});

describe('sitemap.xml and robots.txt', () => {
  test('the sitemap lists exactly the nine canonical URLs', () => {
    const xml = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const canon = INDEXABLE.map((p) => load(p).root.querySelector('link[rel=canonical]')!.getAttribute('href'));
    expect(locs.sort()).toEqual([...canon].sort());
    expect(locs).toHaveLength(9);
  });
  test('robots.txt allows everything and points to the sitemap', () => {
    const txt = fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8');
    expect(txt).toMatch(/^User-agent: \*$/m);
    expect(txt).toMatch(/^Allow: \/$/m);
    expect(txt).not.toMatch(/^Disallow: \/\s*$/m);
    expect(txt).toMatch(new RegExp(`^Sitemap: ${ORIGIN}/sitemap\\.xml$`, 'm'));
  });
  test('the share-sheet pages (/og/*) are not in the build; their PNGs are', () => {
    const og = fs.readdirSync(path.join(DIST, 'og'));
    expect(og.filter((f) => f.endsWith('.html'))).toEqual([]);
    expect(og.filter((f) => f.endsWith('.png')).sort()).toEqual([...INDEXABLE].map((p) => `${p}.png`).sort());
  });
});
