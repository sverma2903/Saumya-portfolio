/**
 * revcloud.ts · WP1. The 404's revision cloud geometry (SPEC §5.5, SM6b's drawing), shared by the build (a static
 * cloud in the HTML, so the sheet has its cloud without JS) and the page script (redrawn to the box's real size).
 *
 * The walk runs clockwise round the box, inset by the scallop's bulge, so the scallops' crowns touch the box edge:
 * the box IS the drawing's outer edge and aligns to the page grid like any other block. One outward arc per segment
 * (n = max(2, round(len / unit))), r = seg · 0.62 with ±6% seeded jitter: hand-drawn, yet identical on every visit.
 */

/** A seeded xorshift (FNV-1a seed): the same cloud for the same seed. */
function rng(seed: string): () => number {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
}

/** Scallop crown height for a unit: r − √(r² − (seg/2)²) with r = 0.62 · seg (+6% jitter headroom). */
export const bulgeOf = (unit: number): number => {
  const r = unit * 0.62 * 1.06;
  return Math.ceil(r - Math.sqrt(r * r - (unit / 2) ** 2));
};

/** The cloud's path for a w × h box (user units = CSS px). */
export function cloudPath(w: number, h: number, unit: number, seed = 'cloud'): string {
  const b = bulgeOf(unit);
  const rand = rng(seed);
  const x0 = b, y0 = b, x1 = Math.max(b + unit, w - b), y1 = Math.max(b + unit, h - b);
  const corners: [number, number][] = [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
  let d = `M${x0} ${y0}`;
  for (let s = 0; s < 4; s++) {
    const [ax, ay] = corners[s];
    const [bx, by] = corners[s + 1];
    const len = Math.hypot(bx - ax, by - ay);
    const n = Math.max(2, Math.round(len / unit));
    const seg = len / n;
    for (let i = 1; i <= n; i++) {
      const x = ax + ((bx - ax) * i) / n;
      const y = ay + ((by - ay) * i) / n;
      const r = seg * 0.62 * (1 + (rand() - 0.5) * 0.12);
      d += ` A${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
  }
  return `${d} Z`;
}

/** Scallop units: tighter on phones (§5.5: len / 22 below 768, len / 26 above). */
export const CLOUD_UNIT = { wide: 26, narrow: 22 } as const;
/** The static (no-JS) cloud's nominal boxes: the drawing's width at desktop / at a 390 phone, the empty cloud's height. */
export const CLOUD_NOMINAL = { wide: [560, 96], narrow: [358, 96] } as const;
