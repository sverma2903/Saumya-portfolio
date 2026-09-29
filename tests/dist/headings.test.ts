/**
 * Headings on the built pages (SPEC §7.1 1.3.1 / 2.4.6, §8.5 · WP7).
 *  · exactly one h1 per page, inside <main>;
 *  · inside <main> no heading skips a level on the way down (h2 → h4 is a skip; going back up is always fine), in DOM
 *    order — which is also the reading order (§7.1 1.3.2), in Section and in Plan markup alike;
 *  · no empty heading (a closed <dialog>'s heading is filled when it opens: the Enlarged detail's figure number);
 *  · case pages: every one of her section labels is an h2 (the chapter's section mark), in her order.
 */
import { beforeAll, describe, expect, test } from 'vitest';
import type { HTMLElement } from 'node-html-parser';
import { cases } from '@/content/site';
import { stripHtml } from '@/lib/text';
import { distExists, load, PAGES } from './helpers';

beforeAll(() => {
  if (!distExists()) throw new Error('dist/ is missing — run `npm run build` first.');
});

const level = (h: HTMLElement) => Number(h.tagName.slice(1));
const nameOf = (h: HTMLElement) => (h.getAttribute('aria-label') ?? stripHtml(h.innerHTML)).trim();

describe.each(PAGES)('%s', (page) => {
  test('one h1, and it is inside main', () => {
    const { root } = load(page);
    const h1s = root.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0].closest('main')).toBeTruthy();
  });

  test('no skipped heading level inside main', () => {
    const { root } = load(page);
    const hs = root.querySelector('main')!.querySelectorAll('h1, h2, h3, h4, h5, h6');
    expect(hs.length).toBeGreaterThan(0);
    const skips: string[] = [];
    let prev = 1;
    for (const h of hs) {
      const l = level(h);
      if (l > prev + 1) skips.push(`h${prev} → h${l} "${nameOf(h).slice(0, 60)}"`);
      prev = l;
    }
    expect(skips).toEqual([]);
  });

  test('no empty heading', () => {
    const { root } = load(page);
    const empty = root.querySelectorAll('h1, h2, h3, h4, h5, h6').filter((h) => !nameOf(h) && !h.closest('dialog'));
    expect(empty.map((h) => h.outerHTML.slice(0, 120))).toEqual([]);
  });
});

describe('case chapters', () => {
  test.each(cases.map((c) => [c.slug, c] as const))('%s: her section labels are the chapter h2s, in order', (slug, cs) => {
    const { root } = load(slug as never);
    const h2 = root.querySelectorAll('main h2').map((h) => h.id);
    const want = cs.sections.map((s) => `${s.id}-h`);
    expect(h2.filter((id) => want.includes(id))).toEqual(want);
    for (const s of cs.sections) expect(stripHtml(root.getElementById(`${s.id}-h`)!.innerHTML)).toContain(stripHtml(s.label));
  });
});
