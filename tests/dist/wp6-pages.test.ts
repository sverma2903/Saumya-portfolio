/**
 * About (B-100) and Play (C-100) invariants in the built HTML (tests/dist/wp6-pages.test.ts).
 * Written by WP6 as a proposal for WP7; adopted at integration. Works on the P0 Plate and on
 * WP4b's Plate (videos may carry src or data-src).
 */
import { beforeAll, describe, expect, test } from 'vitest';
import { distExists, fidelityText, load } from './helpers';
import { about, play } from '@/content/site';
import { stripHtml } from '@/lib/text';
import { fileOf } from '@/lib/staging';

beforeAll(() => {
  if (!distExists()) throw new Error('dist/ is missing — run `npm run build` first.');
});

describe('/about · B-100', () => {
  test('the portrait is her file as-is: high priority, no inline transform / filter / clip', () => {
    const { root } = load('about');
    const img = root.querySelectorAll('img').find((i) => (i.getAttribute('src') ?? '').includes(fileOf(about.portrait)));
    expect(img).toBeTruthy();
    expect(img!.getAttribute('fetchpriority')).toBe('high');
    const fig = img!.closest('.portrait');
    expect(fig).toBeTruthy();
    for (const el of [fig!, ...fig!.querySelectorAll('*')]) expect(el.getAttribute('style') ?? '').not.toMatch(/transform|rotate|filter|clip/);
    expect(fig!.querySelector('[data-fig]')).toBeFalsy(); // an avatar, not an Enlarged-detail figure
  });
  test('clause numbers B-100.1–.3 are chrome (aria-hidden); her three paragraphs are [data-v]', () => {
    const { root } = load('about');
    const nos = root.querySelectorAll('.story__no');
    expect(nos.map((n) => n.text.trim())).toEqual(['B-100.1', 'B-100.2', 'B-100.3']);
    for (const n of nos) expect(n.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelectorAll('.story__p[data-v]')).toHaveLength(about.story.length);
  });
  test('four loves: h3 in her words, bubbles 1–4 / B-100 as permalinks', () => {
    const { root } = load('about');
    const h3 = root.querySelectorAll('h3[data-v]').map((h) => stripHtml(h.innerHTML));
    const l = about.loves;
    expect(h3).toEqual([l.fiction.title, l.writing.title, l.meditation.title, l.sketching.title].map(stripHtml));
    const bubbles = root.querySelectorAll('.lt__b');
    expect(bubbles.map((b) => b.text.replace(/\s+/g, ''))).toEqual(['1B-100', '2B-100', '3B-100', '4B-100']);
  });
  test('the reference list keeps her links as authored (the 410 one too) and her titles adjacent', () => {
    const { root, raw } = load('about');
    const posts = about.loves.writing.posts;
    expect(root.querySelectorAll('.ref__a').map((a) => a.getAttribute('href'))).toEqual(posts.map((p) => p.href));
    expect(fidelityText(raw)).toContain(posts.map((p) => stripHtml(p.title)).join(' '));
  });
  test('Meditation is still: data-still, no enlarge trigger, no figure number', () => {
    const { root } = load('about');
    const still = root.querySelector('#meditation [data-still], #meditation[data-still]');
    expect(still).toBeTruthy();
    expect(root.querySelector('#meditation')!.querySelectorAll('[data-fig], button')).toHaveLength(0);
  });
  test('the salon hangs all seven: three scans on mounts, four photos as prints, FIG. 4.1–4.7, at native aspect', () => {
    const { root } = load('about');
    const sk = root.querySelectorAll('#sketching figure.sk');
    expect(sk).toHaveLength(about.loves.sketching.sketches.length);
    expect(sk.filter((f) => f.classList.contains('sk--mount'))).toHaveLength(3);
    expect(sk.filter((f) => f.classList.contains('sk--print'))).toHaveLength(4);
    const html = root.querySelector('#sketching')!.outerHTML; // the numbers ride on the enlarge controls
    for (let n = 1; n <= 7; n++) expect(html).toContain(`FIG. 4.${n}`);
    expect(root.querySelectorAll('#sketching [data-fig]')).toHaveLength(7);
  });
  test('the shelf: three covers with the book colours, nothing transformed at rest', () => {
    const { root } = load('about');
    const books = root.querySelectorAll('#historical-fiction .book');
    expect(books).toHaveLength(3);
    for (const b of books) expect(b.getAttribute('style') ?? '').not.toMatch(/transform|rotate|scale/);
  });
});

describe('/fun · C-100', () => {
  test('five pins in her order, with her titles and tags', () => {
    const { root } = load('fun');
    const pins = root.querySelectorAll('.pin');
    expect(pins.map((p) => stripHtml(p.querySelector('.pin__t')!.innerHTML))).toEqual(play.items.map((it) => stripHtml(it.title)));
    expect(pins.map((p) => stripHtml(p.querySelector('.pin__tag')!.innerHTML))).toEqual(play.items.map((it) => stripHtml(it.tag)));
  });
  test('ExpressLanes is staged at 1.2×; the others at 1×', () => {
    const { root } = load('fun');
    expect(root.querySelector('.pin--expresslanes')!.getAttribute('style')).toMatch(/--_scale:\s*1\.2\b/);
    expect(root.querySelectorAll('.pin[style*="--_scale"]')).toHaveLength(1);
  });
  test('Teachable never autoplays and loads nothing until asked', () => {
    const { root } = load('fun');
    const v = root.querySelectorAll('video').find((e) => (e.getAttribute('src') ?? e.getAttribute('data-src') ?? '').includes('6GwunOSeX0YVHJspIvJG7W3Q'));
    expect(v).toBeTruthy();
    expect(v!.hasAttribute('autoplay')).toBe(false);
    expect(v!.getAttribute('preload') ?? 'none').toBe('none');
  });
  test('no award styling: the FigBuild tag is a plain label like the others', () => {
    const { root } = load('fun');
    const tags = root.querySelectorAll('.pin__tag');
    expect(new Set(tags.map((t) => t.getAttribute('class')))).toHaveProperty('size', 1);
    expect(root.querySelector('.pin--conversense')!.outerHTML).not.toMatch(/award|badge|trophy|medal/i);
  });
  test('the legend: her 5 × 6 grid (14 letters, 16 material tiles), labelled; no Re-lay control', () => {
    const { root } = load('fun');
    const grid = root.querySelector('[data-xw]')!;
    expect(grid.getAttribute('role')).toBe('img');
    expect(grid.getAttribute('aria-label')).toBe('DATA, DESIGN, NERDS tiles');
    expect(grid.querySelectorAll('[data-xw-cell]')).toHaveLength(30);
    expect(grid.querySelectorAll('.xw__cell--letter').map((c) => c.text.trim()).join('')).toBe('DATAEISIGNERDS');
    expect(grid.querySelectorAll('.xw__cell--mat')).toHaveLength(16);
    expect(root.querySelector('[data-xw-relay]')).toBeNull(); // polish r1: no Re-lay control
    expect(root.querySelectorAll('[data-key-word] .legend__word').map((w) => w.text)).toEqual(['DATA', 'DESIGN', 'AI', 'NERDS']);
  });
});
