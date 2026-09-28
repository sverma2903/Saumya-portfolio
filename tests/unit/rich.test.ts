import { describe, expect, test } from 'vitest';
import { about } from '@/content/site';
import { externalAttrs, isExternal, NEWTAB_ID, rich } from '@/lib/rich';
import { stripHtml } from '@/lib/text';

describe('rich()', () => {
  test('adds only attributes to external links; the text is byte-identical', () => {
    const src = about.loves.writing.published;
    const out = rich(src);
    expect(stripHtml(out)).toBe(stripHtml(src));
    expect(out.replace(/<[^>]*>/g, '')).toBe(src.replace(/<[^>]*>/g, ''));
    expect(out).toContain(`target="_blank" rel="noopener" aria-describedby="${NEWTAB_ID}"`);
    expect((out.match(/target="_blank"/g) ?? []).length).toBe(2);
  });
  test('leaves internal and in-page links alone', () => {
    const s = 'a <a href="/orbit">b</a> <a href="#highlights">c</a> <a href="https://www.saumya-verma.com/about">d</a>';
    expect(rich(s)).toBe(s);
  });
  test('isExternal / externalAttrs', () => {
    expect(isExternal('https://medium.com/x')).toBe(true);
    expect(isExternal('/about')).toBe(false);
    expect(isExternal('mailto:a@b.c')).toBe(false);
    expect(externalAttrs('/about')).toEqual({});
    expect(externalAttrs('https://x.y')).toMatchObject({ target: '_blank', rel: 'noopener' });
  });
  test('no-op on text without links', () => {
    const s = 'plain <strong>bold</strong> &amp; more';
    expect(rich(s)).toBe(s);
  });
});
