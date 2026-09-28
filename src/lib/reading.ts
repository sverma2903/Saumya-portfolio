/**
 * reading.ts · P0. The build-time reading model behind Levels (SM4), the index minutes and the View toggle.
 *
 *   seconds(section) = words / 230 · 60 + 10 · mediaItems
 *   words: runs of non-space characters in the stripped text of every block (split → its children)
 *   media items: images/videos in media, features, cards with images, stories, insights with images, tabs, concepts
 *   elevation[i] = Σ round(seconds[0..i−1])   formatted +MM:SS (Overview ±00:00)
 *   planSeconds  = Plan-view retained words / 230 · 60 + 6 s per kept figure (planview.ts)
 *   minutes shown ("≈ N min") = ceil(seconds / 60)
 *
 * Verified against SPEC SM4 (cloudflare/pff elevations exact; all totals within ±1 min; tests/unit/reading.test.ts).
 */
import type { Block, CaseStudy, Section } from './blocks';
import { planSection } from './planview';
import { formatElevation, roundHalfEven, stripHtml, words } from './text';

export const WPM = 230;
export const SEC_PER_MEDIA = 10;
export const SEC_PER_PLAN_FIGURE = 6;

const t = (html: string | undefined | null) => stripHtml(html);

/** The words of one block exactly as the reading model counts them (split handled by the caller). */
export function blockReadText(b: Block): string {
  switch (b.t) {
    case 'h': return b.text;
    case 'h3': case 'lede': case 'p': case 'small': return t(b.html);
    case 'list': return b.items.map(t).join(' ');
    case 'media': return t(b.caption);
    case 'stats': return b.items.map((i) => `${t(i.v)} ${t(i.html)}`).join(' ');
    case 'cta': return b.items.map((i) => i.label).join(' ');
    case 'callout': return `${b.title} ${t(b.lede)} ${t(b.html)}`;
    case 'cards': return b.items.map((i) => `${t(i.kicker)} ${t(i.title)} ${t(i.html)}`).join(' ');
    case 'feature': return `${[b.kicker, b.title, b.lede, b.html].map(t).join(' ')} ${(b.items ?? []).map(t).join(' ')}`;
    case 'stories': return b.items.map((i) => `${i.title} ${i.rows.map(([k, v]) => `${k} ${v}`).join(' ')}`).join(' ');
    case 'timeline': return b.items.map((i) => `${i.k} ${t(i.v)}`).join(' ');
    case 'insights': return b.items.map((i) => `${t(i.title)} ${t(i.sub)} ${i.items.map(t).join(' ')}`).join(' ');
    case 'tabs': return b.items.map((i) => i.label).join(' ');
    case 'concept': return `${t(b.title)} ${b.captions.map(t).join(' ')} ${(b.analysis ?? []).map(t).join(' ')}`;
    default: return '';
  }
}

/** Media items in one block (images and videos). */
export function blockMediaCount(b: Block): number {
  switch (b.t) {
    case 'media': return b.items.length;
    case 'feature': return b.media.length;
    case 'cards': return b.items.filter((i) => i.img).length;
    case 'stories': return b.items.length;
    case 'insights': return b.items.filter((i) => i.img).length;
    case 'tabs': return b.items.length;
    case 'concept': return b.media.length;
    default: return 0;
  }
}

function walk(blocks: Block[], f: (b: Block) => void) {
  for (const b of blocks) {
    if (b.t === 'split') walk([...b.left, ...b.right], f);
    else f(b);
  }
}

export interface SectionReading {
  id: string;
  label: string;
  index: number;          // 0-based chapter index
  words: number;
  media: number;
  sec: number;            // rounded seconds (half-to-even, as the SM4 table)
  exactSec: number;
  elevSec: number;        // Σ sec of previous chapters
  elev: string;           // '±00:00' | '+02:32'
  minutes: number;        // ≈ minutes for this chapter (ceil, min 1)
  planWords: number;
  planFigures: number;
  planSec: number;
}

export interface CaseReading {
  slug: string;
  sections: SectionReading[];
  words: number;
  media: number;
  totalSec: number;       // exact
  minutes: number;        // ceil(total / 60) — "≈ 13 min"
  planSec: number;
  planMinutes: number;    // ceil(plan / 60) — "≈ 5 min"
  levels: number;
}

export function sectionSeconds(s: Section): { words: number; media: number; exact: number } {
  let w = 0;
  let m = 0;
  walk(s.blocks, (b) => { w += words(blockReadText(b)); m += blockMediaCount(b); });
  return { words: w, media: m, exact: (w / WPM) * 60 + m * SEC_PER_MEDIA };
}

export const minutesOf = (sec: number) => Math.max(1, Math.ceil(sec / 60));

const memo = new WeakMap<CaseStudy, CaseReading>();

export function reading(cs: CaseStudy): CaseReading {
  const hit = memo.get(cs);
  if (hit) return hit;
  let el = 0;
  let totW = 0;
  let totM = 0;
  let totExact = 0;
  let planTot = 0;
  const sections = cs.sections.map((s, index) => {
    const { words: w, media: m, exact } = sectionSeconds(s);
    const sec = roundHalfEven(exact);
    const plan = planSection(s);
    const planSec = (plan.words / WPM) * 60 + plan.figures * SEC_PER_PLAN_FIGURE;
    const r: SectionReading = {
      id: s.id, label: s.label, index, words: w, media: m, sec, exactSec: exact,
      elevSec: el, elev: formatElevation(el, index === 0), minutes: minutesOf(exact),
      planWords: plan.words, planFigures: plan.figures, planSec,
    };
    el += sec;
    totW += w; totM += m; totExact += exact; planTot += planSec;
    return r;
  });
  const out: CaseReading = {
    slug: cs.slug, sections, words: totW, media: totM, totalSec: totExact, minutes: minutesOf(totExact),
    planSec: planTot, planMinutes: minutesOf(planTot), levels: sections.length,
  };
  memo.set(cs, out);
  return out;
}

/** Σ of every case's exact reading time → "≈ 65 MIN IN FULL" on the Drawing index. */
export function setMinutes(all: CaseStudy[]): number {
  return minutesOf(all.reduce((a, cs) => a + reading(cs).totalSec, 0));
}
