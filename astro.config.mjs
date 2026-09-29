// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import routeCss from './tools/route-css.mjs';

// P0 · Foundation. Fonts are self-hosted from fontsource files through the Astro Fonts API
// (local provider): hashed files, @font-face rules and metric-matched fallbacks (§2.1).
// WP7: the files are src/assets/fonts/*, subsets of those fontsource files to the characters the site renders
// (tools/subset-fonts.mjs; every glyph, feature and axis kept for them): 365 KB → 257 KB. tests/dist/fonts.test.ts
// fails when new copy brings a character a subset lacks — rerun the tool.
// There is no `prefetch` block: Speculation Rules in Base.astro replace it (§4.9).
export default defineConfig({
  site: 'https://www.saumya-verma.com',
  trailingSlash: 'never',
  build: { format: 'file' },
  // WP7: each case page ships only the case styles it can use (one stylesheet per page of a dynamic route, §7.2)
  integrations: [routeCss()],
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Newsreader',
      cssVariable: '--font-serif',
      // WP7: metric-matched fallbacks defined in base.css, one per platform family and measured per style (roman and
      // italic differ by 8–10%), instead of the single roman-derived Times face Astro generates — Android has no
      // Times New Roman, so its Noto Serif fell back unadjusted and her italic headlines/decks re-wrapped on swap (CLS)
      fallbacks: ['Newsreader Fallback', 'Newsreader Fallback Noto', 'Newsreader Fallback DejaVu', 'Georgia', 'serif'],
      optimizedFallbacks: false,
      options: {
        variants: [
          { src: ['./src/assets/fonts/newsreader-roman.woff2'], weight: '200 800', style: 'normal' },
          { src: ['./src/assets/fonts/newsreader-italic.woff2'], weight: '200 800', style: 'italic' },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'IBM Plex Sans',
      cssVariable: '--font-sans',
      // WP7: fallbacks matched to her condensed labels (base.css), Arial and Android's Roboto, instead of Astro's
      // normal-width Arial face (10 % too wide for wdth 85, and bold at 560: the home CTA row wrapped on the swap)
      fallbacks: ['IBM Plex Sans Fallback', 'IBM Plex Sans Fallback Roboto', 'Arial', 'sans-serif'],
      optimizedFallbacks: false,
      options: {
        variants: [
          { src: ['./src/assets/fonts/plex-sans.woff2'], weight: '100 700', style: 'normal' },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'IBM Plex Mono',
      cssVariable: '--font-mono',
      fallbacks: ['ui-monospace', 'monospace'],
      options: {
        variants: [
          { src: ['./src/assets/fonts/plex-mono-400.woff2'], weight: '400', style: 'normal' },
          { src: ['./src/assets/fonts/plex-mono-500.woff2'], weight: '500', style: 'normal' },
        ],
      },
    },
  ],
});
