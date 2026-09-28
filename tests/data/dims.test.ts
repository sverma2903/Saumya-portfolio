/**
 * Every media file referenced in src/content and sheets.ts exists in public/media (or is the one remote file) and has
 * dims; dims equal the real pixel size (images: header parse; MP4: tkhd box). 221 local files + 1 remote.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import dimsJson from '@/data/dims.json';
import { about, cases, play, selected } from '@/content/site';
import { sheets } from '@/data/sheets';
import { staging } from '@/data/media-staging';
import { REMOTE_FILES, fileOf } from '@/lib/staging';
import type { Block, Media } from '@/lib/blocks';

const DIMS = dimsJson as unknown as Record<string, [number, number]>;
const MEDIA = path.resolve('public/media');
const local = fs.readdirSync(MEDIA).filter((f: string) => !f.startsWith('.'));

function blockMedia(b: Block): Media[] {
  switch (b.t) {
    case 'media': return b.items;
    case 'feature': return b.media;
    case 'cards': return b.items.flatMap((i) => (i.img ? [i.img] : []));
    case 'stories': return b.items.map((i) => i.img);
    case 'insights': return b.items.flatMap((i) => (i.img ? [i.img] : []));
    case 'tabs': return b.items.map((i) => i.media);
    case 'concept': return b.media;
    case 'split': return [...b.left, ...b.right].flatMap(blockMedia);
    default: return [];
  }
}
const referenced = new Set<string>([
  ...cases.flatMap((cs) => [...cs.cover, ...cs.sections.flatMap((s) => s.blocks.flatMap(blockMedia))].map(fileOf)),
  ...selected.flatMap((s) => [s.cover, s.logo].map(fileOf)),
  about.portrait, ...about.loves.fiction.books, about.loves.meditation.img, ...about.loves.sketching.sketches,
].map((m) => (typeof m === 'string' ? m : fileOf(m))));
play.items.forEach((i) => i.media.forEach((m) => referenced.add(fileOf(m))));
sheets.forEach((s) => s.plate?.layers.forEach((l) => referenced.add(l.file)));

/** Native size from the file header (PNG, GIF, JPEG, WEBP) or the MP4 tkhd box. */
function readSize(file: string): [number, number] | null {
  const b = fs.readFileSync(path.join(MEDIA, file));
  if (b[0] === 0x89 && b[1] === 0x50) return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b[0] === 0x47 && b[1] === 0x49) return [b.readUInt16LE(6), b.readUInt16LE(8)];
  if (b[0] === 0x52 && b[8] === 0x57) {
    const chunk = b.toString('ascii', 12, 16);
    if (chunk === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
    if (chunk === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    if (chunk === 'VP8L') { const n = b.readUInt32LE(21); return [(n & 0x3fff) + 1, ((n >> 14) & 0x3fff) + 1]; }
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      const len = b.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
      i += 2 + len;
    }
  }
  const t = b.indexOf('tkhd');
  if (t > 0) {
    const size = b.readUInt32BE(t - 4);
    const end = t - 4 + size;
    return [b.readUInt32BE(end - 8) / 65536, b.readUInt32BE(end - 4) / 65536];
  }
  return null;
}

describe('media inventory', () => {
  test('221 local files + 1 remote are all in dims.json (incl. the six MP4s)', () => {
    expect(local.length).toBe(221);
    for (const f of local) expect(DIMS[f], f).toBeDefined();
    for (const f of Object.keys(REMOTE_FILES)) expect(DIMS[f], f).toBeDefined();
    for (const f of ['TJ24G62X9MOl407PtXBovxgoWw.mp4', 'Eh8LAs7UnxnzOIQPRHsvnBUH3c.mp4', 'kDWwW64PagR7INZeCK4xW3Duw.mp4', 'HuYD94DXbwjbqrO9Wx52NbnYB6Y.mp4', 'GHjG21Lo2f64p4k0y3obKTFGgck.mp4', '6GwunOSeX0YVHJspIvJG7W3Q.mp4'])
      expect(DIMS[f], f).toBeDefined();
    expect(Object.keys(DIMS).length).toBe(222);
  });
  test('every referenced file exists locally or is the remote one, and has dims', () => {
    for (const f of referenced) {
      expect(local.includes(f) || f in REMOTE_FILES, `${f} missing`).toBe(true);
      expect(DIMS[f], `${f} has no dims`).toBeDefined();
    }
  });
  test('dims equal the real pixel size of every local file', () => {
    for (const f of local) {
      const real = readSize(f);
      expect(real, `${f}: could not read size`).not.toBeNull();
      expect(real, f).toEqual(DIMS[f]);
    }
  });
  test('every staging key is a real file', () => {
    for (const f of Object.keys(staging)) expect(local.includes(f) || f in REMOTE_FILES, f).toBe(true);
  });
});
