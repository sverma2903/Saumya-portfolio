/**
 * blocks-ctx.ts · P0 (shared). The contract between the Chapter (WP5) and every block component (WP4a/WP4b).
 *
 *   every block component:  interface Props { block: Extract<Block, { t: 'X' }>; ctx: BlockCtx }
 *   root element:           any tag, carrying {...blkAttrs('X', ctx)} → class "blk blk--X [is-wide] [blk--nested]",
 *                           id = ctx.id, data-block = X, data-plan = ctx.plan.mode
 *   her text:               every element whose text is hers carries `data-v`; every chrome element inside a block
 *                           carries `data-chrome` (FIG labels, bubbles, dims tags, break lines, ⋯ joiners, …)
 *   headings:               block `h` is always <h3>; every other title uses `h${ctx.hl}`
 */
import type { Block, CaseStudy, Section } from './blocks';
import { groupFeatures, type Group } from './features';
import { figureMap } from './figures';
import { blockId, headingId, splitChildId } from './ids';
import { planBlocks, type PlanInfo, type PlanMode } from './planview';
import { dimsOf, fileOf, stagingOf } from './staging';

export type { PlanInfo, PlanMode } from './planview';

export interface BlockCtx {
  slug: string;                 // 'cloudflare'
  sheet: string;                // 'A-101'
  chapter: { index: number; id: string; label: string };   // index is 0-based
  id: string;                   // stable block id: `${section.id}-${i}` (split children: `${section.id}-${i}-l${j}` / `-r${j}`)
  fig?: string;                 // figure number 'FIG. 3.2' (lib/figures.ts), if the block owns figures
  figLetters?: string[];        // item letters for multi-item figures ('a','b',…)
  plan: PlanInfo;               // lib/planview.ts
  headingNo?: number;           // for `h`: detail number within the chapter (1…n)
  headingId?: string;           // for `h`: `${section.id}-${slug(h)}` (deduplicated per page)
  hl: 3 | 4;                    // heading level for titles this block renders: 4 when an `h` precedes it in its chapter, else 3
  wide: boolean;                // resolved (block.wide || auto-promotion || staging)
  inSplit?: boolean;
  inRun?: boolean;              // member of a FeatureRun (WalkthroughPhone / WalkthroughPlayer)
}

/** Wide resolution (SPEC §6.2): explicit, auto-promotion, staging, and the always-wide block types. */
export function resolveWide(b: Block): boolean {
  switch (b.t) {
    case 'media': {
      if (b.wide) return true;
      if (b.items.some((m) => stagingOf(m).wide)) return true;
      if (b.items.length === 1) {
        const d = dimsOf(fileOf(b.items[0]));
        const [w, h] = d ?? [b.items[0].w, b.items[0].h];
        if (w >= 2000 && w / h >= 2.4) return true;
      }
      return false;
    }
    case 'cards':
      return (b.cols ?? 1) >= 4 || (b.variant === 'plain' && b.items.some((i) => i.img));
    case 'feature':
    case 'stories':
    case 'timeline':
    case 'insights':
    case 'split':
    case 'tabs':
    case 'concept':
      return true;
    default:
      return false;
  }
}

export interface ChapterCtx {
  section: Section;
  index: number;                // 0-based
  ctxs: BlockCtx[];             // index-aligned with section.blocks
  plan: PlanInfo[];             // index-aligned with section.blocks
  groups: Group[];              // feature runs (lib/features.ts)
}

/** Build every chapter's block contexts for a case. `sheet` comes from data/sheets.ts (e.g. 'A-101'). */
export function chapterCtxs(cs: CaseStudy, sheet: string): ChapterCtx[] {
  const figs = figureMap(cs);
  const usedHeadingIds = new Set<string>();
  return cs.sections.map((section, index) => {
    const plan = planBlocks(section);
    let seenH = false;
    let hNo = 0;
    const ctxs = section.blocks.map((b, i): BlockCtx => {
      const id = blockId(section.id, i);
      const hl: 3 | 4 = seenH ? 4 : 3;
      const f = figs.get(id);
      const ctx: BlockCtx = {
        slug: cs.slug,
        sheet,
        chapter: { index, id: section.id, label: section.label },
        id,
        fig: f?.no,
        figLetters: f?.letters,
        plan: plan[i],
        hl,
        wide: resolveWide(b),
      };
      if (b.t === 'h') {
        hNo += 1;
        seenH = true;
        ctx.headingNo = hNo;
        ctx.headingId = headingId(section.id, b.text, usedHeadingIds);
      }
      return ctx;
    });
    return { section, index, ctxs, plan, groups: groupFeatures(section.blocks) };
  });
}

/** Context for a split child (left/right `j`). Figures are looked up by the child's own id. */
export function splitChildCtx(cs: CaseStudy, parent: BlockCtx, side: 'l' | 'r', j: number): BlockCtx {
  const id = splitChildId(parent.id, side, j);
  const f = figureMap(cs).get(id);
  const childPlan = side === 'l' ? parent.plan.children?.left[j] : parent.plan.children?.right[j];
  return {
    ...parent,
    id,
    fig: f?.no,
    figLetters: f?.letters,
    plan: childPlan ?? { mode: 'keep', words: 0, figures: 0 },
    headingNo: undefined,
    headingId: undefined,
    wide: false,
    inSplit: true,
  };
}

/** Root attributes every block component spreads onto its root element. */
export function blkAttrs(t: Block['t'] | 'run', ctx: BlockCtx, extra?: string | false): Record<string, string> {
  const cls = ['blk', `blk--${t}`];
  const nested = ctx.inSplit || ctx.inRun;
  if (ctx.wide && !nested) cls.push('is-wide');
  if (nested) cls.push('blk--nested');
  if (extra) cls.push(extra);
  return { class: cls.join(' '), id: ctx.id, 'data-block': t, 'data-plan': ctx.plan.mode };
}
