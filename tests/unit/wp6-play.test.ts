/**
 * WP6 data invariants: her tile grid and the pin board staging (tests/unit/wp6-play.test.ts).
 * Written by WP6 as a proposal for WP7; adopted at integration.
 */
import { describe, expect, test } from 'vitest';
import { GRID, HER, MATERIALS, materialById, wordsAt, wordsOf } from '@/components/play/tiles';
import { BEZEL, LAPTOP_BBOX, PINS, deviceAspect, scaledBBox } from '@/components/play/board';
import { play } from '@/content/site';
import { fileOf } from '@/lib/staging';
import dims from '@/data/dims.json';

describe('the DATA / DESIGN / NERDS grid (her original home grid)', () => {
  test('5 columns × 6 rows, her letters where she put them', () => {
    expect(GRID).toHaveLength(6);
    for (const row of GRID) expect(row).toHaveLength(5);
    const text = GRID.map((row) => row.map((t) => (t.kind === 'letter' ? t.l : '·')).join('')).join('/');
    expect(text).toBe('DATA·/E··I·/S····/I····/G····/NERDS');
  });
  test('it spells DATA →, DESIGN ↓, AI ↓, NERDS → (in a crossword’s order)', () => {
    expect(wordsOf().map((w) => `${w.w} ${w.dir}`)).toEqual(['DATA across', 'DESIGN down', 'AI down', 'NERDS across']);
    expect(wordsAt(0, 0)).toEqual(['DESIGN', 'DATA']);
    expect(wordsAt(0, 3)).toEqual(['AI', 'DATA']);
    expect(wordsAt(1, 3)).toEqual(['AI']);
    expect(wordsAt(5, 0)).toEqual(['DESIGN', 'NERDS']);
    expect(wordsAt(2, 2)).toEqual([]);
  });
  test('each material tile starts in the nearest of her five colours to her original tile (ghosts are void)', () => {
    // her original home board's non-letter tiles (git 56a1c7c src/pages/index.astro), row by row; null = ghost
    const orig: Record<string, string | null> = {
      '0.4': '#ffd5bf',
      '1.1': '#a63d00', '1.2': '#7a1f06', '1.4': '#d96a2b',
      '2.1': null, '2.2': '#7a1f06', '2.3': null, '2.4': '#b6461e',
      '3.1': '#d96a2b', '3.2': '#b6461e', '3.3': '#7a1f06', '3.4': '#ffd5bf',
      '4.1': '#ffe1d3', '4.2': null, '4.3': '#a63d00', '4.4': '#c87457',
    };
    const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const d = (a: string, b: string) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));
    const nearest = (h: string) => Object.values(HER).reduce((best, c) => (d(h, c) < d(h, best) ? c : best));
    GRID.forEach((row, r) => row.forEach((t, c) => {
      if (t.kind !== 'mat') return;
      const o = orig[`${r}.${c}`];
      expect(o, `${r}.${c}`).not.toBeUndefined();
      if (o === null) expect(t.mat).toBe('void');
      else expect(materialById(t.mat).c.toLowerCase(), `${r}.${c}`).toBe(nearest(o).toLowerCase());
    }));
  });
  test('her letter tiles: outline D T E N, the rest solid; her light T and bold R', () => {
    const letters = GRID.flat().filter((t) => t.kind === 'letter');
    expect(letters.filter((t) => t.look === 'outline').map((t) => t.l).join('')).toBe('DTEN');
    expect(letters.find((t) => t.l === 'T')?.weight).toBe(300);
    expect(letters.find((t) => t.l === 'R')?.weight).toBe(700);
  });
  test('materials are drawn only in her five colours, and every material tile is one of them', () => {
    const hers = new Set<string>(Object.values(HER));
    expect(new Set(Object.values(HER))).toEqual(new Set(['#7A1F06', '#A73E02', '#D36431', '#C57658', '#F2DACD']));
    for (const m of MATERIALS) expect(hers.has(m.c)).toBe(true);
    expect(new Set(MATERIALS.map((m) => m.id)).size).toBe(MATERIALS.length);
    const ids = new Set(MATERIALS.map((m) => m.id));
    for (const t of GRID.flat()) if (t.kind === 'mat') expect(ids.has(t.mat)).toBe(true);
    expect(GRID.flat().filter((t) => t.kind === 'mat')).toHaveLength(16);
  });
});

describe('the pin board (SPEC §5.4)', () => {
  test('all five items are staged, in her order', () => {
    expect(play.items.map((it) => PINS[fileOf(it.media[0])]?.key)).toEqual(['conversense', 'expresslanes', 'teachable', 'orbit', 'educademy']);
  });
  test('rotations −0.6°, +0.4°, −0.3°, +0.5°, −0.4°', () => {
    expect(play.items.map((it) => PINS[fileOf(it.media[0])].rot)).toEqual([-0.6, 0.4, -0.3, 0.5, -0.4]);
  });
  test('ExpressLanes: the laptop bbox is inside her file, and at 1.2× in its 1:1 stage no laptop pixel is clipped', () => {
    const [w, h] = (dims as Record<string, number[]>)['sgdIeQ2FYc9vdl8NcEV3RS8g.jpg'];
    expect([LAPTOP_BBOX.w, LAPTOP_BBOX.h]).toEqual([w, h]);
    expect(LAPTOP_BBOX.x0).toBeGreaterThanOrEqual(0);
    expect(LAPTOP_BBOX.x1).toBeLessThan(w);
    expect(LAPTOP_BBOX.y1).toBeLessThan(h);
    const conf = PINS['sgdIeQ2FYc9vdl8NcEV3RS8g.jpg'];
    expect(conf.scale).toBe(1.2);
    const b = scaledBBox(conf.scale!, conf.box);
    for (const v of Object.values(b)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    // …and 1.3× would clip its left and right edges: the check has teeth
    const over = scaledBBox(1.3, conf.box);
    expect(over.l).toBeLessThan(0);
    expect(over.r).toBeGreaterThan(1);
  });
  test('deviceAspect: a bare screen keeps its own aspect; a ring makes the device squatter', () => {
    expect(deviceAspect(868, 1920)).toBeCloseTo(868 / 1920, 6);
    expect(deviceAspect(868, 1920, BEZEL.ring)).toBeGreaterThan(868 / 1920);
  });
});
