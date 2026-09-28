/**
 * WP1 · the Sheet list (SPEC §4.4): the build-time index (lib/search-index.ts) and the matcher (scripts/palette/search.ts).
 * Acceptance: "constraint" → ≥ 3 Cloudflare passages · "AI informs" → the PFF lede · "interviews" → sheets + details +
 * passages · /search-index.json ≤ 16 KB gz · nothing generated (every string verbatim) · anchors are the rendered ids.
 */
import { describe, expect, test } from 'vitest';
import { cases } from '@/content/site';
import { buildSearchIndex, indexStrings, mainIndex, shardIndex } from '@/lib/search-index';
import { chapterCtxs } from '@/lib/blocks-ctx';
import { blockTexts, isVerbatim, ref, type CaseSlug } from '@/lib/verbatim';
import { SHEET_NO } from '@/data/sheets';
import { Corpus, markRanges, search, textDirective, tokens } from '@/scripts/palette/search';

const main = mainIndex();
const corpus = new Corpus(main);
for (const slug of Object.keys(main.shards)) corpus.addShard(shardIndex(slug));
const pageOf = (slug: string) => main.pages.findIndex((p) => p.slug === slug && p.kind === 'case');

async function gzipSize(s: string): Promise<number> {
  const stream = new Blob([s]).stream().pipeThrough(new CompressionStream('gzip'));
  return (await new Response(stream).arrayBuffer()).byteLength;
}

describe('index', () => {
  test('/search-index.json is within its budget (≤ 16 KB gz); every shard is small', async () => {
    expect(await gzipSize(JSON.stringify(main))).toBeLessThanOrEqual(16 * 1024);
    for (const slug of Object.keys(main.shards)) expect(await gzipSize(JSON.stringify(shardIndex(slug)))).toBeLessThanOrEqual(8 * 1024);
  });

  test('the shards and the main file together hold the whole index', () => {
    const all = buildSearchIndex();
    const passages = all.items.filter((i) => i.k === 'passage').length;
    const inMain = main.items.filter((i) => i.k === 'passage').length;
    const inShards = Object.keys(main.shards).reduce((n, s) => n + shardIndex(s).items.length, 0);
    expect(inMain + inShards).toBe(passages);
    expect(corpus.entries.filter((e) => e.kind === 'passage')).toHaveLength(passages);
  });

  test('nothing is generated: every shipped string is an exact substring of her text', () => {
    // a case sheet's row also quotes her home card (title, line, tags: site.ts), so 'site' is a valid source everywhere
    const hers = (text: string, slug?: CaseSlug) => isVerbatim(ref('site', text)) || (!!slug && isVerbatim(ref(slug, text)));
    const bad = indexStrings(buildSearchIndex()).filter(({ text, page }) => !hers(text, page.kind === 'case' ? (page.slug as CaseSlug) : undefined));
    expect(bad.map((b) => `${b.where}: ${b.text}`)).toEqual([]);
  });

  test('anchors are the rendered ids (lib/ids via blocks-ctx): block ids for passages, heading ids for details', () => {
    for (const cs of cases) {
      const p = pageOf(cs.slug);
      const blockIds = new Set(blockTexts(cs).map((b) => b.id));
      const headingIds = new Set(chapterCtxs(cs, SHEET_NO[cs.slug as CaseSlug]).flatMap((ch) => ch.ctxs.map((c) => c.headingId).filter(Boolean)));
      const pg = main.pages[p];
      expect(pg.ids).toEqual(cs.sections.map((s) => s.id));
      for (const it of shardIndex(cs.slug).items) expect(blockIds.has(it.a!), `${cs.slug} passage ${it.a}`).toBe(true);
      for (const it of main.items.filter((i) => i.p === p && i.k === 'detail')) expect(headingIds.has(it.a!) || blockIds.has(it.a!), `${cs.slug} detail ${it.a}`).toBe(true);
    }
  });

  test('pages: A-000, the six cases, B-100, C-100 and the two external links', () => {
    expect(main.pages.map((p) => p.sheet)).toEqual(['A-000', 'A-101', 'A-102', 'A-103', 'A-104', 'A-105', 'A-106', 'B-100', 'C-100', '↗', '↗']);
  });
});

describe('matching (§4.4 scoring)', () => {
  test('"constraint" returns at least 3 Cloudflare passages', () => {
    const g = search(corpus, 'constraint', -1);
    const cf = pageOf('cloudflare');
    expect(g.passages.filter((h) => h.e.p === cf).length).toBeGreaterThanOrEqual(3);
    expect(g.passages.some((h) => h.e.t === 'But that conflicts with a real technical constraint.')).toBe(true);
  });

  test('"AI informs" returns the PFF lede', () => {
    const g = search(corpus, 'AI informs', -1);
    const pff = pageOf('pff');
    expect(g.passages.some((h) => h.e.p === pff && h.e.t === 'Core Principle 1: AI informs, humans decide')).toBe(true);
  });

  test('"interviews" returns sheets, details and passages', () => {
    const g = search(corpus, 'interviews', -1);
    expect(g.sheets.length).toBeGreaterThan(0);
    expect(g.details.length).toBeGreaterThan(0);
    expect(g.passages.length).toBeGreaterThan(0);
  });

  test('group caps (6, Passages 8) and the found count', () => {
    const g = search(corpus, 'the', -1);
    expect(g.sheets.length).toBeLessThanOrEqual(6);
    expect(g.levels.length).toBeLessThanOrEqual(6);
    expect(g.details.length).toBeLessThanOrEqual(6);
    expect(g.passages.length).toBeLessThanOrEqual(8);
    expect(g.passageTotal).toBeGreaterThan(8);
  });

  test('every token must appear; the last one may be a partial word', () => {
    expect(tokens('  AI  a Informs ')).toEqual(['ai', 'informs']);
    expect(search(corpus, 'intervi', -1).passages.length).toBeGreaterThan(0);
    expect(search(corpus, 'constraint zebra', -1).passages).toEqual([]);
  });

  test('levels and sheet codes are found; the current page ranks first on a tie', () => {
    const g = search(corpus, 'ideate', pageOf('pff'));
    expect(g.levels[0].e.p).toBe(pageOf('pff'));
    expect(search(corpus, 'a-103', -1).sheets[0].e.t).toBe('NMLS Resource Center Redesign');
    // a sheet found through her line/readout explains itself with that verbatim piece
    const orbit = search(corpus, 'faculty interviews', -1).sheets.find((h) => h.e.p === pageOf('orbit'));
    expect(orbit?.why).toBe('in-depth faculty interviews');
  });

  test('a query runs well under 3 ms over the whole set (median of 20 rounds, so machine load cannot flake it)', () => {
    const qs = ['constraint', 'AI informs', 'interviews', 'journey map', 'approval chain'];
    for (let i = 0; i < 3; i++) for (const q of qs) search(corpus, q, 1); // warm the JIT
    const perQuery: number[] = [];
    for (let r = 0; r < 20; r++) {
      const t0 = performance.now();
      for (const q of qs) search(corpus, q, 1);
      perQuery.push((performance.now() - t0) / qs.length);
    }
    perQuery.sort((a, b) => a - b);
    expect(perQuery[perQuery.length >> 1]).toBeLessThan(3);
  });
});

describe('citation helpers', () => {
  test('text directive: ≤ 10 words whole; else first 6 + last 4; - , & percent-encoded; context only from the same element', () => {
    expect(textDirective('But that conflicts with a real technical constraint.')).toBe(':~:text=But%20that%20conflicts%20with%20a%20real%20technical%20constraint.');
    const long = 'Real-world product redesign teaches you to design around constraints, not in spite of them.';
    expect(textDirective(long)).toBe(':~:text=Real%2Dworld%20product%20redesign%20teaches%20you%20to,in%20spite%20of%20them.');
    expect(textDirective('One, two - three & four five six seven eight nine ten eleven.')).toBe(':~:text=One%2C%20two%20%2D%20three%20%26%20four,eight%20nine%20ten%20eleven.');
    expect(textDirective('A b c.', 'x y z w.', undefined)).toBe(':~:text=y%20z%20w.-,A%20b%20c.');
    expect(textDirective('A b c.', undefined, 'Next words here.')).toBe(':~:text=A%20b%20c.,-Next%20words%20here.');
    expect(textDirective('R&D matters.')).toContain('R%26D');
  });

  test('query marks never add or drop characters', () => {
    const t = 'Constraints, not in spite of them: a constraint.';
    const r = markRanges(t, ['constraint']);
    expect(r.map(([a, b]) => t.slice(a, b).toLowerCase())).toEqual(['constraint', 'constraint']);
  });
});
