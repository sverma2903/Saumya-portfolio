import { describe, expect, test } from 'vitest';
import { cases } from '@/content/site';
import { chapterCtxs, resolveWide, splitChildCtx } from '@/lib/blocks-ctx';
import { figuresOf } from '@/lib/figures';
import { groupFeatures, singleRenderer } from '@/lib/features';
import { SHEET_NO } from '@/data/sheets';
import type { CaseSlug } from '@/lib/verbatim';

const bySlug = (s: string) => cases.find((c) => c.slug === s)!;

describe('blocks-ctx', () => {
  test('ids are unique per page and follow `${section}-${i}`', () => {
    for (const cs of cases) {
      const chs = chapterCtxs(cs, SHEET_NO[cs.slug as CaseSlug]);
      const ids = chs.flatMap((c) => c.ctxs.map((x) => x.id));
      expect(new Set(ids).size).toBe(ids.length);
      chs.forEach((c) => c.ctxs.forEach((x, i) => expect(x.id).toBe(`${c.section.id}-${i}`)));
      const hids = chs.flatMap((c) => c.ctxs.flatMap((x) => (x.headingId ? [x.headingId] : [])));
      expect(new Set(hids).size).toBe(hids.length);
      expect(hids.some((h) => ids.includes(h))).toBe(false);
    }
  });
  test('hl is 3 until an `h` has appeared in the chapter, then 4; headings are numbered 1…n', () => {
    const [proto] = chapterCtxs(bySlug('cloudflare'), 'A-101').filter((c) => c.section.id === 'prototype');
    expect(proto.ctxs.every((c) => c.hl === 3)).toBe(true); // Cloudflare Prototype has no `h`
    const [emp] = chapterCtxs(bySlug('cloudflare'), 'A-101').filter((c) => c.section.id === 'empathize');
    expect(emp.ctxs[0].headingNo).toBe(1);
    expect(emp.ctxs[0].headingId).toBe('empathize-why-i-redesigned-r2');
    expect(emp.ctxs.slice(1).every((c) => c.hl === 4)).toBe(true);
    const hNos = emp.ctxs.filter((c) => c.headingNo).map((c) => c.headingNo);
    expect(hNos).toEqual([1, 2, 3]);
  });
  test('split children get `-l${j}` / `-r${j}` ids and nested plan infos', () => {
    const cs = bySlug('u-up');
    const chs = chapterCtxs(cs, 'A-104');
    const emp = chs.find((c) => c.section.id === 'empathize')!;
    const i = emp.section.blocks.findIndex((b) => b.t === 'split');
    const l = splitChildCtx(cs, emp.ctxs[i], 'l', 0);
    const r = splitChildCtx(cs, emp.ctxs[i], 'r', 0);
    expect(l.id).toBe(`empathize-${i}-l0`);
    expect(r.id).toBe(`empathize-${i}-r0`);
    expect(r.fig).toMatch(/^FIG\. 2\.\d+$/);
    expect(l.inSplit && r.inSplit).toBe(true);
  });
  test('wide resolution: explicit, staging, auto-promotion, always-wide types', () => {
    const cf = bySlug('cloudflare');
    const find = (sid: string, pred: (b: (typeof cf.sections)[0]['blocks'][0]) => boolean) => cf.sections.find((s) => s.id === sid)!.blocks.find(pred)!;
    expect(resolveWide(find('empathize', (b) => b.t === 'media' && !!b.wide))).toBe(true);
    expect(resolveWide(find('define', (b) => b.t === 'media' && b.items[0].src.includes('WgCbjK')))).toBe(true); // staging wide
    expect(resolveWide(find('empathize', (b) => b.t === 'h'))).toBe(false);
    expect(resolveWide(find('prototype', (b) => b.t === 'feature'))).toBe(true);
  });
});

describe('figures', () => {
  test('FIG. c.n numbering restarts per chapter, galleries are one figure with letters', () => {
    const figs = figuresOf(bySlug('cloudflare'));
    expect(figs[0].no).toBe('FIG. 2.1'); // Overview has no figures; Empathize logo schedule first
    expect(figs[0].letters).toEqual(['a', 'b', 'c', 'd']);
    const byChapter = new Map<number, number[]>();
    for (const f of figs) byChapter.set(f.chapter, [...(byChapter.get(f.chapter) ?? []), f.n]);
    for (const ns of byChapter.values()) expect(ns).toEqual(ns.map((_, i) => i + 1));
    const w4 = figs.find((f) => f.items[0]?.src.includes('lR8M0Y29'))!;
    expect(w4.no).toBe('FIG. 5.4');
  });
  test('every case has figures and ids resolve to blocks', () => {
    for (const cs of cases) {
      const figs = figuresOf(cs);
      expect(figs.length).toBeGreaterThan(5);
      expect(new Set(figs.map((f) => f.id)).size).toBe(figs.length);
    }
  });
});

describe('features: renderer selection (SPEC §6.2)', () => {
  const runs = (slug: string, sid: string) => groupFeatures(bySlug(slug).sections.find((s) => s.id === sid)!.blocks);
  test('U-Up and Educademy overviews are phone walkthroughs', () => {
    expect(runs('u-up', 'overview').filter((g) => g.kind === 'run')).toEqual([{ kind: 'run', renderer: 'phone', indices: [7, 8, 9] }]);
    expect(runs('educademy', 'overview').filter((g) => g.kind === 'run')).toMatchObject([{ renderer: 'phone', indices: [4, 5, 6] }]);
  });
  test('PFF Highlights is the player', () => {
    expect(runs('pff', 'highlights').filter((g) => g.kind === 'run')).toMatchObject([{ renderer: 'player', indices: [2, 3, 4, 5, 6] }]);
  });
  test('Cloudflare W1–W4 are stacked; CSBS 01–04 and Educademy lo-fi are split rows; Orbit/PFF decisions stacked', () => {
    const r = (slug: string, sid: string) => bySlug(slug).sections.find((s) => s.id === sid)!.blocks.flatMap((b) => (b.t === 'feature' ? [singleRenderer(b)] : []));
    expect(r('cloudflare', 'prototype')).toEqual(['stacked', 'stacked', 'stacked', 'stacked']);
    expect(r('csbs', 'prototype')).toEqual(['split', 'split', 'split', 'split']);
    expect(r('educademy', 'prototype')).toEqual(['split']);
    expect(r('orbit', 'prototype')).toEqual(['stacked', 'stacked', 'stacked', 'stacked', 'stacked']);
    expect(r('pff', 'ideate')).toEqual(['stacked', 'stacked', 'stacked', 'stacked']);
  });
});
