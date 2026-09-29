/**
 * hold.ts · WP4b. While the Enlarged detail is open the page behind it is inert and covered: every page GIF/video
 * manager (gif.ts, video.ts, the walkthrough stage, the Highlights player) stands down, so the detail's own copy of the
 * file is the only large one decoding (the ≤ 2 large rule, and memory). Released on close; each manager then re-decides
 * from its own state (visibility, Motion, the reader's choices are all kept).
 */
type Cb = (held: boolean) => void;
const cbs = new Set<Cb>();
let held = false;

export const isHeld = (): boolean => held;

export function onHold(cb: Cb): void { cbs.add(cb); }

export function setHold(on: boolean): void {
  if (on === held) return;
  held = on;
  for (const cb of cbs) cb(on);
}
