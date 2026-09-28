import { describe, expect, test } from 'vitest';
import { cases } from '@/content/site';
import { ACCENTS, COVERS, SHEET_NO, accentStyle, caseSheets, deckOf, nextCase, sheets } from '@/data/sheets';
import { legacyAnchors, aliasesFor } from '@/data/legacy-anchors';
import { allNarratives, chrome, narrative } from '@/data/chrome';
import { alt } from '@/data/alt';
import { facts } from '@/lib/staging';

const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

describe('sheets.ts', () => {
  test('ten rows: A-101…A-106, B-100, C-100 and two external', () => {
    expect(sheets.map((s) => s.no)).toEqual(['A-101', 'A-102', 'A-103', 'A-104', 'A-105', 'A-106', 'B-100', 'C-100', '↗', '↗']);
    expect(caseSheets.map((s) => s.slug)).toEqual(cases.map((c) => c.slug));
  });
  test('per-case accents are text-safe on paper (≥ 4.5:1) and stages are exact', () => {
    for (const [slug, a] of Object.entries(ACCENTS)) {
      expect(ratio(a.acc, '#EEEBE3'), slug).toBeGreaterThanOrEqual(4.5);
      // Dusk: paper, paper-2, sheet and before grounds
      for (const bg of ['#1D1614', '#231B18', '#261D1A', '#2E2522']) expect(ratio(a.accDusk, bg), `${slug} dusk on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
    expect(ACCENTS.educademy.stage).toBe('#bbb3fa');
    expect(accentStyle('cloudflare')).toBe('--acc-l: #A3420B; --acc-mark-l: #E4691E; --acc-soft-l: #FCE3CF; --acc-d: #F17129; --stage: linear-gradient(180deg, #fdc07c 0%, #ffa07d 100%)');
  });
  test('cover plates are 16:10 and use real files', () => {
    for (const [slug, p] of Object.entries(COVERS)) {
      expect(p.aspect, slug).toBeCloseTo(1.6);
      for (const l of p.layers) expect(facts(l.file).w, l.file).toBeGreaterThan(0);
    }
  });
  test('sheet numbers, decks and the cycling match line', () => {
    expect(SHEET_NO).toEqual({ cloudflare: 'A-101', pff: 'A-102', csbs: 'A-103', 'u-up': 'A-104', orbit: 'A-105', educademy: 'A-106' });
    expect(deckOf('orbit').fromIndex).toBe(true);
    expect(deckOf('cloudflare').text).toBe(cases[0].description);
    expect(cases.map((c) => nextCase(c.slug as never))).toEqual(['pff', 'csbs', 'u-up', 'orbit', 'educademy', 'cloudflare']);
  });
});

describe('legacy anchors (§5.2.9)', () => {
  test('every alias targets a real section and never collides with one', () => {
    for (const [slug, map] of Object.entries(legacyAnchors)) {
      const cs = cases.find((c) => c.slug === slug)!;
      const ids = cs.sections.map((s) => s.id);
      for (const [alias, target] of Object.entries(map)) {
        expect(ids, `${slug}#${alias}`).toContain(target);
        expect(ids, `${slug}#${alias}`).not.toContain(alias);
      }
    }
    expect(aliasesFor('educademy', 'define')).toEqual(['persona']);
  });
});

describe('chrome.ts / alt.ts', () => {
  test('every narrative line is off until the owner approves it', () => {
    const ns = allNarratives();
    expect(ns.length).toBeGreaterThanOrEqual(5);
    for (const { path, n } of ns) {
      expect(n.approved, path).toBe(false);
      expect(narrative(n), path).toBeNull();
    }
  });
  test('labels exist for every package', () => {
    expect(Object.keys(chrome)).toEqual(['p0', 'wp1', 'wp2', 'wp3', 'wp4a', 'wp4b', 'wp5', 'wp6', 'wp7']);
  });
  test('alt() returns the draft or ""', () => {
    expect(alt('not-a-file.png')).toBe('');
  });
});
