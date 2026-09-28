/**
 * ids.ts · P0. The ONE id scheme for anchors, citations and search (SPEC §4.9, §6.1).
 *   chapter           → her section id                     e.g. `empathize`
 *   block root        → `${section.id}-${i}`               e.g. `empathize-3`
 *   split child       → `${section.id}-${i}-l${j}` / `-r${j}`
 *   block `h` heading → `${section.id}-${slug(h)}`         e.g. `empathize-competitive-analysis`
 * Every package that links to a block (Decision schedule, Viewport "cited from", Sheet list, figures)
 * must use these helpers so the anchors always agree.
 */
import { slugify } from './text';

export const blockId = (sectionId: string, i: number): string => `${sectionId}-${i}`;
export const splitChildId = (parentId: string, side: 'l' | 'r', j: number): string => `${parentId}-${side}${j}`;

/**
 * Heading id for a block `h`. `used` de-duplicates within a page (a second identical heading in the
 * same chapter gets `-2`). Pure-numeric slugs are prefixed so they can never collide with block ids.
 */
export function headingId(sectionId: string, text: string, used?: Set<string>): string {
  let slug = slugify(text) || 'detail';
  if (/^\d+$/.test(slug)) slug = `h-${slug}`;
  let id = `${sectionId}-${slug}`;
  if (used) {
    let n = 2;
    while (used.has(id)) id = `${sectionId}-${slug}-${n++}`;
    used.add(id);
  }
  return id;
}
