/** Types for chapter-heights.json (tools/chapter-heights.mjs): slug → chapter id → { xl, l, m, s, pxl, pl, pm, ps } px. */
declare const heights: Record<string, Record<string, Record<string, number>> | string>;
export default heights;
