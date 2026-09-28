/**
 * media-staging.ts · P0 creates → WP4b owns. Every per-file staging decision (SPEC §6.4).
 * Values from research/media-audit.md, then verified by WP4b against the files themselves (frame by frame for the GIFs).
 * No entry here may alter a pixel: frames, clips (only the five baked phone GIFs), caps, scales, strips.
 *
 * WP4b verification notes (2026-09-28):
 *  - GIF posters are the frame shown while a GIF is paused or under reduced motion, so each is a COMPLETE,
 *    representative state (never half-typed text, never mid-transition), checked by eye on contact sheets:
 *      xVY62d 330  the Integrations graph with the Queue connected (the workflow's outcome; 150 was a dropdown mid-pick)
 *      0JYHrp 190  the Create Account API Token form, name typed in full
 *      aOQ6T1 135  "Delete bucket-123?" — empty + delete in a single action (100 was a hover)
 *      0lWQvX 210  the Mission Assignment form after Upload to Auto-Fill (100 was the empty form)
 *      fvgOb7 108  "Oh, I got you!" with the extracted keywords (60 was the typing prompt)
 *      sXzdMl  24  the constellation, "Theres 50 people in the area…"
 *      LDyuw9  60  the time-boxed chat with B-153 (40 was "Connecting…")
 *      so2bh2  55  the Student dashboard
 *      n8B6Uj  56  the assignment's status: Checked (30 was mid-slide)
 *      hc5LSN  50  the 3.4 s "After" hold (frame 45 still reads "Afte": frames 17 and 50 are the two holds)
 *  - Baked phones: `clip` (inset T R B L) is the device's bounding box and stays the documented fallback. `outline` is the
 *    device SILHOUETTE: the union of every frame's non-canvas pixels (|Δ| > 8 from the canvas colour, specks < 3 px
 *    dropped), traced row by row and simplified to ≤ 1 native px (Douglas–Peucker), in % of the canvas. A rectangle
 *    either leaves white slivers beside the rim between the side buttons or cuts the buttons off; the silhouette keeps
 *    every device pixel (buttons included) and removes only the white canvas (§6.4 integrity exception 1).
 *  - The W4 section cut pair (lR8M0Y final / iaZFTm wireframe) was measured on its rules: every card and table edge of
 *    the wireframe sits 6 px LEFT of the final's (so dx +6), and its rows sit 20–48 px LOWER (its vertical rhythm is
 *    looser: cards +48, charts +36…48, table +20…32). dy −34 balances the residual to ±14 native px (±4 CSS px at the
 *    wide column); the spec's −1.15 % of width (−40 px) left −20 px on the table rows.
 */
export type Frame = 'plate' | 'bare' | 'soft' | 'browser' | 'phone' | 'phone-baked' | 'phone-video' | 'bezel-dark' | 'print' | 'before';

export interface Staging {
  frame?: Frame;
  /** clip-path inset(T R B L), only for the five baked phone GIFs */
  clip?: string;
  /** corner radius as % of width (vertical radius = r × w/h) */
  radius?: number;
  /** a phone screen/device (sized by height, eligible for WalkthroughPhone) */
  phone?: boolean;
  /** max CSS px width (crispness at 2×) */
  cap?: number;
  /** optical-weight normalisation inside icon wells */
  scale?: number;
  /** split rows: the file is cropped at this edge BY DESIGN, so it sits flush against that edge of the wide area,
      matted on the other three sides (the crop reads as the sheet's edge, not as a framing mistake) */
  bleed?: 'right' | 'left';
  /** mobile pan-strip height in px (< 768; cR6Uph on desktop too) */
  strip?: number;
  /** the strip is used at every width, at the file's native height (a filmstrip wider than any column) */
  stripAll?: boolean;
  /** deep: 1:1 emphasised in Enlarged detail · soft: enlargeable, never sold as legible at 1:1 · none: a logo, not a figure to enlarge */
  zoom?: 'deep' | 'soft' | 'none';
  /** baked phones: the device silhouette as CSS polygon() points, in % of the canvas (see the header) */
  outline?: string;
  /** a device cropped out of a white canvas that is NOT a baked phone GIF: a clip-path removing only the canvas corners
      around the device (§6.4 exception 1). U-Up's MSXXSF is the top of a phone on white: its rounded top corners
      (a ≈ 36 native px radius, fitted to its edge rows) sit on 26 px of white; the phone runs out of the bottom edge, so only the top is clipped. */
  corners?: string;
  wide?: boolean;
  gif?: { secs: number; frames: number; poster: number };
  video?: { secs: number; audio?: boolean; remote?: boolean };
  /** SM6a section cut: the aligned file beneath; dx/dy = its offset in its own native px (measured, see the header) */
  compare?: { under: string; dx: number; dy: number; start: number };
}

/** Device silhouettes of the five baked phones (see the header). */
const O_fvgOb7 = '76.46% 0.4%, 83.04% 0.66%, 87.34% 1.45%, 89.62% 2.5%, 90.13% 2.5%, 91.14% 3.03%, 91.14% 3.29%, 92.41% 3.82%, 94.43% 5.93%, 95.19% 8.04%, 94.94% 8.43%, 95.44% 10.8%, 95.44% 31.49%, 95.95% 31.62%, 95.95% 43.35%, 95.44% 43.35%, 95.44% 88.67%, 94.94% 91.04%, 95.19% 91.44%, 93.92% 94.33%, 92.41% 95.39%, 92.41% 95.65%, 89.87% 97.1%, 89.37% 97.1%, 88.86% 97.5%, 88.35% 97.5%, 88.1% 97.76%, 85.82% 98.42%, 83.29% 98.81%, 78.48% 99.08%, 20.25% 99.08%, 15.19% 98.81%, 12.66% 98.42%, 10.38% 97.76%, 10.13% 97.5%, 9.62% 97.5%, 8.86% 96.97%, 8.35% 96.97%, 6.08% 95.65%, 4.3% 93.94%, 3.29% 91.44%, 3.29% 45.98%, 2.78% 45.98%, 2.53% 45.72%, 2.53% 38.6%, 2.78% 38.34%, 3.29% 38.34%, 3.29% 36.5%, 2.53% 36.36%, 2.53% 29.12%, 2.78% 28.85%, 3.29% 28.85%, 3.29% 25.69%, 2.53% 25.43%, 2.53% 21.08%, 2.78% 20.82%, 3.29% 20.82%, 3.29% 8.17%, 4.3% 5.53%, 5.57% 4.22%, 7.34% 3.29%, 7.34% 3.03%, 11.65% 1.32%, 15.44% 0.66%, 22.03% 0.4%';
const O_sXzdMl = '73.89% 0.39%, 79.95% 0.53%, 82.52% 0.79%, 85.08% 1.32%, 85.31% 1.58%, 86.95% 1.97%, 87.65% 2.5%, 88.11% 2.5%, 90.91% 4.47%, 92.07% 5.92%, 92.77% 8.03%, 92.54% 8.42%, 93.01% 11.18%, 92.77% 31.45%, 93.47% 31.58%, 93.47% 43.29%, 93.01% 43.29%, 93.01% 88.16%, 92.54% 90.92%, 92.77% 91.32%, 91.84% 93.82%, 90.21% 95.53%, 88.11% 96.84%, 87.65% 96.84%, 86.95% 97.37%, 86.48% 97.37%, 86.25% 97.63%, 84.15% 98.29%, 81.82% 98.68%, 77.16% 98.95%, 23.78% 98.95%, 18.18% 98.55%, 13.99% 97.37%, 11.66% 96.18%, 11.66% 95.92%, 10.26% 95.13%, 9.09% 93.82%, 8.39% 92.24%, 8.16% 45.92%, 7.69% 45.92%, 7.46% 45.66%, 7.69% 38.29%, 8.16% 38.29%, 8.16% 36.45%, 7.69% 36.45%, 7.46% 36.18%, 7.69% 28.82%, 8.16% 28.82%, 8.16% 25.66%, 7.46% 25.39%, 7.46% 24.87%, 7.69% 20.92%, 8.16% 20.79%, 8.16% 8.16%, 9.09% 5.53%, 10.96% 3.68%, 11.89% 3.29%, 11.89% 3.03%, 12.35% 3.03%, 12.59% 2.63%, 13.05% 2.63%, 14.69% 1.71%, 19.35% 0.66%, 27.04% 0.39%';
const O_LDyuw9 = '81.08% 0.27%, 83.95% 0.45%, 86.49% 0.81%, 88.34% 1.25%, 88.51% 1.43%, 89.86% 1.79%, 90.2% 2.06%, 90.54% 2.06%, 92.91% 3.31%, 92.91% 3.49%, 93.41% 3.67%, 93.58% 4.03%, 94.26% 4.39%, 95.44% 5.82%, 96.11% 7.88%, 95.95% 8.24%, 96.28% 9.04%, 96.28% 31.51%, 96.96% 31.69%, 96.96% 43.33%, 96.28% 43.51%, 96.28% 90.78%, 95.95% 91.58%, 95.95% 92.75%, 94.93% 94.72%, 94.59% 94.81%, 94.59% 95.08%, 94.09% 95.34%, 93.58% 95.97%, 91.05% 97.49%, 90.71% 97.49%, 90.03% 97.94%, 89.7% 97.94%, 89.53% 98.12%, 87.16% 98.84%, 83.45% 99.37%, 79.39% 99.55%, 22.13% 99.55%, 18.07% 99.37%, 15.37% 99.02%, 12.84% 98.39%, 11.32% 97.67%, 10.98% 97.67%, 9.8% 96.96%, 9.46% 96.96%, 9.46% 96.78%, 8.61% 96.42%, 8.61% 96.24%, 8.11% 96.06%, 7.94% 95.7%, 7.26% 95.34%, 6.08% 93.82%, 5.41% 91.5%, 5.24% 89.44%, 5.24% 46.02%, 4.73% 45.93%, 4.73% 38.59%, 4.9% 38.41%, 5.24% 38.41%, 5.24% 36.53%, 4.73% 36.44%, 4.73% 29.01%, 5.24% 28.92%, 5.24% 25.6%, 4.73% 25.43%, 4.73% 20.95%, 5.24% 20.77%, 5.41% 8.33%, 6.25% 5.64%, 7.09% 4.83%, 7.09% 4.57%, 7.43% 4.48%, 7.6% 4.12%, 8.11% 3.94%, 8.45% 3.49%, 9.29% 3.13%, 9.29% 2.95%, 11.49% 1.88%, 11.82% 1.88%, 13.01% 1.34%, 14.7% 0.9%, 15.71% 0.81%, 16.05% 0.63%, 20.61% 0.27%';
const O_so2bh2 = '79.38% 0.74%, 83.33% 1.61%, 85.21% 2.61%, 85.62% 2.61%, 86.04% 3.1%, 86.67% 3.23%, 86.88% 3.72%, 87.29% 3.72%, 87.5% 4.22%, 87.92% 4.22%, 88.54% 5.46%, 88.96% 5.46%, 89.58% 7.07%, 89.79% 32.26%, 90.21% 32.26%, 90.42% 32.63%, 90.42% 44.17%, 89.79% 44.29%, 89.79% 90.45%, 89.17% 93.67%, 88.54% 94.04%, 88.75% 94.29%, 88.33% 94.42%, 88.33% 94.79%, 87.92% 94.91%, 86.67% 96.28%, 86.25% 96.28%, 85.42% 97.02%, 84.38% 97.27%, 84.38% 97.52%, 81.88% 98.14%, 81.25% 98.51%, 77.5% 98.88%, 22.5% 98.88%, 19.38% 98.64%, 16.04% 97.77%, 12.29% 95.53%, 11.46% 94.67%, 11.46% 94.29%, 10.83% 93.92%, 10.42% 92.93%, 10% 89.33%, 9.79% 19.85%, 10.21% 7.57%, 10.83% 5.58%, 11.46% 5.21%, 11.46% 4.84%, 12.08% 4.09%, 12.92% 3.72%, 12.92% 3.47%, 15.83% 1.86%, 17.92% 1.36%, 18.12% 1.12%, 20.42% 0.74%';
const O_n8B6Uj = '84.22% 0.5%, 88.83% 1.36%, 90.29% 2.1%, 91.5% 2.35%, 91.99% 2.85%, 92.72% 2.97%, 92.96% 3.47%, 94.17% 4.08%, 94.9% 5.2%, 95.63% 5.69%, 96.36% 8.66%, 96.36% 31.93%, 97.09% 32.05%, 97.09% 43.81%, 96.36% 43.94%, 96.36% 90.1%, 95.63% 93.07%, 94.9% 93.56%, 94.66% 94.31%, 92.96% 95.3%, 92.96% 95.54%, 88.83% 97.4%, 85.44% 98.14%, 82.04% 98.39%, 17.72% 98.39%, 14.32% 98.14%, 12.86% 97.9%, 12.14% 97.52%, 10.92% 97.4%, 9.47% 96.66%, 8.98% 96.66%, 5.83% 94.93%, 5.1% 93.81%, 4.37% 93.44%, 3.88% 92.45%, 3.4% 88.86%, 3.16% 19.55%, 3.64% 7.3%, 4.37% 5.32%, 5.1% 4.95%, 5.1% 4.58%, 5.83% 3.84%, 6.8% 3.47%, 6.8% 3.22%, 10.92% 1.36%, 12.14% 1.24%, 12.86% 0.87%, 15.78% 0.5%';

export const staging: Record<string, Staging> = {
  // ── browser frame (chrome-less desktop captures) ──
  'xVY62d93p5rA2uqmmKmIQwjR8I.gif': { frame: 'browser', gif: { secs: 27.7, frames: 346, poster: 330 } },
  '0JYHrpqh8iEliclxggLD75ZEjk0.gif': { frame: 'browser', gif: { secs: 34.4, frames: 430, poster: 190 } },
  'aOQ6T1UV764GiQaZId5sGFokWHg.gif': { frame: 'browser', gif: { secs: 18.2, frames: 227, poster: 135 } },
  '0lWQvXlWN92Ca4YkYqStcDEKY.gif': { frame: 'browser', gif: { secs: 17.5, frames: 219, poster: 210 } },
  'lR8M0Y29rJGG4GIE3nmmHsmo08.jpg': { frame: 'browser', zoom: 'deep', compare: { under: 'iaZFTmw1LjJ6sFQCiaDCjYl5wOU.jpg', dx: 6, dy: -34, start: 42 } },
  'kDWwW64PagR7INZeCK4xW3Duw.mp4': { frame: 'browser', video: { secs: 30.82 } },
  'TJ24G62X9MOl407PtXBovxgoWw.mp4': { frame: 'browser', video: { secs: 27.7 } },
  'Eh8LAs7UnxnzOIQPRHsvnBUH3c.mp4': { frame: 'browser', video: { secs: 24.12 } },
  'HuYD94DXbwjbqrO9Wx52NbnYB6Y.mp4': { frame: 'browser', video: { secs: 24.13 } },
  // ── flat mobile screens → CSS phone bezel (no island) ──
  'rwBl3lDOsRL93A0emJbOPZscQ.png': { frame: 'phone' }, 'Ygiz9GXYTtHfJxyhFo3ZtxiiAg.png': { frame: 'phone' },
  'DwwVAuH70SeP3rU3yJ1Jvvrjs.png': { frame: 'phone' }, '1ABh6bvuchQUxfEwZb89Hmczo.png': { frame: 'phone' },
  'ntXxUvW8m9u6iB0N2FmGNDzdvM.png': { frame: 'phone' }, 'u1hDJy6Xh9RZgsvceD9IqolVn8w.png': { frame: 'phone' },
  // ── phones baked on white: clip to silhouette. inset(T R B L); radius % of width; vertical radius = r × (w/h) ──
  'fvgOb7paqb8aI3RLh9ZvVpZoU8.gif': { frame: 'phone-baked', phone: true, clip: '0.5% 4.1% 0.9% 2.8%', radius: 13, outline: O_fvgOb7, gif: { secs: 11.0, frames: 110, poster: 108 } },
  'sXzdMl4SEFeL4sF51iLLjSHVoDo.gif': { frame: 'phone-baked', phone: true, clip: '0.5% 6.5% 1.1% 7.7%', radius: 13, outline: O_sXzdMl, gif: { secs: 4.0, frames: 40, poster: 24 } },
  'LDyuw9DTp9W6eRcAL624pBSTJHU.gif': { frame: 'phone-baked', phone: true, clip: '0.3% 3% 0.4% 4.7%', radius: 13, outline: O_LDyuw9, gif: { secs: 6.5, frames: 65, poster: 60 } },
  'so2bh2Z1W0CGtqzMd31ce39P24g.gif': { frame: 'phone-baked', phone: true, clip: '0.7% 9.8% 1.1% 9.8%', radius: 14, outline: O_so2bh2, gif: { secs: 11.1, frames: 111, poster: 55 } },
  'n8B6UjNXYmQuUj8qsFbQGT75Vdo.gif': { frame: 'phone-baked', phone: true, clip: '0.5% 3.2% 1.6% 3.2%', radius: 14, outline: O_n8B6Uj, gif: { secs: 6.0, frames: 60, poster: 56 } },
  // ── videos ──
  'GHjG21Lo2f64p4k0y3obKTFGgck.mp4': { frame: 'phone-video', video: { secs: 6.32 } },
  '6GwunOSeX0YVHJspIvJG7W3Q.mp4': { frame: 'bezel-dark', video: { secs: 47.8, audio: true, remote: true } },
  // ── CSBS before/after GIF (own stage) ──
  'hc5LSNViBiB98sAACx272BNZYw.gif': { gif: { secs: 10.0, frames: 68, poster: 50 } },
  // ── optical-weight normalisation for icon wells ──
  'Fn2fGJ6uoe9bJooiMcmTo9gBck.jpg': { scale: 1.0 }, 'PfY4jWqw2rBGvI6q8LxIjCKQw.jpg': { scale: 1.1 },
  'HmFCeblpCm7SzpCgHFrf8Yjfg.jpg': { scale: 1.5 }, 'ySz4SWCgEuPuPs3PvYY04HQJVYU.jpg': { scale: 1.3 },
  'YSEkGtGxXygwk0F5c8YGSb72qc.jpg': { scale: 1.05 }, 'WiZEDsRPJVHkrObAdvvQ0TEah5E.jpg': { scale: 1.0 },
  'A31flALfbLhpLOnxkzSZKXz0nI.png': { scale: 1.15 }, 'yAi9JKE3Kkwcii4bwToozGaif7g.png': { scale: 1.0 }, 'hOh9LthZaJQtoDxfOFGNMN1Eac.png': { scale: 1.2 },
  // ── resolution caps (CSS px, for crispness at 2×) ──
  'IVrPyYYRJLjhPvlS4eSOwn52NaE.png': { cap: 128 },
  'yN6VtOwfgmxIVENvwQ1f7rb1pjM.png': { cap: 104 }, 'UV3USwlcgfzLNdnhdzpm5TqHvY.png': { cap: 104 },
  'MX3JSFGhhYN0HuZIDQpvCxO9SE.png': { cap: 104 }, 'FYlsVfQKHJebVVMGXXTrLPHQIwA.png': { cap: 104 },
  'J6I2NiR9ye7w6gvEWTAMG2hyYE.png': { cap: 112 }, 'Lfx4fx1nVaPrC9PoybLb4czBTHk.png': { cap: 112 }, '5yrgUfYpOPfqAvnKyb5YKyM5JA.png': { cap: 112 },
  '0YXilKZrJeZZKGqmbNs6IBwZ5o.png': { cap: 112 }, '53tjgJAqz0DezHRBvFLbdol8Cs.png': { cap: 112 }, 'ZnTpkzWDIzl1k12ZZLvo1l6cQRE.png': { cap: 112 },
  'B4i82MXuCijqdjx0mPV84ZzTM8M.jpg': { cap: 200 }, 'uEhkOCukMrK1gyMJTTyB3rNCTYA.png': { cap: 240 },
  'Ba0xoRNtdEJFDv0wUIc2Gb1aMo.jpg': { cap: 420 }, 'kwWf2Uhq8nsR3xcQ2etNd26L5iI.png': { cap: 420 }, 'IOkPZ3gG1rQACi2A5gntj0ODzVs.jpg': { cap: 420 },
  'a9Ks6XtxlvRgtDf1JChl7LQakk.png': { cap: 520 }, 'GSYkrkshJsH7cULPBcUm93qbcM.png': { cap: 520 },
  'lmyeINAE6IwVaP6vGOdUrlN18s.jpg': { cap: 440 }, 'MSXXSFArimIHXfSG04aBaXtykFs.png': { cap: 260, corners: 'inset(3.13% 0 0 0 round 8.3% 8.3% 0 0 / 4.3% 4.3% 0 0)' },
  '34zvVOLJJnfshfSOljrVF0VDwg.jpg': { cap: 240 }, 'Sdi9fpuOtTfiQvOQArynv2SXDg.jpg': { cap: 240 }, 'YzCRzNFsLxivDz0SfvWzny8I8Hc.jpg': { cap: 240 },
  'X0xZsaG4ay0wrDS9K0KhSUHDc.jpg': { cap: 360 }, 'csEDEwbynLWgcVEg3KKy0deu5gE.jpg': { cap: 360 },
  'fcOBmTs2rsYyBZvOIwHLaP0.png': { cap: 112 }, '93xfJ7BYpODYoVdbmzvCfqCKwWA.png': { cap: 112 },
  'fNS3SmfyKO1BF1WehuZiIZcBEM.png': { cap: 112 }, 'bKGU2Gfm4HfJMtDQ9Z2iZnBE.png': { cap: 112 },
  // ── a logo that her Orbit page shows as a small mark above the title (≈ 100 px wide); not an enlargeable figure ──
  'UHWtZDl7VBaFhCnX2PHWVnA.webp': { cap: 200, zoom: 'none' },
  // ── layout exceptions ──
  'BXlkhlt8LeADLUGEYUTiZB2xs54.jpg': { bleed: 'right', cap: 560 },        // laptop is cropped at its right edge BY DESIGN
  'cytCJG0dDu98YnBOtMXYOqHYTo.jpg': { bleed: 'left' },                     // …and this one at its LEFT edge (CSBS 02, flipped row)
  // ── logo material composed on white: a `soft` ground (pure white) so the white canvas vanishes, as on her site ──
  'cVgfb0s0hG7fYwQ76o8ctXWHqe8.png': { frame: 'soft', cap: 520 },          // PFF competitor logos: a half-column sheet on her page
  // ── text-bearing artefacts that need the wide area to stay legible (each checked against her page, which showed
  //    them at 430–840 px; the text column would give them 200–330 px). vrlXDH/jaucYG/gvC62b are below with their zoom.
  //    Tall ones (the U-Up flow, Orbit's journey map, Educademy's comparison table) stay in the measure: widened they
  //    would outgrow the viewport; they are deep-zoom figures instead. ──
  'ah6Xf97OKA9xBM9n64Z5qtdWmQg.jpg': { wide: true }, 'yLHVdvapLHy1NeiXIk5N40FOF8.jpg': { wide: true }, // CF persona cards
  'DrPQJPmSFy5hqs5Q33Xlj71rEI.jpg': { wide: true }, 'qJAYarE3qicN2WRsYUtomwBoo.jpg': { wide: true },   // PFF wireframes
  'EgnqSR6ad98l2JnHCdSrBFjxc.jpg': { wide: true },
  'IjZYvkNkj0rsZjAE1UAFgcJGI.png': { wide: true }, 'GPyEID7TRoGnv0r6CsAwJ9Sj4J4.jpg': { wide: true },  // CSBS ServiceNow captures
  'pIpSTafpDbOaomutvkKp5sbo0.png': { frame: 'before', zoom: 'deep' },     // legacy InCEP login
  '0NxDsXYd3Emz4a15bzaYYrGgqpc.jpg': { frame: 'before', zoom: 'deep' },   // old NMLS Resource Center (her caption says so)
  // ── mobile pan strips (px height on < 768; cR6Uph also on desktop) ──
  'WgCbjKzHjiwauZbYEdrJmoKdl7Q.jpg': { strip: 220, zoom: 'deep', wide: true }, 'sudZxkOuimVHarWvtdxTiwKIfoc.jpg': { strip: 220, zoom: 'deep', wide: true },
  'gwd84tZNvsOf3CHmMADJctg6nA.jpg': { strip: 220, zoom: 'deep', wide: true }, 'HidTdRa7ANxckQkjLgegX1Htik.jpg': { strip: 220, zoom: 'deep', wide: true },
  '5mrUEYppyJ1F9lFDkEXqgOJ09w.jpg': { strip: 160, wide: true }, 'D8Mj6D7IrAziCVyRCrNil9l4lE.jpg': { strip: 180, wide: true },
  'cR6UphDJYrl5KBsgJPeOYdQRZ08.jpg': { strip: 250, stripAll: true, wide: true },          // 13.4:1 filmstrip: native 250px height everywhere
  'j4fkcHZSxtz9sKarh0MRGWViPhA.png': { strip: 180, wide: true }, 'iBMHn5qPmspfDuv8fP6vt7VFVHQ.png': { strip: 160, wide: true },
  'RlPGi8dBexCCwbkfYyJqLig.jpg': { strip: 260, zoom: 'deep' }, 'VfuaSVxcN4BBEWYNZc33ZU6vds.jpg': { strip: 240, zoom: 'deep' },
  'vpdmEyGdI8ImCPy5Q0EiBG0q4.jpg': { strip: 260, zoom: 'deep' }, 'q6ExA1YGniMFZ8vEpgzUa8GhHf4.jpg': { strip: 260, zoom: 'deep' },
  'Bzurjtq26LcmgkGSyO6oOLiI6UM.jpg': { strip: 220, zoom: 'deep' }, 'gvC62bM3UB1KKcNucYCZzDbuS88.jpg': { strip: 220, zoom: 'deep', wide: true },
  // ── deep-zoom showpieces (1:1 emphasised in Enlarged detail) ──
  'OQ6wkHxSOe6HSg8SF4QCNbNs2Mw.jpg': { zoom: 'deep' }, 'mqbJCfCVxU805J6WaLwVnheGJw.webp': { zoom: 'deep' },
  'cey9L4IrjUQGf2l6HVXyuOEHDC8.jpg': { zoom: 'deep' }, 'gxh5qD2sWWaKpuY3yqtN0bPLGnk.jpg': { zoom: 'deep' },
  'iIUYidJuBXIurReX7guC3J0j5Ag.png': { zoom: 'deep' }, 'rtKR2XPIOtLs0SnLfWllCyBO0.jpg': { zoom: 'deep' },
  'EnflUwK2tHqWS9f8tbvihmxNiCI.png': { zoom: 'deep' }, 'f4jVXJVhm4E8To2iuCZB37BCA.jpg': { zoom: 'deep' },
  'oOEAJ5v9rudf7Fy0AmwE5gQ4vWo.jpg': { zoom: 'deep' }, 'vrlXDHVMFZ6k5HGO4OudcarBBOc.jpg': { zoom: 'deep', wide: true },
  'jaucYG0tkRPP0Yxyiy98VGTfEB8.jpg': { zoom: 'deep', wide: true }, 'iaZFTmw1LjJ6sFQCiaDCjYl5wOU.jpg': { zoom: 'deep' },
  'EDfAP8bTFuMCt3cCBqfGA9T7SP4.jpg': { zoom: 'deep' }, '0OYkKGPTRRJtg5W9kzasPOReEE.png': { zoom: 'deep' },
  // ── soft text: enlargeable, but never advertise 1:1 legibility ──
  'SrmoZmiKYD7LbLbnidvIN3hP9k.jpg': { zoom: 'soft' }, 'XedUWebLXaneTDTZAFNkGdIWp84.jpg': { zoom: 'soft' },
  // ── photographs → print frame ──
  ...Object.fromEntries(['0DgrhSrnYqbmgZKu3PnA8Rrtvw.jpeg','acRAcPK51NoLJ8LHSqgrpjj2Wg.jpeg','pIDtD36Hpq3doMGXAW2oSsLaNgE.jpeg','NfKXubAUMyPGvUNfxwNhQaPIR7c.png',
    'DGP887lSg3BslXC1WqoKLaW5uuQ.jpeg','UmkbMjWKivVXxVMFaytrWezqXkQ.jpeg','n96Sk7QIJq1r0JSEj6iQOepFc.jpeg','qdrBaCdP4ouf5D5dpXXBsJvU.jpeg',
    'GGfB63Xb1Z3iy0joEYLuy88Vidk.jpeg','EyGahOxuLSHOmD4RyV8aJ2KZpd8.jpeg','pJuumr2TDq9UOLw5zUyt7TWnUt0.jpeg','BAigcUUzXxmsWomL9aYKv5s0U.jpeg',
    'nncmf0aDfyRTtrUu16t50q7ETQ.jpeg','7GOICdzY8dHcrCEUh9Jumltudy8.jpeg','c7QUHWI535d2YRhYeWXvT1TpMkE.jpeg','SsgOhVsFHWXh4MzwkXVXNQXbfd4.jpeg',
    'ls0doisVOwAu8WetYy3tBIQrjw.jpeg','utuWOArvvGix4UPlu2q0C9H0f8.jpeg','xT4pwHFrqO08imbqkUc9DgudRbs.jpg','T0bMsC4OSOYoj6l06oeeSXZRpKA.jpeg',
    'L2rNvBTpjcL8sFrG805usBfPg.png','AsmhYZ4yHfi7hGF0yfEI44gXUY.png','nEWiq0mcXzcoXwQIWAaNrTXvA4.png','tmypcLaZrlWiXDWV5IsQHRdIIs0.png',
  ].map((f) => [f, { frame: 'print' as Frame }])),
  // the four Orbit concept sketches: one row across the wide area, as on her page (≈ 250 px each, not 158 px)
  ...Object.fromEntries(['L2rNvBTpjcL8sFrG805usBfPg.png', 'AsmhYZ4yHfi7hGF0yfEI44gXUY.png', 'nEWiq0mcXzcoXwQIWAaNrTXvA4.png', 'tmypcLaZrlWiXDWV5IsQHRdIIs0.png']
    .map((f) => [f, { frame: 'print' as Frame, wide: true }])),
};
