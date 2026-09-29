/**
 * media-lib.ts · WP4b. Build-time helpers for the media components (Plate, Placeholder, DimString, Compare, Strip,
 * the walkthroughs and the Media/Feature blocks). BUILD-TIME ONLY: it reads file headers with node:fs (via
 * lib/staging's MEDIA_DIR) and must never be imported from a browser script.
 *
 * Nothing here changes a file: it only reads facts (size, format, transparency) to decide how to FRAME a file.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Media } from '../../lib/blocks';
import { MEDIA_DIR, facts, fileOf, stagingOf, type MediaFacts } from '../../lib/staging';

export type MediaKind = 'image' | 'gif' | 'video';

export function kindOf(m: Media | string): MediaKind {
  const f = facts(m);
  return f.kind === 'video' ? 'video' : f.gif ? 'gif' : 'image';
}

const alphaCache = new Map<string, boolean>();

/**
 * Does the file carry transparency? PNG: colour type 4/6 or a tRNS chunk before IDAT. WEBP: the VP8X alpha flag or a
 * VP8L stream (lossless may carry alpha; treated as transparent). JPG/GIF/MP4: no (the GIFs here are opaque canvases).
 * Used to keep the drafting-X placeholder from showing THROUGH a transparent image while it is still decoding.
 */
export function hasAlpha(m: Media | string): boolean {
  const file = fileOf(m);
  const hit = alphaCache.get(file);
  if (hit != null) return hit;
  const f = facts(file);
  let alpha = false;
  if (!f.remote && (f.format === 'PNG' || f.format === 'WEBP')) {
    try {
      const fd = fs.openSync(path.join(MEDIA_DIR(), file), 'r');
      const buf = new Uint8Array(4096);
      fs.readSync(fd, buf, 0, 4096, 0);
      fs.closeSync(fd);
      const ascii = (a: number, b: number) => String.fromCharCode(...buf.slice(a, b));
      const u32 = (at: number) => ((buf[at] << 24) | (buf[at + 1] << 16) | (buf[at + 2] << 8) | buf[at + 3]) >>> 0;
      if (f.format === 'PNG') {
        const colourType = buf[25];
        alpha = colourType === 4 || colourType === 6;
        if (!alpha) {
          // walk the chunks until IDAT, looking for tRNS
          let at = 8;
          while (at + 8 < buf.length) {
            const type = ascii(at + 4, at + 8);
            if (type === 'tRNS') { alpha = true; break; }
            if (type === 'IDAT') break;
            at += 12 + u32(at);
          }
        }
      } else {
        const chunk = ascii(12, 16);
        alpha = chunk === 'VP8L' || (chunk === 'VP8X' && (buf[20] & 0x10) !== 0);
      }
    } catch {
      alpha = false;
    }
  }
  alphaCache.set(file, alpha);
  return alpha;
}

/** Bytes above which a still gets the drafting-X loading placeholder (heavy media reads as intentional while it loads). */
export const HEAVY_BYTES = 100 * 1024;

/**
 * The drafting X is for heavy media: every GIF and video, and opaque stills ≥ 100 KB. Transparent stills never get
 * one (it would show through them), and light stills paint before a placeholder could matter.
 */
export function wantsPlaceholder(m: Media | string): boolean {
  const k = kindOf(m);
  if (k !== 'image') return true;
  const f = facts(m);
  return (f.bytes ?? 0) >= HEAVY_BYTES && !hasAlpha(m);
}

/** The box of a layer contained in a box of aspect `A` with `pad`% stage margin, in % of that box. */
export function containRect(aspect: number, A: number, pad = 0): { l: number; t: number; w: number; h: number } {
  const inner = 100 - 2 * pad;
  if (aspect >= A) {
    const h = (inner * A) / aspect;
    return { l: pad, t: (100 - h) / 2, w: inner, h };
  }
  const w = (inner * aspect) / A;
  return { l: (100 - w) / 2, t: pad, w, h: inner };
}

export const r4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** '0:48' for 47.8 s (the Teachable play label). */
export function clock(secs: number): string {
  const s = Math.round(secs);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Is this file enlargeable? Every figure except icons, logos and avatars (§6.2 "Zoom"); staging zoom:'none' opts out. */
export function enlargeable(m: Media | string): boolean {
  return stagingOf(m).zoom !== 'none';
}

/** The facts the Enlarged detail needs, as data attributes on the plate (read at runtime; no second lookup). */
export function factAttrs(f: MediaFacts): Record<string, string> {
  return {
    'data-src-orig': f.src,
    'data-native': `${f.w}×${f.h}`,
    'data-fmt': f.format,
    'data-size': f.size,
  };
}
