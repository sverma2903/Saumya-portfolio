import { describe, expect, test } from 'vitest';
import { cases } from '@/content/site';
import { reading, setMinutes } from '@/lib/reading';

const bySlug = (s: string) => cases.find((c) => c.slug === s)!;

// SPEC SM4 "Expected totals, as a sanity check within ±1 min".
const TABLE: Record<string, { full: number; plan: number; elev?: string[] }> = {
  cloudflare: { full: 13, plan: 5, elev: ['±00:00', '+00:36', '+02:32', '+07:18', '+10:37', '+11:52'] },
  pff: { full: 13, plan: 5, elev: ['±00:00', '+01:19', '+02:35', '+05:11', '+08:10', '+10:18', '+11:20'] },
  csbs: { full: 10, plan: 4 },
  'u-up': { full: 7, plan: 4 },
  orbit: { full: 16, plan: 5 },
  educademy: { full: 8, plan: 4 },
};

describe('reading model (SM4)', () => {
  for (const [slug, exp] of Object.entries(TABLE)) {
    test(`${slug}: full ≈ ${exp.full} min, plan ≈ ${exp.plan} min (±1)`, () => {
      const r = reading(bySlug(slug));
      expect(Math.abs(r.minutes - exp.full)).toBeLessThanOrEqual(1);
      expect(Math.abs(r.planMinutes - exp.plan)).toBeLessThanOrEqual(1);
      expect(Math.abs(r.totalSec / 60 - exp.full)).toBeLessThanOrEqual(1);
      expect(Math.abs(r.planSec / 60 - exp.plan)).toBeLessThanOrEqual(1);
    });
    if (exp.elev) {
      test(`${slug}: elevations equal the SM4 table`, () => {
        expect(reading(bySlug(slug)).sections.map((s) => s.elev)).toEqual(exp.elev);
      });
    }
  }
  test('the displayed minutes match the table exactly (ceil)', () => {
    for (const [slug, exp] of Object.entries(TABLE)) {
      expect(reading(bySlug(slug)).minutes, slug).toBe(exp.full);
      expect(reading(bySlug(slug)).planMinutes, slug).toBe(exp.plan);
    }
  });
  test('the set is ≈ 65 min in full (Drawing index header)', () => {
    expect(setMinutes(cases)).toBe(65);
  });
  test('every chapter has a positive reading time and levels = sections', () => {
    for (const cs of cases) {
      const r = reading(cs);
      expect(r.levels).toBe(cs.sections.length);
      for (const s of r.sections) expect(s.sec).toBeGreaterThan(0);
    }
  });
});
