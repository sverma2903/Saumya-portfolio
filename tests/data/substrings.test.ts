/**
 * The verbatim guard for every string we SELECT from her text (SPEC §8.5): index lines, readouts and their
 * typographic splits, Key-plan overrides, both halves of every decision, and her labels.
 */
import { describe, expect, test } from 'vitest';
import fixture from '../fixtures/original-site.json';
import { cases, labels } from '@/content/site';
import { sheetRefs, keyplanOverrides } from '@/data/sheets';
import { decisions, THREE_CHANGES } from '@/data/decisions';
import { corpus, findBlock, isVerbatim, ref, type CaseSlug } from '@/lib/verbatim';
import { normalize } from '@/lib/text';

describe('sheets.ts VerbatimRefs (index lines, tags, readouts, Key-plan overrides)', () => {
  const refs = sheetRefs();
  test('there are refs to check', () => expect(refs.length).toBeGreaterThan(40));
  test.each(refs.map((r) => [r.where, r] as const))('%s', (_, r) => {
    expect(isVerbatim(r.ref), `${r.ref.src}: "${r.ref.text}"`).toBe(true);
    if (r.joinedWith) {
      const joined = { src: r.ref.src, text: r.ref.text + r.joinedWith.text };
      expect(isVerbatim(joined), `joined: "${joined.text}"`).toBe(true);
      expect(r.ref.text + r.joinedWith.text).toBe(joined.text); // splits never add or remove characters
    }
  });
  test('every Key-plan override targets a real section', () => {
    for (const k of Object.keys(keyplanOverrides)) {
      const [slug, sid] = k.split('.');
      const cs = cases.find((c) => c.slug === slug);
      expect(cs?.sections.some((s) => s.id === sid), k).toBe(true);
    }
  });
});

describe('decisions.ts (SM5b): both halves verbatim and anchored', () => {
  for (const [slug, rows] of Object.entries(decisions)) {
    test(slug, () => {
      const cs = cases.find((c) => c.slug === slug)!;
      rows.forEach((d, i) => {
        expect(isVerbatim(ref(slug as CaseSlug, d.considered)), `${slug} D-${i + 1} considered`).toBe(true);
        expect(isVerbatim(ref(slug as CaseSlug, d.decided)), `${slug} D-${i + 1} decided`).toBe(true);
        expect(findBlock(cs, d.decided) ?? findBlock(cs, d.considered), `${slug} D-${i + 1} anchor`).toBeTruthy();
      });
    });
  }
  test('the three changes are her bold lead-ins', () => {
    const strongs = corpus('cloudflare').flatMap((e) => [...e.raw.matchAll(/<strong>([\s\S]*?)<\/strong>/g)].map((m) => normalize(m[1])));
    for (const s of THREE_CHANGES) expect(strongs).toContain(s);
  });
});

describe('site.ts labels are verbatim from her original pages', () => {
  const pages = (fixture as { pages: Record<string, { strings: string[]; ignored: string[] }> }).pages;
  const all = Object.values(pages).flatMap((p) => [...p.strings, ...p.ignored]);
  const flat = [labels.selected, labels.story, labels.loves, labels.architecture, labels.conceptAnalysis, labels.nav.about, labels.nav.play, labels.nav.resume];
  test.each(flat)('%s', (l) => expect(all).toContain(l));
});
