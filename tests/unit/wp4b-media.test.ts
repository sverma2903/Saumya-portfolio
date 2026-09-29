/**
 * WP4b · media system: the staging decisions and build-time helpers the components rely on.
 * (Behaviour — GIF/video managers, the player, the walkthrough, Compare, the Enlarged detail — is exercised in the
 * browser; tests/dist/wp4b-media.test.ts checks the markup contracts in the built pages.)
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { staging } from '@/data/media-staging';
import { facts, fileOf } from '@/lib/staging';
import { groupFeatures } from '@/lib/features';
import { cases } from '@/content/site';
import type { Block } from '@/lib/blocks';
import { clock, containRect, enlargeable, factAttrs, hasAlpha, kindOf, wantsPlaceholder } from '@/components/media/media-lib';

const points = (poly: string): number[][] => poly.split(',').map((p) => p.trim().split(/\s+/).map((v) => parseFloat(v)));

describe('baked phones: the device silhouette', () => {
  const baked = Object.entries(staging).filter(([, s]) => s.frame === 'phone-baked');

  test('all five baked phones carry an outline (and keep the documented clip as a fallback)', () => {
    expect(baked.map(([f]) => f.slice(0, 6)).sort()).toEqual(['LDyuw9', 'fvgOb7', 'n8B6Uj', 'sXzdMl', 'so2bh2']);
    for (const [f, s] of baked) {
      expect(s.outline, f).toBeTruthy();
      expect(s.clip, f).toBeTruthy();
      expect(s.phone, f).toBe(true);
    }
  });

  test('outlines are valid polygon() points in % of the canvas', () => {
    for (const [f, s] of baked) {
      const p = points(s.outline!);
      expect(p.length, f).toBeGreaterThanOrEqual(40);
      for (const [x, y] of p) {
        expect(Number.isFinite(x) && Number.isFinite(y), f).toBe(true);
        expect(x, f).toBeGreaterThanOrEqual(0);
        expect(x, f).toBeLessThanOrEqual(100);
        expect(y, f).toBeGreaterThanOrEqual(0);
        expect(y, f).toBeLessThanOrEqual(100);
      }
    }
  });

  test('each silhouette hugs its device: extents within ±0.5 % of the device box (§8.6)', () => {
    for (const [f, s] of baked) {
      const p = points(s.outline!);
      const xs = p.map((q) => q[0]);
      const ys = p.map((q) => q[1]);
      const [t, r, b, l] = s.clip!.split(' ').map(parseFloat);
      expect(Math.abs(Math.min(...xs) - l), `${f} left`).toBeLessThanOrEqual(0.5);
      expect(Math.abs(Math.max(...xs) - (100 - r)), `${f} right`).toBeLessThanOrEqual(0.5);
      expect(Math.abs(Math.min(...ys) - t), `${f} top`).toBeLessThanOrEqual(0.5);
      expect(Math.abs(Math.max(...ys) - (100 - b)), `${f} bottom`).toBeLessThanOrEqual(0.5);
    }
  });

  test('only baked phones are clipped', () => {
    for (const [f, s] of Object.entries(staging)) {
      if (s.outline || s.clip) expect(s.frame, f).toBe('phone-baked');
    }
  });
});

describe('GIF posters: complete, representative states (checked by eye on contact sheets)', () => {
  const reviewed: Record<string, number> = {
    'xVY62d93p5rA2uqmmKmIQwjR8I.gif': 330,
    '0JYHrpqh8iEliclxggLD75ZEjk0.gif': 190,
    'aOQ6T1UV764GiQaZId5sGFokWHg.gif': 135,
    '0lWQvXlWN92Ca4YkYqStcDEKY.gif': 210,
    'fvgOb7paqb8aI3RLh9ZvVpZoU8.gif': 108,
    'sXzdMl4SEFeL4sF51iLLjSHVoDo.gif': 24,
    'LDyuw9DTp9W6eRcAL624pBSTJHU.gif': 60,
    'so2bh2Z1W0CGtqzMd31ce39P24g.gif': 55,
    'n8B6UjNXYmQuUj8qsFbQGT75Vdo.gif': 56,
    'hc5LSNViBiB98sAACx272BNZYw.gif': 50,
  };
  test('every GIF has a reviewed poster frame inside the file', () => {
    for (const [f, s] of Object.entries(staging)) {
      if (!s.gif) continue;
      expect(reviewed[f], `${f} has no reviewed poster`).toBeDefined();
      expect(s.gif.poster, f).toBe(reviewed[f]);
      expect(s.gif.poster, f).toBeLessThan(s.gif.frames);
      expect(facts(f).format, f).toBe('GIF');
    }
  });
});

describe('the section cut A–A (SM6a)', () => {
  const c = staging['lR8M0Y29rJGG4GIE3nmmHsmo08.jpg'].compare!;
  test('measured offsets are small whole native pixels', () => {
    const top = facts('lR8M0Y29rJGG4GIE3nmmHsmo08.jpg');
    expect(Number.isInteger(c.dx) && Number.isInteger(c.dy)).toBe(true);
    expect(Math.abs(c.dx)).toBeLessThanOrEqual(top.w * 0.01);
    expect(Math.abs(c.dy)).toBeLessThanOrEqual(top.h * 0.02);
    expect(c.start).toBe(42);
  });
  test('the wireframe beneath is the aligned 3456-wide file, and both are JPEGs', () => {
    expect(facts(c.under).w).toBe(3456);
    expect(facts(c.under).format).toBe('JPG');
    expect(facts('lR8M0Y29rJGG4GIE3nmmHsmo08.jpg').format).toBe('JPG');
  });
});

describe('media-lib (build-time helpers)', () => {
  test('transparency is read from the file header', () => {
    expect(hasAlpha('ynF3JX3AYbXmF5u4ZKwl04aGc.png')).toBe(true); // the Cloudflare laptop (transparent)
    expect(hasAlpha('iaZFTmw1LjJ6sFQCiaDCjYl5wOU.jpg')).toBe(false);
    expect(hasAlpha('hc5LSNViBiB98sAACx272BNZYw.gif')).toBe(false);
  });
  test('the drafting X is for heavy media only (never through a transparent file)', () => {
    expect(wantsPlaceholder('xVY62d93p5rA2uqmmKmIQwjR8I.gif')).toBe(true);
    expect(wantsPlaceholder('kDWwW64PagR7INZeCK4xW3Duw.mp4')).toBe(true);
    expect(wantsPlaceholder('iaZFTmw1LjJ6sFQCiaDCjYl5wOU.jpg')).toBe(true); // 327 KB opaque
    expect(wantsPlaceholder('IVrPyYYRJLjhPvlS4eSOwn52NaE.png')).toBe(false); // 3 KB icon
    expect(wantsPlaceholder('ynF3JX3AYbXmF5u4ZKwl04aGc.png')).toBe(false); // transparent
  });
  test('kinds, clock, enlargeable, facts', () => {
    expect(kindOf('xVY62d93p5rA2uqmmKmIQwjR8I.gif')).toBe('gif');
    expect(kindOf('kDWwW64PagR7INZeCK4xW3Duw.mp4')).toBe('video');
    expect(kindOf('WgCbjKzHjiwauZbYEdrJmoKdl7Q.jpg')).toBe('image');
    expect(clock(47.8)).toBe('0:48');
    expect(clock(125)).toBe('2:05');
    expect(enlargeable('UHWtZDl7VBaFhCnX2PHWVnA.webp')).toBe(false); // a logo, not a figure
    expect(enlargeable('lR8M0Y29rJGG4GIE3nmmHsmo08.jpg')).toBe(true);
    // Enlarged detail facts: real format by magic bytes, fs.statSync size
    expect(factAttrs(facts('WgCbjKzHjiwauZbYEdrJmoKdl7Q.jpg'))).toMatchObject({
      'data-native': '3526×1005',
      'data-fmt': 'PNG',
      'data-size': '134 KB',
      'data-src-orig': '/media/WgCbjKzHjiwauZbYEdrJmoKdl7Q.jpg',
    });
  });
  test('containRect centres a layer inside its stage padding', () => {
    expect(containRect(1.6, 1.6, 8)).toEqual({ l: 8, t: 8, w: 84, h: 84 });
    const tall = containRect(1, 2, 0); // a square in a 2:1 box
    expect(tall.h).toBe(100);
    expect(tall.w).toBe(50);
    expect(tall.l).toBe(25);
  });
});

describe('feature renderers per case (§6.2)', () => {
  const sectionOf = (slug: string, id: string) => {
    const cs = cases.find((c) => c.slug === slug)!;
    return cs.sections.find((s) => s.id === id)!;
  };
  const featureMedia = (blocks: Block[], indices: number[]) =>
    indices.map((i) => {
      const b = blocks[i];
      return b.t === 'feature' ? fileOf(b.media[0]).slice(0, 6) : '';
    });

  test('Cloudflare W1–W4: four stacked features (W4 is the section cut)', () => {
    const sec = sectionOf('cloudflare', 'prototype');
    const groups = groupFeatures(sec.blocks).filter((g) => g.kind === 'block' && g.renderer);
    expect(groups.map((g) => (g.kind === 'block' ? g.renderer : ''))).toEqual(['stacked', 'stacked', 'stacked', 'stacked']);
    const last = sec.blocks[groups[3].kind === 'block' ? groups[3].index : 0];
    expect(last.t === 'feature' && fileOf(last.media[0])).toBe('lR8M0Y29rJGG4GIE3nmmHsmo08.jpg');
  });

  test('PFF Highlights: one player run of 5 (1 GIF + 4 MP4)', () => {
    const sec = sectionOf('pff', 'highlights');
    const runs = groupFeatures(sec.blocks).filter((g) => g.kind === 'run');
    expect(runs.length).toBe(1);
    const run = runs[0];
    expect(run.kind === 'run' && run.renderer).toBe('player');
    const idx = run.kind === 'run' ? run.indices : [];
    expect(idx.length).toBe(5);
    expect(featureMedia(sec.blocks, idx)).toEqual(['0lWQvX', 'kDWwW6', 'TJ24G6', 'Eh8LAs', 'HuYD94']);
  });

  test('U-Up and Educademy: phone walkthroughs (Educademy returns to so2bh2)', () => {
    const uup = cases.find((c) => c.slug === 'u-up')!;
    const edu = cases.find((c) => c.slug === 'educademy')!;
    const phoneRun = (cs: typeof uup) => {
      for (const sec of cs.sections) {
        const run = groupFeatures(sec.blocks).find((g) => g.kind === 'run' && g.renderer === 'phone');
        if (run && run.kind === 'run') return featureMedia(sec.blocks, run.indices);
      }
      return [];
    };
    expect(phoneRun(uup)).toEqual(['fvgOb7', 'sXzdMl', 'LDyuw9']);
    expect(phoneRun(edu)).toEqual(['so2bh2', 'n8B6Uj', 'so2bh2']);
  });

  test('CSBS 01–04: split rows; 01 bleeds right, 02 (flipped) bleeds left — each file is cropped at that edge', () => {
    const sec = sectionOf('csbs', 'prototype');
    const singles = groupFeatures(sec.blocks).filter((g) => g.kind === 'block' && g.renderer);
    expect(singles.map((g) => (g.kind === 'block' ? g.renderer : ''))).toEqual(['split', 'split', 'split', 'split']);
    const bleeds = singles.map((g) => {
      const b = sec.blocks[g.kind === 'block' ? g.index : 0];
      return b.t === 'feature' ? [staging[fileOf(b.media[0])]?.bleed, !!b.flip] : [];
    });
    expect(bleeds).toEqual([['right', false], ['left', true], [undefined, false], [undefined, true]]);
    // a bleed is always on the side the figure sits against in its row: right in a normal row, left in a flipped one
    for (const [side, flip] of bleeds) if (side) expect(side).toBe(flip ? 'left' : 'right');
  });
});

describe('per-file staging decisions checked against her original pages', () => {
  test('logo material composed on white sits on a white `soft` ground (its white canvas vanishes, as on her site)', () => {
    expect(staging['cVgfb0s0hG7fYwQ76o8ctXWHqe8.png']).toMatchObject({ frame: 'soft' });
    expect(facts('cVgfb0s0hG7fYwQ76o8ctXWHqe8.png').format).toBe('PNG');
    expect(hasAlpha('cVgfb0s0hG7fYwQ76o8ctXWHqe8.png')).toBe(true); // transparent, with one white logo box inside
  });
  test('text-bearing artefacts that need the wide area stay legible (her page gave them ≈ 430 px / 250 px each)', () => {
    for (const f of ['ah6Xf97OKA9xBM9n64Z5qtdWmQg.jpg', 'yLHVdvapLHy1NeiXIk5N40FOF8.jpg']) expect(staging[f]?.wide, f).toBe(true);
    for (const f of ['L2rNvBTpjcL8sFrG805usBfPg.png', 'AsmhYZ4yHfi7hGF0yfEI44gXUY.png', 'nEWiq0mcXzcoXwQIWAaNrTXvA4.png', 'tmypcLaZrlWiXDWV5IsQHRdIIs0.png']) {
      expect(staging[f], f).toMatchObject({ frame: 'print', wide: true });
    }
  });
});

describe('tokens the media system draws with (tokens.css)', () => {
  const css = fs.readFileSync(path.resolve('src/styles/tokens.css'), 'utf8');
  const rootBlock = css.slice(0, css.indexOf(':root[data-theme="dusk"]'));
  const duskBlock = css.slice(css.indexOf(':root[data-theme="dusk"]'));
  test.each(['--bezel', '--bezel-dark', '--white', '--print-ink', '--print-line'])('%s is defined on :root and never themed', (t) => {
    expect(rootBlock).toMatch(new RegExp(`${t}:\\s*[^;]+;`));
    expect(duskBlock).not.toMatch(new RegExp(`${t}:`));
  });
});
