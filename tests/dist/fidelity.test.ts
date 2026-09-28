/**
 * Port of the independent fidelity checker (scratchpad/fidelity.py): every text string of her ORIGINAL Framer site
 * (tests/fixtures/original-site.json) must appear verbatim in the built page text; chapter markers must appear.
 * Normalisation mirrors fidelity.py: every tag → space, so typographic splits INSIDE a word (e.g. "~" | "60%") or chrome
 * text injected between her words will fail here. P0 → WP7.
 */
import { beforeAll, describe, expect, test } from 'vitest';
import fixture from '../fixtures/original-site.json';
import { distExists, fidelityText, load } from './helpers';
import type { PageKey } from '@/lib/verbatim';

type Fx = { pages: Record<string, { strings: string[]; chapters: string[]; media: string[]; ignored: string[] }> };
const pages = (fixture as Fx).pages;

beforeAll(() => {
  if (!distExists()) throw new Error('dist/ is missing — run `npm run build` first.');
});

/** Media of the original site that the new set does not reference, each with its reason. Anything else is a bug. */
const KNOWN_UNREFERENCED: Record<string, string> = {
  'WKmuyMvjduOuoF05gjcNfzXln2E.png': 'LinkedIn icon → text link in the end sheet',
  'ur8o0yFJsLgAIUCuBKNHru1N4.png': 'mail icon → text link in the end sheet',
  'GhlckHHGZtYCWRi9keJEdPMrnI.png': 'PFF flat-gradient backdrop → identical CSS gradient (SPEC §6.4 exception 5, owner note §8.9)',
  'J2cpNxdkMPJ3EZmGxbCpvSfe6E.png': 'PFF home-card composite = NfispiNG… on GhlckHHG…; superseded by the 16:10 cover plate (flag for WP3/owner)',
  'CQBzyCCtXm6Sxa1H7rjdmW35A4.webp': 'Cloudflare home-card logo — not placed by the spec (flag for WP3/owner)',
  'LLwKJhf5XlV3SWhOs3xldIRQFA.png': 'PFF home-card logo — not placed by the spec (flag for WP3/owner)',
  'o8ini5inZ7izIUkXDxD6Ryd890E.png': 'CSBS home-card logo — not placed by the spec (flag for WP3/owner)',
  'z9qKmfXnKpQ01CHNuHDM1KgY6aE.png': 'CMU home-card logo — not placed by the spec (flag for WP3/owner)',
};

describe.each(Object.keys(pages))('%s', (page) => {
  test('every original string is present verbatim', () => {
    const text = fidelityText(load(page as PageKey).raw);
    const missing = pages[page].strings.filter((t) => {
      if (text.includes(t)) return false;
      const chunks = t.split(/(?<=[.!?:])\s+/).map((c) => c.trim()).filter((c) => c.length > 3);
      return !(chunks.length && chunks.every((c) => text.includes(c)));
    });
    expect(missing).toEqual([]);
  });
  test('every original chapter marker is present', () => {
    const text = fidelityText(load(page as PageKey).raw).toLowerCase();
    for (const c of pages[page].chapters) expect(text, c).toContain(c.toLowerCase());
  });
});

test('original media: only the documented exceptions are unreferenced', () => {
  const used = new Set<string>();
  for (const page of Object.keys(pages)) {
    const raw = load(page as PageKey).raw;
    for (const m of raw.matchAll(/\/media\/([A-Za-z0-9_-]+\.[a-z0-9]+)/g)) used.add(m[1]);
    for (const m of raw.matchAll(/framerusercontent\.com\/assets\/([A-Za-z0-9_-]+\.[a-z0-9]+)/g)) used.add(m[1]);
  }
  const orig = new Set(Object.values(pages).flatMap((p) => p.media));
  const unused = [...orig].filter((f) => !used.has(f)).sort();
  expect(unused).toEqual(Object.keys(KNOWN_UNREFERENCED).sort());
});
