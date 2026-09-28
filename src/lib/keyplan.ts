/**
 * keyplan.ts · P0. The Key plan: one verbatim line per level (SPEC SM5a). Deterministic, never written by us.
 * For each section, take the first rule that yields something:
 *   1. the first `lede` block (render its HTML, so her <mark> survives)
 *   2. feature titles joined with " · "
 *   3. the first feature lede
 *   4. the full sentence containing the first <strong> longer than 12 characters, in any p / list item / card html
 *   5. the first sentence of the first p
 *   6. card titles joined with " · "
 *   7. tab labels joined with " · "
 *   8. h texts joined with " · "
 * The " · " separator is chrome (aria-hidden). Overrides: data/sheets.ts → keyplanOverrides (audited, test-enforced).
 */
import type { Block, CaseStudy, Section } from './blocks';
import { keyplanOverrides } from '../data/sheets';
import { reading } from './reading';
import { sentences, stripHtml, strongs } from './text';

export type KeyRule = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 'override';

export interface KeyStop {
  sectionId: string;
  label: string;          // her section label
  index: number;          // 0-based
  elev: string;           // '±00:00' / '+02:32' (reading.ts)
  minutes: number;
  anchor: string;         // '#empathize'
  rule: KeyRule;
  kind: 'html' | 'text' | 'parts' | 'stat';
  html?: string;          // kind 'html': her lede HTML (set:html through rich())
  text?: string;          // kind 'text': verbatim plain text
  parts?: string[];       // kind 'parts': verbatim plain texts; render with an aria-hidden chrome " · " between
  stat?: { v: string; html: string }; // kind 'stat': her stat value + label (override only)
  plain: string;          // normalised text (parts joined with ' · ', stat as 'v label') — what tests compare
}

export const JOIN = ' · ';

function flat(blocks: Block[]): Block[] {
  return blocks.flatMap((b) => (b.t === 'split' ? [...flat(b.left), ...flat(b.right)] : [b]));
}

type RulePick = Pick1 | PickText | PickParts;
interface Pick1 { rule: 1; html: string }
interface PickText { rule: 3 | 4 | 5; text: string }
interface PickParts { rule: 2 | 6 | 7 | 8; parts: string[] }

export function keyplanRule(section: Section): RulePick | null {
  const bl = flat(section.blocks);
  // 1
  const lede = bl.find((b): b is Extract<Block, { t: 'lede' }> => b.t === 'lede');
  if (lede) return { rule: 1, html: lede.html };
  const feats = bl.filter((b): b is Extract<Block, { t: 'feature' }> => b.t === 'feature');
  // 2
  const ft = feats.filter((f) => f.title).map((f) => stripHtml(f.title));
  if (ft.length) return { rule: 2, parts: ft };
  // 3
  const fl = feats.find((f) => f.lede);
  if (fl?.lede) return { rule: 3, text: stripHtml(fl.lede) };
  // 4
  for (const b of bl) {
    const cands: string[] =
      b.t === 'p' ? [b.html] : b.t === 'list' ? b.items : b.t === 'cards' ? b.items.map((i) => i.html ?? '') : [];
    for (const html of cands) {
      for (const s of strongs(html)) {
        const st = stripHtml(s);
        if (st.length > 12) {
          const probe = st.slice(0, 20);
          const sen = sentences(stripHtml(html)).find((x) => x.includes(probe));
          return { rule: 4, text: sen ?? st };
        }
      }
    }
  }
  // 5
  const p = bl.find((b): b is Extract<Block, { t: 'p' }> => b.t === 'p');
  if (p) {
    const first = sentences(stripHtml(p.html))[0];
    if (first) return { rule: 5, text: first };
  }
  // 6
  const ct = bl.flatMap((b) => (b.t === 'cards' ? b.items.map((i) => stripHtml(i.title)) : []));
  if (ct.length) return { rule: 6, parts: ct };
  // 7
  const tl = bl.flatMap((b) => (b.t === 'tabs' ? b.items.map((i) => i.label) : []));
  if (tl.length) return { rule: 7, parts: tl };
  // 8
  const hs = bl.flatMap((b) => (b.t === 'h' ? [b.text] : []));
  if (hs.length) return { rule: 8, parts: hs };
  return null;
}

export function keyplan(cs: CaseStudy): KeyStop[] {
  const r = reading(cs);
  return cs.sections.map((s, index) => {
    const lv = r.sections[index];
    const base = { sectionId: s.id, label: s.label, index, elev: lv.elev, minutes: lv.minutes, anchor: `#${s.id}` };
    const o = keyplanOverrides[`${cs.slug}.${s.id}`];
    if (o) {
      if ('text' in o) return { ...base, rule: 'override', kind: 'text', text: o.text.text, plain: o.text.text } satisfies KeyStop;
      const stat = { v: o.stat.v.text, html: o.stat.html.text };
      return { ...base, rule: 'override', kind: 'stat', stat, plain: `${stat.v} ${stat.html}` } satisfies KeyStop;
    }
    const pick = keyplanRule(s);
    if (!pick) return { ...base, rule: 8, kind: 'parts', parts: [], plain: '' } satisfies KeyStop;
    if (pick.rule === 1) return { ...base, rule: 1, kind: 'html', html: pick.html, plain: stripHtml(pick.html) } satisfies KeyStop;
    if ('text' in pick) return { ...base, rule: pick.rule, kind: 'text', text: pick.text, plain: pick.text } satisfies KeyStop;
    return { ...base, rule: pick.rule, kind: 'parts', parts: pick.parts, plain: pick.parts.join(JOIN) } satisfies KeyStop;
  });
}
