/**
 * board.ts · WP6. How each of her five Play items is pinned (SPEC §5.4). Presentation only: her titles, tags, links,
 * stages (`tone`) and media come from site.ts `play.items`, in her order.
 *
 *   box     the stage's aspect (w / h): the two phone videos stand in 3:4 stages, ExpressLanes in 1:1, Orbit at its
 *           backdrop's native 1.915, Educademy at its own 0.96 (it carries its stage in its pixels)
 *   rot     the pin's rotation at rest (≥ 1024px only; 0° below): −0.6°, +0.4°, −0.3°, +0.5°, −0.4°
 *   device  the phone videos: the device is sized BY HEIGHT (a share of the stage) and centred on the stage
 *   scale   ExpressLanes only — the documented integrity exception (§6.4 #2): her 3840 × 3984 JPG is contained in its
 *           1:1 stage and scaled 1.2×, which clips only the uniform #f2f2f2 margin around the laptop (see LAPTOP_BBOX)
 *   layers  Orbit: her backdrop at its native aspect (fills the stage exactly) + her laptop contained with 6% padding,
 *           layered as on her original card
 */
export type PinKind = 'device' | 'scaled' | 'layered' | 'natural';
export interface PinConf {
  key: 'conversense' | 'expresslanes' | 'teachable' | 'orbit' | 'educademy';
  kind: PinKind;
  box: number;
  rot: number;
  /** device height as a share of the stage height (device kind) */
  device?: number;
  scale?: number;
  /** laptop padding in % (layered kind) */
  pad?: number;
}

export const PINS: Record<string, PinConf> = {
  'GHjG21Lo2f64p4k0y3obKTFGgck.mp4': { key: 'conversense', kind: 'device', box: 3 / 4, rot: -0.6, device: 0.84 },
  'sgdIeQ2FYc9vdl8NcEV3RS8g.jpg': { key: 'expresslanes', kind: 'scaled', box: 1, rot: 0.4, scale: 1.2 },
  '6GwunOSeX0YVHJspIvJG7W3Q.mp4': { key: 'teachable', kind: 'device', box: 3 / 4, rot: -0.3, device: 0.84 },
  'T8tenCXKluVSCNxnIJ2yBvycmw.jpg': { key: 'orbit', kind: 'layered', box: 3849 / 2010, rot: 0.5, pad: 6 },
  'bDbWbcvql01Q5iZy5tdbwCEUt0.jpg': { key: 'educademy', kind: 'natural', box: 3840 / 3984, rot: -0.4 },
};

/**
 * The laptop's bounding box inside `sgdIeQ2FYc9vdl8NcEV3RS8g.jpg`, measured from the file (every pixel that differs from
 * its uniform #f2f2f2 canvas by more than 6/255): x 337–3502, y 1020–2958 of 3840 × 3984.
 */
export const LAPTOP_BBOX = { w: 3840, h: 3984, x0: 337, x1: 3502, y0: 1020, y1: 2958 };

/**
 * Where the laptop lands in the stage (0–1 on both axes) when the image is contained in a `box`-aspect stage and scaled
 * by `scale` about the centre. Every edge must stay inside [0, 1]: then no laptop pixel is clipped.
 */
export function scaledBBox(scale: number, box = 1, bb = LAPTOP_BBOX): { l: number; r: number; t: number; b: number } {
  const a = bb.w / bb.h;
  // contained: height-limited when the image is narrower than the box
  const [iw, ih] = a < box ? [a / box, 1] : [1, box / a];
  const x0 = (1 - iw) / 2;
  const y0 = (1 - ih) / 2;
  const f = (v: number) => 0.5 + scale * (v - 0.5);
  return {
    l: f(x0 + iw * (bb.x0 / bb.w)),
    r: f(x0 + iw * ((bb.x1 + 1) / bb.w)),
    t: f(y0 + ih * (bb.y0 / bb.h)),
    b: f(y0 + ih * ((bb.y1 + 1) / bb.h)),
  };
}

/** The Teachable-AI video's frame geometry (matches the media system's `bezel-dark`: a ring 3.6% of the device's width). */
export const BEZEL = { ring: 3.6, radius: 12 };
/** outer aspect (w / h) of a device whose screen is w × h inside a ring of `ring`% of the device's width */
export function deviceAspect(w: number, h: number, ring = 0): number {
  const p = ring / 100;
  return 1 / ((1 - 2 * p) * (h / w) + 2 * p);
}
