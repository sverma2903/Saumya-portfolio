import fs from 'node:fs';
import { describe, expect, test } from 'vitest';
import { staging } from '@/data/media-staging';
import { dimsLabel, facts, formatBytes, frameOf, sniff } from '@/lib/staging';

describe('media-staging.ts', () => {
  test('clip strings parse as four percentages (inset T R B L)', () => {
    for (const [f, s] of Object.entries(staging)) {
      if (!s.clip) continue;
      expect(s.clip.split(' ').length, f).toBe(4);
      for (const v of s.clip.split(' ')) expect(v, f).toMatch(/^\d+(\.\d+)?%$/);
      expect(s.frame, f).toBe('phone-baked');
      expect(s.radius, f).toBeGreaterThan(0);
    }
  });
  test('every GIF has secs/frames/poster with poster < frames; staged GIFs are GIF files', () => {
    for (const [f, s] of Object.entries(staging)) {
      if (!s.gif) continue;
      expect(s.gif.secs, f).toBeGreaterThan(0);
      expect(s.gif.frames, f).toBeGreaterThan(0);
      expect(s.gif.poster, f).toBeLessThan(s.gif.frames);
      expect(facts(f).format, f).toBe('GIF');
    }
  });
  test('videos have a duration; only the remote one has audio', () => {
    for (const [f, s] of Object.entries(staging)) {
      if (!s.video) continue;
      expect(s.video.secs, f).toBeGreaterThan(0);
      expect(!!s.video.audio, f).toBe(f === '6GwunOSeX0YVHJspIvJG7W3Q.mp4');
    }
  });
  test('compare pair is the aligned 3456-wide wireframe/final', () => {
    const c = staging['lR8M0Y29rJGG4GIE3nmmHsmo08.jpg'].compare!;
    expect(facts(c.under).w).toBe(facts('lR8M0Y29rJGG4GIE3nmmHsmo08.jpg').w);
    expect(c.start).toBe(42);
  });
});

describe('lib/staging.ts', () => {
  test('format by magic bytes: the 21 mis-named files report their real format', () => {
    expect(facts('WgCbjKzHjiwauZbYEdrJmoKdl7Q.jpg').format).toBe('PNG');
    expect(facts('WgCbjKzHjiwauZbYEdrJmoKdl7Q.jpg').extMismatch).toBe(true);
    expect(facts('UHWtZDl7VBaFhCnX2PHWVnA.webp').format).toBe('PNG');
    expect(facts('iaZFTmw1LjJ6sFQCiaDCjYl5wOU.jpg').format).toBe('JPG');
    expect(facts('hc5LSNViBiB98sAACx272BNZYw.gif').format).toBe('GIF');
    expect(facts('GHjG21Lo2f64p4k0y3obKTFGgck.mp4').format).toBe('MP4');
  });
  test('sizes from fs.statSync (base 1024) and the remote size', () => {
    expect(facts('ynF3JX3AYbXmF5u4ZKwl04aGc.png').size).toBe('83 KB');
    expect(facts('iaZFTmw1LjJ6sFQCiaDCjYl5wOU.jpg').size).toBe('327 KB');
    expect(facts('6GwunOSeX0YVHJspIvJG7W3Q.mp4')).toMatchObject({ remote: true, bytes: 39132657, w: 868, h: 1920, kind: 'video' });
    expect(formatBytes(5154770)).toBe('4.9 MB');
    expect(dimsLabel('iaZFTmw1LjJ6sFQCiaDCjYl5wOU.jpg')).toBe('3456 × 2534 · JPG · 327 KB');
  });
  test('frames resolve with a plate default', () => {
    expect(frameOf('xVY62d93p5rA2uqmmKmIQwjR8I.gif')).toBe('browser');
    expect(frameOf('ynF3JX3AYbXmF5u4ZKwl04aGc.png')).toBe('plate');
    expect(sniff(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))).toBe('PNG');
  });
  test('21 files carry a mismatched extension (media audit)', () => {
    const n = fs.readdirSync('public/media').filter((f: string) => facts(f).extMismatch).length;
    expect(n).toBe(21);
  });
});
