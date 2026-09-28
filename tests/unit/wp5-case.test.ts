/**
 * WP5 · case template data (SPEC SM4, SM5a/b/c, §5.2). Build-time only: the Decision schedule's anchors and plus
 * items, the omit-run labels the Chapter prints, and the Levels geometry inputs.
 */
import { describe, expect, test } from 'vitest';
import { cases } from '@/content/site';
import { decisions, resolveDecisions, THREE_CHANGES } from '@/data/decisions';
import { chapterCtxs } from '@/lib/blocks-ctx';
import { omitLabel, omitRuns } from '@/lib/planview';
import { reading } from '@/lib/reading';
import { blockTexts } from '@/lib/verbatim';
import { normalize } from '@/lib/text';
import { SHEET_NO, sheets } from '@/data/sheets';
import { keepCompounds, keepItems } from '@/lib/typeset';
import { decodeEntities } from '@/lib/text';
import type { CaseSlug } from '@/lib/verbatim';

const bySlug = (slug: string) => cases.find((c) => c.slug === slug)!;

describe('Decision schedule (SM5b)', () => {
  // LEVEL = her section label of the block holding the decided sentence (else the considered one)
  const expected: Record<string, string[]> = {
    cloudflare: ['Ideate', 'Ideate', 'Ideate', 'Ideate', 'Ideate'],
    pff: ['Research', 'Ideate', 'Ideate', 'Prototype', 'Reflection'],
    csbs: ['Overview', 'Reflection', 'Prototype'],
    'u-up': ['Ideate', 'Overview', 'Overview'],
    orbit: ['Ideate', 'Reflection', 'Ideate'],
    educademy: ['Overview', 'Overview', 'Empathize'],
  };
  for (const cs of cases) {
    test(`${cs.slug}: every row resolves to the block that holds her decided sentence`, () => {
      const rows = resolveDecisions(cs);
      expect(rows).toHaveLength(decisions[cs.slug].length);
      expect(rows.map((r) => r.anchor?.sectionLabel)).toEqual(expected[cs.slug]);
      const texts = blockTexts(cs);
      rows.forEach((r) => {
        const b = texts.find((x) => x.id === r.anchor!.id)!;
        expect(b, `${cs.slug} D-${r.no}`).toBeTruthy();
        const holds = b.text.includes(normalize(r.decided)) || b.text.includes(normalize(r.considered));
        expect(holds, `${cs.slug} D-${r.no} anchor text`).toBe(true);
        expect(r.no).toBe(rows.indexOf(r) + 1);
      });
    });
  }
  test('Cloudflare D-04 lists the three bold lead-ins of her following list, read from the content', () => {
    const d4 = resolveDecisions(bySlug('cloudflare'))[3];
    expect(d4.plus).toBe('three-changes');
    expect(d4.plusItems).toEqual([...THREE_CHANGES]);
    expect(resolveDecisions(bySlug('cloudflare')).filter((r) => r.plusItems.length)).toHaveLength(1);
  });
});

describe('Plan view omit runs (SM5c)', () => {
  test('runs coalesce consecutive omissions and count them with her nouns', () => {
    const cs = bySlug('cloudflare');
    const [, empathize] = chapterCtxs(cs, SHEET_NO.cloudflare);
    const runs = omitRuns(empathize.plan);
    expect(runs.length).toBeGreaterThan(0);
    expect(omitLabel(runs[0].map((i) => empathize.plan[i]))).toBe('Omitted: 1 paragraph');
    for (const c of cases) {
      for (const ch of chapterCtxs(c, SHEET_NO[c.slug as CaseSlug])) {
        for (const run of omitRuns(ch.plan)) {
          const label = omitLabel(run.map((i) => ch.plan[i]));
          expect(label).toMatch(/^Omitted: \d+ (paragraphs?|lists?|figures?|user-story sets?|other)( · \d+ \D+)*$/);
          // every run is maximal: the blocks around it are kept
          expect(ch.plan[run[0] - 1]?.mode ?? 'keep').not.toBe('omit');
          expect(ch.plan[run[run.length - 1] + 1]?.mode ?? 'keep').not.toBe('omit');
        }
      }
    }
  });
});

describe('Levels inputs (SM4)', () => {
  test('floors carry the rounded seconds of each level; elevations accumulate them', () => {
    for (const cs of cases) {
      const r = reading(cs);
      let el = 0;
      r.sections.forEach((s, i) => {
        expect(s.sec).toBeGreaterThan(0);
        expect(s.elevSec).toBe(el);
        expect(s.elev).toMatch(i === 0 ? /^±00:00$/ : /^\+\d\d:\d\d$/);
        el += s.sec;
      });
    }
  });
});

describe('typesetting her words (lib/typeset.ts): presentation only', () => {
  // what a reader, find-in-page and the verbatim guard see: the text content, tags removed, entities decoded
  const textOf = (html: string) => decodeEntities(html.replace(/<[^>]+>/g, ''));
  const titles = [...cases.map((c) => c.title), ...sheets.map((s) => s.title.text)];
  const metas = cases.flatMap((c) => c.meta.map(([, v]) => v));
  test('keepCompounds never changes a character, and binds every hyphenated compound', () => {
    for (const t of titles) expect(textOf(keepCompounds(t))).toBe(t);
    expect(keepCompounds('Simplifying e-learning for COVID-era')).toBe(
      'Simplifying <span class="nobr">e-learning</span> for <span class="nobr">COVID-era</span>',
    );
  });
  test('keepItems never changes a character, keeps each comma with its item and breaks only between items', () => {
    for (const v of [...metas, 'A & B, <C>']) expect(textOf(keepItems(v))).toBe(v);
    expect(keepItems('1 PM, 3 Designers, 1 UX Researcher')).toBe(
      '<span class="keep">1 PM,</span> <span class="keep">3 Designers,</span> <span class="keep">1 UX Researcher</span>',
    );
    expect(keepItems('MAR 2025 - JUN 2025')).toBe('<span class="keep">MAR 2025 - JUN 2025</span>');
  });
});
