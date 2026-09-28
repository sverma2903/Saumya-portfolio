/**
 * staging.ts · P0. Build-time media facts + resolved staging (SPEC §6.3–6.4, §4.5).
 *
 *   facts(m)      → { file, src, w, h, aspect, kind, format (by MAGIC BYTES), bytes (fs.statSync), size label … }
 *   stagingOf(f)  → the media-staging.ts entry ({} if none)
 *   frameOf(f)    → resolved frame ('plate' default)
 *
 * BUILD-TIME ONLY (uses node:fs). Import from .astro frontmatter or Node tooling, never from browser scripts.
 * Paths resolve from process.cwd() (the project root for `astro build`, `vitest`, `node tools/*`).
 */
import fs from 'node:fs';
import path from 'node:path';
import dimsJson from '../data/dims.json';
import { staging, type Frame, type Staging } from '../data/media-staging';
import type { Media } from './blocks';

export type Format = 'JPG' | 'PNG' | 'GIF' | 'WEBP' | 'MP4' | 'SVG' | 'UNKNOWN';

const DIMS = dimsJson as unknown as Record<string, [number, number]>;

/** Files that exceed Cloudflare's 25 MiB per-file asset limit and stay on their original CDN. */
export const REMOTE_FILES: Record<string, { url: string; bytes: number; format: Format }> = {
  // HEAD https://framerusercontent.com/assets/6GwunOSeX0YVHJspIvJG7W3Q.mp4 → content-length 39132657 (2026-09-28)
  '6GwunOSeX0YVHJspIvJG7W3Q.mp4': { url: 'https://framerusercontent.com/assets/6GwunOSeX0YVHJspIvJG7W3Q.mp4', bytes: 39132657, format: 'MP4' },
};

export interface MediaFacts {
  file: string;          // basename, e.g. 'iaZFTmw1LjJ6sFQCiaDCjYl5wOU.jpg'
  src: string;           // URL used in HTML ('/media/…' or the remote URL)
  w: number;             // native px (dims.json)
  h: number;
  aspect: number;        // w / h
  kind: 'image' | 'video';
  ext: string;           // lower-case extension from the name ('jpg')
  format: Format;        // REAL format from magic bytes ('PNG' for the 21 mis-named files)
  extMismatch: boolean;  // name says one thing, bytes another
  bytes: number | null;  // file size (fs.statSync) or the known remote size
  size: string;          // '327 KB' · '4.9 MB' (base 1024)
  remote: boolean;
  gif: boolean;          // animated GIF (by format)
}

export const MEDIA_DIR = () => path.resolve(process.cwd(), 'public/media');

/** Basename of a Media item, a /media/ URL or the remote URL. */
export function fileOf(m: Media | string): string {
  const src = typeof m === 'string' ? m : m.src;
  const clean = src.split(/[?#]/)[0];
  return clean.slice(clean.lastIndexOf('/') + 1);
}

export function srcOf(file: string): string {
  return REMOTE_FILES[file]?.url ?? `/media/${file}`;
}

export function dimsOf(file: string): [number, number] | undefined {
  return DIMS[file];
}

export function stagingOf(m: Media | string): Staging {
  return staging[fileOf(m)] ?? {};
}

export function frameOf(m: Media | string, fallback: Frame = 'plate'): Frame {
  return stagingOf(m).frame ?? fallback;
}

/** Detect the real container from the first bytes. */
export function sniff(head: Uint8Array): Format {
  const b = head;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'JPG';
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'PNG';
  if (b.length >= 4 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'GIF';
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'WEBP';
  if (b.length >= 8 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) return 'MP4';
  const txt = new TextDecoder().decode(b.slice(0, 64)).trimStart();
  if (txt.startsWith('<svg') || txt.startsWith('<?xml')) return 'SVG';
  return 'UNKNOWN';
}

const EXT_FORMAT: Record<string, Format> = { jpg: 'JPG', jpeg: 'JPG', png: 'PNG', gif: 'GIF', webp: 'WEBP', mp4: 'MP4', svg: 'SVG' };

/** '85137' → '83 KB'; '5154770' → '4.9 MB' (base 1024, as Finder/Explorer "KB"). */
export function formatBytes(n: number | null | undefined): string {
  if (n == null) return '';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const cache = new Map<string, MediaFacts>();

export function facts(m: Media | string): MediaFacts {
  const file = fileOf(m);
  const hit = cache.get(file);
  if (hit) return hit;
  const ext = (file.split('.').pop() ?? '').toLowerCase();
  const [w, h] = DIMS[file] ?? [0, 0];
  const remote = REMOTE_FILES[file];
  let bytes: number | null = null;
  let format: Format = EXT_FORMAT[ext] ?? 'UNKNOWN';
  if (remote) {
    bytes = remote.bytes;
    format = remote.format;
  } else {
    const p = path.join(MEDIA_DIR(), file);
    try {
      bytes = fs.statSync(p).size;
      const fd = fs.openSync(p, 'r');
      const head = new Uint8Array(64);
      fs.readSync(fd, head, 0, 64, 0);
      fs.closeSync(fd);
      format = sniff(head);
    } catch {
      bytes = null;
    }
  }
  const f: MediaFacts = {
    file,
    src: srcOf(file),
    w,
    h,
    aspect: w && h ? w / h : 16 / 10,
    kind: format === 'MP4' || ext === 'mp4' ? 'video' : 'image',
    ext,
    format,
    extMismatch: (EXT_FORMAT[ext] ?? 'UNKNOWN') !== format,
    bytes,
    size: formatBytes(bytes),
    remote: !!remote,
    gif: format === 'GIF',
  };
  cache.set(file, f);
  return f;
}

/** Placeholder / figure-tag label: '2662 × 1716 · GIF · 6.2 MB' (chrome). */
export function dimsLabel(m: Media | string, withSize = true): string {
  const f = facts(m);
  const parts = [`${f.w} × ${f.h}`, f.format];
  if (withSize && f.size) parts.push(f.size);
  return parts.join(' · ');
}
