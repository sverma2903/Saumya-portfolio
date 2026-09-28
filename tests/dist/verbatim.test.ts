/**
 * The verbatim guard on the BUILT pages (SPEC §8.5). P0 skeleton → WP7 owns.
 *  (a) No alteration: every [data-v] element, with [data-chrome] descendants removed (no separator), is a substring
 *      of ONE corpus string for that page. Skim joiners ([data-chrome][data-join]) split it into pieces that must all
 *      occur, in order, in that same corpus string.
 *  (b) No omission: every corpus string required for the page is a substring of some [data-v] element (Section markup).
 *  (c) No added emphasis: no <strong>/<b>/<mark> inside [data-v] unless present in her source HTML.
 */
import { beforeAll, describe, expect, test } from 'vitest';
import { emphasisTexts, pageAllowed, pageRequired } from '@/lib/verbatim';
import { stripHtml } from '@/lib/text';
import { distExists, inOrder, load, PAGES, verbatimText } from './helpers';

beforeAll(() => {
  if (!distExists()) throw new Error('dist/ is missing — run `npm run build` first (npm run check does both).');
});

const emphasis = emphasisTexts();

describe.each(PAGES)('%s', (page) => {
  test('(a) no alteration: every [data-v] text is a substring of one corpus string', () => {
    const { root } = load(page);
    const allowed = pageAllowed(page).map((e) => e.text);
    const bad: string[] = [];
    const els = root.querySelectorAll('[data-v]');
    expect(els.length).toBeGreaterThan(0);
    for (const el of els) {
      const pieces = verbatimText(el, true);
      if (pieces.length && !allowed.some((a) => inOrder(a, pieces))) bad.push(pieces.join(' ⋯ '));
    }
    expect(bad, `altered or foreign text inside [data-v]:\n${bad.join('\n')}`).toEqual([]);
  });

  test('(b) no omission: every required string of hers is rendered inside [data-v]', () => {
    const { root } = load(page);
    const texts = root.querySelectorAll('[data-v]').flatMap((el) => verbatimText(el, false));
    const missing = pageRequired(page).filter((e) => !texts.some((t) => t.includes(e.text)));
    expect(missing.map((m) => `${m.field}: ${m.text.slice(0, 90)}`), 'omitted').toEqual([]);
  });

  test('(c) no added emphasis inside [data-v]', () => {
    const { root } = load(page);
    const bad: string[] = [];
    for (const el of root.querySelectorAll('[data-v]')) {
      const tags = [el, ...el.querySelectorAll('strong, b, mark')].filter((t) => ['STRONG', 'B', 'MARK'].includes(t.tagName));
      for (const t of tags) {
        if (t.closest('[data-chrome]')) continue;
        const txt = stripHtml(t.innerHTML);
        if (t.tagName === 'B') bad.push(`<b>${txt}</b>`);
        else if (t.tagName === 'STRONG' && !emphasis.strong.some((s) => s.includes(txt))) bad.push(`<strong>${txt}</strong>`);
        else if (t.tagName === 'MARK' && !emphasis.mark.some((s) => s.includes(txt))) bad.push(`<mark>${txt}</mark>`);
      }
    }
    expect(bad).toEqual([]);
  });
});
