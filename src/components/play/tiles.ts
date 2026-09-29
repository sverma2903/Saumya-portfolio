/**
 * tiles.ts · WP6. Her DATA / DESIGN / NERDS tile grid (her original home page, SPEC §5.4), as a drafting legend.
 *
 * Her grid, 5 columns × 6 rows (read from her original page):
 *     D  A  T  A  ·        DATA   across row 1
 *     E  ·  ·  I  ·        DESIGN down column 1
 *     S  ·  ·  ·  ·        AI     down column 4 (the A of DATA over the I)
 *     I  ·  ·  ·  ·        NERDS  across row 6
 *     G  ·  ·  ·  ·
 *     N  E  R  D  S
 * Letter tiles are as in her original: outline (D, T, E, N) or solid (every other letter), solid in her darkest
 * #7A1F06. Her letter weights are kept: the T is set light, the R bold (her original T/R).
 * Every other cell is a MATERIAL tile: her colours #7A1F06 #A73E02 #D36431 #C57658 #F2DACD drawn as drafting
 * materials (poché, hatch, cross-hatch, courses, stipple, fill), plus the void her empty outline tiles are.
 * Letters and materials are drawn in two registers so the grid never reads as a crossword with letters missing:
 * letter tiles are raised pieces (a --lw-cut frame, --shadow-plate); a material is a swatch inset in its bed (poché
 * grained with a fine 45° hatch, never a flat tile; the void a dashed hidden line, never the letters' outline).
 * Each material tile starts as the colour her original tile had (the nearest of the five).
 *
 * Her colours are content (like her stages), so they never follow the theme: a tile is a printed sample, like a plate.
 */
export const HER = {
  oxblood: '#7A1F06',
  rust: '#A73E02',
  orange: '#D36431',
  clay: '#C57658',
  blush: '#F2DACD',
} as const;

export type MatId = 'poche' | 'rust' | 'rustx' | 'orange' | 'courses' | 'clay' | 'blush' | 'void';
export type Pattern = 'solid' | 'poche' | 'hatch' | 'hatch2' | 'cross' | 'rows' | 'dots' | 'void';
export interface Material { id: MatId; c: string; p: Pattern }

/** The legend's materials, in the order Enter cycles through them. */
export const MATERIALS: Material[] = [
  { id: 'poche', c: HER.oxblood, p: 'poche' },
  { id: 'rust', c: HER.rust, p: 'hatch' },
  { id: 'rustx', c: HER.rust, p: 'cross' },
  { id: 'orange', c: HER.orange, p: 'hatch2' },
  { id: 'courses', c: HER.orange, p: 'rows' },
  { id: 'clay', c: HER.clay, p: 'dots' },
  { id: 'blush', c: HER.blush, p: 'solid' },
  { id: 'void', c: HER.oxblood, p: 'void' },
];
export const materialById = (id: MatId): Material => MATERIALS.find((m) => m.id === id)!;

export type Tile =
  | { kind: 'letter'; l: string; look: 'outline' | 'solid'; weight?: number }
  | { kind: 'mat'; mat: MatId };
const L = (l: string, look: 'outline' | 'solid', weight?: number): Tile => ({ kind: 'letter', l, look, weight });
const M = (mat: MatId): Tile => ({ kind: 'mat', mat });

/** Row by row, as on her page. */
export const GRID: Tile[][] = [
  [L('D', 'outline'), L('A', 'solid'), L('T', 'outline', 300), L('A', 'solid'), M('blush')],
  [L('E', 'outline'), M('rust'), M('poche'), L('I', 'solid'), M('orange')],
  [L('S', 'solid'), M('void'), M('poche'), M('void'), M('rustx')],
  [L('I', 'solid'), M('courses'), M('rust'), M('poche'), M('blush')],
  [L('G', 'solid'), M('blush'), M('void'), M('rustx'), M('clay')],
  [L('N', 'outline'), L('E', 'solid'), L('R', 'solid', 700), L('D', 'solid'), L('S', 'solid')],
];

export interface Word { w: string; dir: 'across' | 'down'; cells: [number, number][] }

/**
 * Her words, as a crossword numbers them (reading order of their first letters, across before down):
 * DATA → (row 1), DESIGN ↓ (column 1), AI ↓ (column 4), NERDS → (row 6). Runs of ≥ 2 letters.
 */
export function wordsOf(grid: Tile[][] = GRID): Word[] {
  const isL = (r: number, c: number) => grid[r]?.[c]?.kind === 'letter';
  const letter = (r: number, c: number) => (grid[r][c] as Extract<Tile, { kind: 'letter' }>).l;
  const out: Word[] = [];
  const take = (r: number, c: number, dr: number, dc: number, dir: Word['dir']) => {
    if (isL(r - dr, c - dc) || !isL(r + dr, c + dc)) return; // not the start of a run of two or more
    const cells: [number, number][] = [];
    for (let rr = r, cc = c; isL(rr, cc); rr += dr, cc += dc) cells.push([rr, cc]);
    out.push({ w: cells.map(([rr, cc]) => letter(rr, cc)).join(''), dir, cells });
  };
  grid.forEach((row, r) => row.forEach((_, c) => {
    if (!isL(r, c)) return;
    take(r, c, 0, 1, 'across');
    take(r, c, 1, 0, 'down');
  }));
  return out;
}

/**
 * The words a letter tile belongs to (runs of ≥ 2 letters, down first, then across): D (r1c1) → DESIGN, DATA.
 */
export function wordsAt(r: number, c: number, grid: Tile[][] = GRID): string[] {
  const isL = (rr: number, cc: number) => grid[rr]?.[cc]?.kind === 'letter';
  const letter = (rr: number, cc: number) => (grid[rr][cc] as Extract<Tile, { kind: 'letter' }>).l;
  if (!isL(r, c)) return [];
  const run = (dr: number, dc: number) => {
    let r0 = r, c0 = c;
    while (isL(r0 - dr, c0 - dc)) { r0 -= dr; c0 -= dc; }
    let w = '';
    for (let rr = r0, cc = c0; isL(rr, cc); rr += dr, cc += dc) w += letter(rr, cc);
    return w.length >= 2 ? w : '';
  };
  return [run(1, 0), run(0, 1)].filter(Boolean);
}
