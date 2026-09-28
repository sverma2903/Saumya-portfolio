/**
 * planview.ts · P0 creates → WP5 owns. Plan view ("bold only") derivation, pure and build-time (SPEC SM5c).
 *
 * | Block                                                   | Plan mode                                                   |
 * | h, h3, lede, stats, cta, callout, timeline, tabs         | keep                                                        |
 * | feature                                                 | keep (kicker, title, lede, media; html/items hidden)        |
 * | cards                                                   | keep, titles and kickers only (titlesOnly)                  |
 * | insights                                                | keep, title + sub only (titlesOnly)                         |
 * | concept                                                 | keep, title + first image (firstOnly)                       |
 * | split                                                   | recurse; omitted if both sides are omitted                  |
 * | p, small                                                | skim if ≥1 <strong> with ≥3 non-space chars, else omit      |
 * | list                                                    | skim if any item has such a <strong> (+ N items omitted)    |
 * | media                                                   | keep if first media block after the section start or an h  |
 * | stories, spacer                                         | omit                                                        |
 *
 * The Chapter component (WP5) wraps consecutive `omit` blocks in one counted break line (omitRuns + omitLabel).
 */
import type { Block, Section } from './blocks';
import { chrome, fill } from '../data/chrome';
import { nonSpaceLength, stripHtml, strongs, words } from './text';

export type PlanMode = 'keep' | 'skim' | 'omit';
export type OmitNoun = 'paragraph' | 'list' | 'figure' | 'story' | 'other';

export interface PlanInfo {
  mode: PlanMode;
  /** p/small skim: her <strong> inner HTML pieces, in order (render each in <strong data-v>, joined by a chrome ⋯) */
  skim?: string[];
  /** list skim: for each kept item, its strong pieces (items without a qualifying strong are dropped) */
  skimItems?: string[][];
  /** list skim: number of items dropped → "+ N items omitted" (chrome) */
  dropped?: number;
  /** cards: titles + kickers only · insights: title + sub only · feature: html/items hidden */
  titlesOnly?: boolean;
  /** concept: title + first image only */
  firstOnly?: boolean;
  /** split: child infos */
  children?: { left: PlanInfo[]; right: PlanInfo[] };
  /** what this block counts as inside an omit run */
  omitted?: Partial<Record<OmitNoun, number>>;
  /** retained words / kept figures (for planSeconds) */
  words: number;
  figures: number;
}

/** Her qualifying bold pieces: <strong> whose stripped text has ≥ 3 non-space characters. */
export function boldPieces(html: string | undefined): string[] {
  return strongs(html).filter((s) => nonSpaceLength(s) >= 3);
}

const wordsOf = (...htmls: (string | undefined)[]) => words(htmls.map((h) => stripHtml(h)).join(' '));

interface State { firstMediaAfterH: boolean }

function planBlock(b: Block, st: State): PlanInfo {
  switch (b.t) {
    case 'h':
      st.firstMediaAfterH = true;
      return { mode: 'keep', words: words(b.text), figures: 0 };
    case 'h3':
    case 'lede':
      return { mode: 'keep', words: wordsOf(b.html), figures: 0 };
    case 'stats':
      return { mode: 'keep', words: wordsOf(...b.items.flatMap((i) => [i.v, i.html])), figures: 0 };
    case 'cta':
      return { mode: 'keep', words: wordsOf(...b.items.map((i) => i.label)), figures: 0 };
    case 'callout':
      return { mode: 'keep', words: wordsOf(b.title, b.lede, b.html), figures: 0 };
    case 'timeline':
      return { mode: 'keep', words: wordsOf(...b.items.flatMap((i) => [i.k, i.v])), figures: 0 };
    case 'tabs':
      return { mode: 'keep', words: wordsOf(...b.items.map((i) => i.label)), figures: b.items.length };
    case 'feature':
      return { mode: 'keep', titlesOnly: true, words: wordsOf(b.kicker, b.title, b.lede), figures: b.media.length };
    case 'cards':
      return { mode: 'keep', titlesOnly: true, words: wordsOf(...b.items.flatMap((i) => [i.kicker, i.title])), figures: 0 };
    case 'insights':
      return { mode: 'keep', titlesOnly: true, words: wordsOf(...b.items.flatMap((i) => [i.title, i.sub])), figures: 0 };
    case 'concept':
      return { mode: 'keep', firstOnly: true, words: wordsOf(b.title), figures: b.media.length ? 1 : 0 };
    case 'p':
    case 'small': {
      const skim = boldPieces(b.html);
      if (skim.length) return { mode: 'skim', skim, words: wordsOf(...skim), figures: 0 };
      return { mode: 'omit', omitted: { paragraph: 1 }, words: 0, figures: 0 };
    }
    case 'list': {
      const per = b.items.map(boldPieces);
      const kept = per.filter((p) => p.length);
      if (kept.length) {
        return { mode: 'skim', skimItems: kept, dropped: b.items.length - kept.length, words: wordsOf(...kept.flat()), figures: 0 };
      }
      return { mode: 'omit', omitted: { list: 1 }, words: 0, figures: 0 };
    }
    case 'media': {
      if (st.firstMediaAfterH) {
        st.firstMediaAfterH = false;
        return { mode: 'keep', words: wordsOf(b.caption), figures: b.items.length };
      }
      return { mode: 'omit', omitted: { figure: b.items.length }, words: 0, figures: 0 };
    }
    case 'split': {
      const left = b.left.map((c) => planBlock(c, st));
      const right = b.right.map((c) => planBlock(c, st));
      const all = [...left, ...right];
      const allOmitted = all.every((c) => c.mode === 'omit');
      const omitted: Partial<Record<OmitNoun, number>> = {};
      if (allOmitted) for (const c of all) for (const [k, v] of Object.entries(c.omitted ?? {})) omitted[k as OmitNoun] = (omitted[k as OmitNoun] ?? 0) + (v ?? 0);
      return {
        mode: allOmitted ? 'omit' : 'keep',
        children: { left, right },
        omitted: allOmitted ? omitted : undefined,
        words: all.reduce((a, c) => a + c.words, 0),
        figures: all.reduce((a, c) => a + c.figures, 0),
      };
    }
    case 'stories':
      return { mode: 'omit', omitted: { story: 1 }, words: 0, figures: 0 };
    case 'spacer':
      return { mode: 'omit', words: 0, figures: 0 };
  }
}

/** Plan info for each top-level block of a section (index-aligned with section.blocks). */
export function planBlocks(section: Section): PlanInfo[] {
  const st: State = { firstMediaAfterH: true };
  return section.blocks.map((b) => planBlock(b, st));
}

export function planSection(section: Section): { infos: PlanInfo[]; words: number; figures: number } {
  const infos = planBlocks(section);
  return { infos, words: infos.reduce((a, i) => a + i.words, 0), figures: infos.reduce((a, i) => a + i.figures, 0) };
}

/** Consecutive omitted top-level blocks → runs of indices (what the Chapter wraps in one break line). */
export function omitRuns(infos: PlanInfo[]): number[][] {
  const runs: number[][] = [];
  let cur: number[] | null = null;
  infos.forEach((info, i) => {
    if (info.mode === 'omit') {
      if (!cur) runs.push((cur = []));
      cur.push(i);
    } else cur = null;
  });
  return runs;
}

/** "Omitted: 3 paragraphs · 1 figure" (chrome, from chrome.ts). */
export function omitLabel(infos: PlanInfo[]): string {
  const total: Partial<Record<OmitNoun, number>> = {};
  for (const i of infos) for (const [k, v] of Object.entries(i.omitted ?? {})) total[k as OmitNoun] = (total[k as OmitNoun] ?? 0) + (v ?? 0);
  const nouns = chrome.wp5.plan.nouns;
  const order: OmitNoun[] = ['paragraph', 'list', 'figure', 'story', 'other'];
  const parts = order
    .filter((k) => (total[k] ?? 0) > 0)
    .map((k) => {
      const n = total[k] ?? 0;
      return `${n} ${n === 1 ? nouns[k][0] : nouns[k][1]}`;
    });
  return fill(chrome.wp5.plan.omitted, { counts: parts.join(' · ') || `1 ${nouns.other[0]}` });
}
