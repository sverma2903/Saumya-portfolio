/**
 * figures.ts · P0. Figure numbering (SPEC §6.2 media, §4.5): `FIG. c.n`
 *   c = chapter number (1-based), n = running figure count within the chapter, in DOM order.
 * A figure is: a media block (a gallery or logo schedule is ONE figure, items lettered a b c…), a feature with
 * media, a concept (lettered), a tabs block (lettered) and an insights block with evidence images (lettered).
 * Card icons, logos in cards and story avatars are not figures. Split children are numbered in place.
 * The Enlarged detail's Prev/Next (WP4b) steps through figuresOf(cs) in this order.
 */
import type { Block, CaseStudy, Media } from './blocks';
import { blockId, splitChildId } from './ids';

export interface FigureInfo {
  id: string;            // owning block id (ids.ts)
  no: string;            // 'FIG. 4.7' (chrome)
  chapter: number;       // 1-based
  n: number;             // 1-based within the chapter
  sectionId: string;
  sectionLabel: string;
  t: Block['t'];
  items: Media[];        // the media, in order
  letters: string[];     // ['a','b',…] when more than one item, else []
  caption?: string;      // her caption HTML, when the block has one
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

function figureMedia(b: Block): { items: Media[]; caption?: string } | null {
  switch (b.t) {
    case 'media': return b.items.length ? { items: b.items, caption: b.caption } : null;
    case 'feature': return b.media.length ? { items: b.media } : null;
    case 'concept': return b.media.length ? { items: b.media } : null;
    case 'tabs': return b.items.length ? { items: b.items.map((i) => i.media) } : null;
    case 'insights': {
      const items = b.items.flatMap((i) => (i.img ? [i.img] : []));
      return items.length ? { items } : null;
    }
    default: return null;
  }
}

const memo = new WeakMap<CaseStudy, FigureInfo[]>();

export function figuresOf(cs: CaseStudy): FigureInfo[] {
  const hit = memo.get(cs);
  if (hit) return hit;
  const out: FigureInfo[] = [];
  cs.sections.forEach((s, si) => {
    let n = 0;
    const visit = (b: Block, id: string) => {
      if (b.t === 'split') {
        b.left.forEach((c, j) => visit(c, splitChildId(id, 'l', j)));
        b.right.forEach((c, j) => visit(c, splitChildId(id, 'r', j)));
        return;
      }
      const fm = figureMedia(b);
      if (!fm) return;
      n += 1;
      out.push({
        id, no: `FIG. ${si + 1}.${n}`, chapter: si + 1, n, sectionId: s.id, sectionLabel: s.label, t: b.t,
        items: fm.items, letters: fm.items.length > 1 ? fm.items.map((_, k) => LETTERS[k] ?? String(k + 1)) : [], caption: fm.caption,
      });
    };
    s.blocks.forEach((b, i) => visit(b, blockId(s.id, i)));
  });
  memo.set(cs, out);
  return out;
}

export function figureMap(cs: CaseStudy): Map<string, FigureInfo> {
  return new Map(figuresOf(cs).map((f) => [f.id, f]));
}
