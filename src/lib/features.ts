/**
 * features.ts · P0 creates → WP4b owns. Chooses the feature renderer per run (SPEC §6.2 `feature`).
 *
 * | Renderer          | Trigger                                                                     |
 * | stacked           | single feature whose media is a desktop capture (native w ≥ 1800, aspect ≥ 1.3) |
 * | split             | any other single feature (incl. empty media → text only)                    |
 * | phone (run)       | ≥ 2 consecutive features whose media are all staging `phone`                |
 * | player (run)      | ≥ 3 consecutive features with no title, a lede, and one desktop media each  |
 *
 * groupFeatures(section.blocks) returns the sequence the Chapter (WP5) renders: single blocks through
 * <Block>, runs through <FeatureRun renderer=…>.
 */
import type { Block, Media } from './blocks';
import { dimsOf, fileOf, stagingOf } from './staging';

export type FeatureBlock = Extract<Block, { t: 'feature' }>;
export type SingleRenderer = 'stacked' | 'split';
export type RunRenderer = 'phone' | 'player';

export type Group =
  | { kind: 'block'; index: number; renderer?: SingleRenderer }
  | { kind: 'run'; renderer: RunRenderer; indices: number[] };

export function isDesktopCapture(m: Media): boolean {
  const d = dimsOf(fileOf(m));
  const w = d?.[0] ?? m.w;
  const h = d?.[1] ?? m.h;
  return w >= 1800 && w / h >= 1.3;
}

export function isPhoneMedia(m: Media): boolean {
  return stagingOf(m).phone === true;
}

export function singleRenderer(b: FeatureBlock): SingleRenderer {
  return b.media.length === 1 && isDesktopCapture(b.media[0]) ? 'stacked' : 'split';
}

const phoneOk = (b: Block): boolean => b.t === 'feature' && b.media.length > 0 && b.media.every(isPhoneMedia);
const playerOk = (b: Block): boolean =>
  b.t === 'feature' && !b.title && !!b.lede && b.media.length === 1 && isDesktopCapture(b.media[0]);

export function groupFeatures(blocks: Block[]): Group[] {
  const out: Group[] = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    if (b.t === 'feature') {
      let j = i;
      while (j < blocks.length && phoneOk(blocks[j])) j++;
      if (j - i >= 2) {
        out.push({ kind: 'run', renderer: 'phone', indices: range(i, j) });
        i = j;
        continue;
      }
      j = i;
      while (j < blocks.length && playerOk(blocks[j])) j++;
      if (j - i >= 3) {
        out.push({ kind: 'run', renderer: 'player', indices: range(i, j) });
        i = j;
        continue;
      }
      out.push({ kind: 'block', index: i, renderer: singleRenderer(b) });
    } else {
      out.push({ kind: 'block', index: i });
    }
    i++;
  }
  return out;
}

const range = (a: number, b: number) => Array.from({ length: b - a }, (_, k) => a + k);
