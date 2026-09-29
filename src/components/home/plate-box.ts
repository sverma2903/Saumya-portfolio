/**
 * plate-box · OWNER: WP3. The exact box of a contained layer inside a staged cover plate (aspect A, `pad`% stage
 * margin), in % of the plate. The Viewport plate and the card plate both place her layers with it, so each is the
 * same box, stage and per-layer padding as the case header's cover (the SM3 morph lands without a jump).
 */
export function layerBox(aspect: number, A: number, pad: number) {
  const inner = 100 - 2 * pad;
  if (aspect >= A) {
    const h = (inner * A) / aspect;
    return { l: pad, t: (100 - h) / 2, w: inner, h };
  }
  const w = (inner * aspect) / A;
  return { l: (100 - w) / 2, t: pad, w, h: inner };
}
const r4 = (n: number) => Math.round(n * 1e4) / 1e4;
/** `left/top/inline-size/block-size` for an absolutely placed layer */
export const boxStyle = (b: ReturnType<typeof layerBox>) =>
  `left: ${r4(b.l)}%; top: ${r4(b.t)}%; inline-size: ${r4(b.w)}%; block-size: ${r4(b.h)}%`;
