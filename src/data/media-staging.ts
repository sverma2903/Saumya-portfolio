/**
 * media-staging.ts · P0 creates → WP4b owns. Every per-file staging decision (SPEC §6.4).
 * Values from research/media-audit.md; engineers verify visually and adjust ±0.5%.
 * No entry here may alter a pixel: frames, clips (only the five baked phone GIFs), caps, scales, strips.
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
  bleed?: 'right';
  /** mobile pan-strip height in px (< 768; cR6Uph on desktop too) */
  strip?: number;
  zoom?: 'deep' | 'soft';
  wide?: boolean;
  gif?: { secs: number; frames: number; poster: number };
  video?: { secs: number; audio?: boolean; remote?: boolean };
  compare?: { under: string; dy: string; start: number };
}

export const staging: Record<string, Staging> = {
  // ── browser frame (chrome-less desktop captures) ──
  'xVY62d93p5rA2uqmmKmIQwjR8I.gif': { frame: 'browser', gif: { secs: 27.7, frames: 346, poster: 150 } },
  '0JYHrpqh8iEliclxggLD75ZEjk0.gif': { frame: 'browser', gif: { secs: 34.4, frames: 430, poster: 190 } },
  'aOQ6T1UV764GiQaZId5sGFokWHg.gif': { frame: 'browser', gif: { secs: 18.2, frames: 227, poster: 100 } },
  '0lWQvXlWN92Ca4YkYqStcDEKY.gif': { frame: 'browser', gif: { secs: 17.5, frames: 219, poster: 100 } },
  'lR8M0Y29rJGG4GIE3nmmHsmo08.jpg': { frame: 'browser', zoom: 'deep', compare: { under: 'iaZFTmw1LjJ6sFQCiaDCjYl5wOU.jpg', dy: '-1.15%', start: 42 } },
  'kDWwW64PagR7INZeCK4xW3Duw.mp4': { frame: 'browser', video: { secs: 30.82 } },
  'TJ24G62X9MOl407PtXBovxgoWw.mp4': { frame: 'browser', video: { secs: 27.7 } },
  'Eh8LAs7UnxnzOIQPRHsvnBUH3c.mp4': { frame: 'browser', video: { secs: 24.12 } },
  'HuYD94DXbwjbqrO9Wx52NbnYB6Y.mp4': { frame: 'browser', video: { secs: 24.13 } },
  // ── flat mobile screens → CSS phone bezel (no island) ──
  'rwBl3lDOsRL93A0emJbOPZscQ.png': { frame: 'phone' }, 'Ygiz9GXYTtHfJxyhFo3ZtxiiAg.png': { frame: 'phone' },
  'DwwVAuH70SeP3rU3yJ1Jvvrjs.png': { frame: 'phone' }, '1ABh6bvuchQUxfEwZb89Hmczo.png': { frame: 'phone' },
  'ntXxUvW8m9u6iB0N2FmGNDzdvM.png': { frame: 'phone' }, 'u1hDJy6Xh9RZgsvceD9IqolVn8w.png': { frame: 'phone' },
  // ── phones baked on white: clip to silhouette. inset(T R B L); radius % of width; vertical radius = r × (w/h) ──
  'fvgOb7paqb8aI3RLh9ZvVpZoU8.gif': { frame: 'phone-baked', phone: true, clip: '0.5% 4.1% 0.9% 2.8%', radius: 13, gif: { secs: 11.0, frames: 110, poster: 60 } },
  'sXzdMl4SEFeL4sF51iLLjSHVoDo.gif': { frame: 'phone-baked', phone: true, clip: '0.5% 6.5% 1.1% 7.7%', radius: 13, gif: { secs: 4.0, frames: 40, poster: 24 } },
  'LDyuw9DTp9W6eRcAL624pBSTJHU.gif': { frame: 'phone-baked', phone: true, clip: '0.3% 3% 0.4% 4.7%', radius: 13, gif: { secs: 6.5, frames: 65, poster: 40 } },
  'so2bh2Z1W0CGtqzMd31ce39P24g.gif': { frame: 'phone-baked', phone: true, clip: '0.7% 9.8% 1.1% 9.8%', radius: 14, gif: { secs: 11.1, frames: 111, poster: 55 } },
  'n8B6UjNXYmQuUj8qsFbQGT75Vdo.gif': { frame: 'phone-baked', phone: true, clip: '0.5% 3.2% 1.6% 3.2%', radius: 14, gif: { secs: 6.0, frames: 60, poster: 30 } },
  // ── videos ──
  'GHjG21Lo2f64p4k0y3obKTFGgck.mp4': { frame: 'phone-video', video: { secs: 6.32 } },
  '6GwunOSeX0YVHJspIvJG7W3Q.mp4': { frame: 'bezel-dark', video: { secs: 47.8, audio: true, remote: true } },
  // ── CSBS before/after GIF (own stage) ──
  'hc5LSNViBiB98sAACx272BNZYw.gif': { gif: { secs: 10.0, frames: 68, poster: 45 } },
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
  'lmyeINAE6IwVaP6vGOdUrlN18s.jpg': { cap: 440 }, 'MSXXSFArimIHXfSG04aBaXtykFs.png': { cap: 260 },
  '34zvVOLJJnfshfSOljrVF0VDwg.jpg': { cap: 240 }, 'Sdi9fpuOtTfiQvOQArynv2SXDg.jpg': { cap: 240 }, 'YzCRzNFsLxivDz0SfvWzny8I8Hc.jpg': { cap: 240 },
  'X0xZsaG4ay0wrDS9K0KhSUHDc.jpg': { cap: 360 }, 'csEDEwbynLWgcVEg3KKy0deu5gE.jpg': { cap: 360 },
  'fcOBmTs2rsYyBZvOIwHLaP0.png': { cap: 112 }, '93xfJ7BYpODYoVdbmzvCfqCKwWA.png': { cap: 112 },
  'fNS3SmfyKO1BF1WehuZiIZcBEM.png': { cap: 112 }, 'bKGU2Gfm4HfJMtDQ9Z2iZnBE.png': { cap: 112 },
  // ── layout exceptions ──
  'BXlkhlt8LeADLUGEYUTiZB2xs54.jpg': { bleed: 'right', cap: 560 },        // laptop is cropped at its right edge BY DESIGN
  'pIpSTafpDbOaomutvkKp5sbo0.png': { frame: 'before', zoom: 'deep' },     // legacy InCEP login
  '0NxDsXYd3Emz4a15bzaYYrGgqpc.jpg': { frame: 'before', zoom: 'deep' },   // old NMLS Resource Center (her caption says so)
  // ── mobile pan strips (px height on < 768; cR6Uph also on desktop) ──
  'WgCbjKzHjiwauZbYEdrJmoKdl7Q.jpg': { strip: 220, zoom: 'deep', wide: true }, 'sudZxkOuimVHarWvtdxTiwKIfoc.jpg': { strip: 220, zoom: 'deep', wide: true },
  'gwd84tZNvsOf3CHmMADJctg6nA.jpg': { strip: 220, zoom: 'deep', wide: true }, 'HidTdRa7ANxckQkjLgegX1Htik.jpg': { strip: 220, zoom: 'deep', wide: true },
  '5mrUEYppyJ1F9lFDkEXqgOJ09w.jpg': { strip: 160, wide: true }, 'D8Mj6D7IrAziCVyRCrNil9l4lE.jpg': { strip: 180, wide: true },
  'cR6UphDJYrl5KBsgJPeOYdQRZ08.jpg': { strip: 250, wide: true },          // 13.4:1 filmstrip: native 250px height everywhere
  'j4fkcHZSxtz9sKarh0MRGWViPhA.png': { strip: 180, wide: true }, 'iBMHn5qPmspfDuv8fP6vt7VFVHQ.png': { strip: 160, wide: true },
  'RlPGi8dBexCCwbkfYyJqLig.jpg': { strip: 260, zoom: 'deep' }, 'VfuaSVxcN4BBEWYNZc33ZU6vds.jpg': { strip: 240, zoom: 'deep' },
  'vpdmEyGdI8ImCPy5Q0EiBG0q4.jpg': { strip: 260, zoom: 'deep' }, 'q6ExA1YGniMFZ8vEpgzUa8GhHf4.jpg': { strip: 260, zoom: 'deep' },
  'Bzurjtq26LcmgkGSyO6oOLiI6UM.jpg': { strip: 220, zoom: 'deep' }, 'gvC62bM3UB1KKcNucYCZzDbuS88.jpg': { strip: 220, zoom: 'deep' },
  // ── deep-zoom showpieces (1:1 emphasised in Enlarged detail) ──
  'OQ6wkHxSOe6HSg8SF4QCNbNs2Mw.jpg': { zoom: 'deep' }, 'mqbJCfCVxU805J6WaLwVnheGJw.webp': { zoom: 'deep' },
  'cey9L4IrjUQGf2l6HVXyuOEHDC8.jpg': { zoom: 'deep' }, 'gxh5qD2sWWaKpuY3yqtN0bPLGnk.jpg': { zoom: 'deep' },
  'iIUYidJuBXIurReX7guC3J0j5Ag.png': { zoom: 'deep' }, 'rtKR2XPIOtLs0SnLfWllCyBO0.jpg': { zoom: 'deep' },
  'EnflUwK2tHqWS9f8tbvihmxNiCI.png': { zoom: 'deep' }, 'f4jVXJVhm4E8To2iuCZB37BCA.jpg': { zoom: 'deep' },
  'oOEAJ5v9rudf7Fy0AmwE5gQ4vWo.jpg': { zoom: 'deep' }, 'vrlXDHVMFZ6k5HGO4OudcarBBOc.jpg': { zoom: 'deep' },
  'jaucYG0tkRPP0Yxyiy98VGTfEB8.jpg': { zoom: 'deep' }, 'iaZFTmw1LjJ6sFQCiaDCjYl5wOU.jpg': { zoom: 'deep' },
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
};
