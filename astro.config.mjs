// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

// P0 · Foundation. Fonts are self-hosted from fontsource files through the Astro Fonts API
// (local provider): hashed files, @font-face rules and metric-matched fallbacks (§2.1).
// There is no `prefetch` block: Speculation Rules in Base.astro replace it (§4.9).
export default defineConfig({
  site: 'https://www.saumya-verma.com',
  trailingSlash: 'never',
  build: { format: 'file' },
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Newsreader',
      cssVariable: '--font-serif',
      fallbacks: ['Georgia', 'serif'],
      options: {
        variants: [
          { src: ['@fontsource-variable/newsreader/files/newsreader-latin-opsz-normal.woff2'], weight: '200 800', style: 'normal' },
          { src: ['@fontsource-variable/newsreader/files/newsreader-latin-opsz-italic.woff2'], weight: '200 800', style: 'italic' },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'IBM Plex Sans',
      cssVariable: '--font-sans',
      fallbacks: ['Arial', 'sans-serif'],
      options: {
        variants: [
          { src: ['@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wdth-normal.woff2'], weight: '100 700', style: 'normal' },
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
          { src: ['@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2'], weight: '400', style: 'normal' },
          { src: ['@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2'], weight: '500', style: 'normal' },
        ],
      },
    },
  ],
});
