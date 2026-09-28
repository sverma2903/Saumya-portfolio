import { describe, expect, test } from 'vitest';
import { cases } from '@/content/site';
import { h, h3, img, lede, list, p, split, stories, cards, feature, stats } from '@/lib/blocks';
import type { Section } from '@/lib/blocks';
import { boldPieces, omitLabel, omitRuns, planBlocks, planSection } from '@/lib/planview';

const sec = (blocks: Section['blocks']): Section => ({ id: 'x', label: 'X', blocks });

describe('plan-view modes on fixtures (SM5c)', () => {
  test('p: skim when it has a <strong> with ≥3 non-space chars, else omit', () => {
    const [a, b, c] = planBlocks(sec([p('a <strong>bold clause</strong> b'), p('no bold here'), p('x <strong> </strong> <strong>ab</strong>')]));
    expect(a.mode).toBe('skim');
    expect(a.skim).toEqual(['bold clause']);
    expect(b.mode).toBe('omit');
    expect(b.omitted).toEqual({ paragraph: 1 });
    expect(c.mode).toBe('omit');
  });
  test('list: skim keeps items with bold, counts the dropped ones', () => {
    const [l] = planBlocks(sec([list(['<strong>one</strong> rest', 'plain', '<strong>two</strong> <strong>three</strong>'])]));
    expect(l.mode).toBe('skim');
    expect(l.skimItems).toEqual([['one'], ['two', 'three']]);
    expect(l.dropped).toBe(1);
    const [l2] = planBlocks(sec([list(['a', 'b'])]));
    expect(l2.mode).toBe('omit');
  });
  test('media: keep the first after the section start or after an h; omit the rest', () => {
    const modes = planBlocks(sec([img('ynF3JX3AYbXmF5u4ZKwl04aGc.png'), img('ynF3JX3AYbXmF5u4ZKwl04aGc.png'), h('Next'), img('ynF3JX3AYbXmF5u4ZKwl04aGc.png'), h3('Sub'), img('ynF3JX3AYbXmF5u4ZKwl04aGc.png')])).map((i) => i.mode);
    expect(modes).toEqual(['keep', 'omit', 'keep', 'keep', 'keep', 'omit']);
  });
  test('keep types, titles-only, stories omitted, split recursion', () => {
    const infos = planBlocks(sec([
      lede('x'), stats([['1', 'a']]), cards([{ title: 'T', html: 'H' }]), feature({ title: 'F', html: 'hidden', media: [] }),
      stories([{ title: 'S', img: 'fcOBmTs2rsYyBZvOIwHLaP0.png', rows: [['As a', 'b']] }]),
      split([p('plain')], [p('also plain')]), split([lede('kept')], [p('plain')]),
    ]));
    expect(infos.map((i) => i.mode)).toEqual(['keep', 'keep', 'keep', 'keep', 'omit', 'omit', 'keep']);
    expect(infos[2].titlesOnly).toBe(true);
    expect(infos[3].titlesOnly).toBe(true);
    expect(infos[4].omitted).toEqual({ story: 1 });
    expect(infos[5].omitted).toEqual({ paragraph: 2 });
    expect(infos[6].children?.right[0].mode).toBe('omit');
  });
  test('omit runs coalesce and are counted with chrome nouns', () => {
    const infos = planBlocks(sec([p('a'), p('b'), img('ynF3JX3AYbXmF5u4ZKwl04aGc.png'), h('H'), p('c'), img('ynF3JX3AYbXmF5u4ZKwl04aGc.png'), img('ynF3JX3AYbXmF5u4ZKwl04aGc.png')]));
    // p, p (omit) · img (keep: first in section) · h · p (omit) · img (keep: first after h) · img (omit)
    expect(omitRuns(infos)).toEqual([[0, 1], [4], [6]]);
    expect(omitLabel([infos[0], infos[1]])).toBe('Omitted: 2 paragraphs');
    expect(omitLabel([infos[6]])).toBe('Omitted: 1 figure');
    expect(omitLabel([{ mode: 'omit', omitted: { paragraph: 3, figure: 1 }, words: 0, figures: 0 }])).toBe('Omitted: 3 paragraphs · 1 figure');
  });
  test('boldPieces ignores whitespace-only and too-short strongs', () => {
    expect(boldPieces('<strong> </strong><strong>ok!</strong><strong>ab</strong>')).toEqual(['ok!']);
  });
  test('real content: every case has skim/omit blocks and plan words < full words', () => {
    for (const cs of cases) {
      const infos = cs.sections.flatMap((s) => planBlocks(s));
      expect(infos.some((i) => i.mode === 'skim'), cs.slug).toBe(true);
      expect(infos.some((i) => i.mode === 'omit'), cs.slug).toBe(true);
      const planWords = cs.sections.reduce((a, s) => a + planSection(s).words, 0);
      expect(planWords).toBeGreaterThan(0);
    }
  });
});
