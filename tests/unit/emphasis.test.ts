/**
 * emphasis.ts (polish r1): a verbatim selection carries her inline emphasis, and never a character more or less.
 */
import { describe, expect, test } from 'vitest';
import { selectionHtml, sliceHtml } from '@/lib/emphasis';
import { stripHtml } from '@/lib/text';

describe('sliceHtml', () => {
  test('keeps emphasis inside the slice', () => {
    expect(sliceHtml('They often <mark>rely heavily on the call center</mark> for support.', 'often rely heavily on the call center for support.'))
      .toBe('often <mark>rely heavily on the call center</mark> for support.');
  });
  test('re-opens and closes emphasis clipped at the edges', () => {
    expect(sliceHtml('<strong>Should it be a tab? Or inline?</strong> Then more.', 'Or inline? Then'))
      .toBe('<strong>Or inline?</strong> Then');
    expect(sliceHtml('A <em>b c d</em> e', 'A b')).toBe('A <em>b</em>');
  });
  test('drops links and spans but keeps their text; decodes entities; collapses whitespace', () => {
    expect(sliceHtml('Go <a href="x">to <strong>the</strong>  page</a> &amp; stay', 'to the page & stay'))
      .toBe('to <strong>the</strong> page &amp; stay');
    expect(sliceHtml('one<br>two', 'one two')).toBe('one two');
  });
  test('null when not a substring', () => {
    expect(sliceHtml('<strong>abc</strong>', 'abd')).toBeNull();
  });
  test('round-trips the plain text', () => {
    const raw = 'Built <strong>85+ reusable components,</strong> documented <em>patterns</em>, and a <mark>tokens</mark> file.';
    for (const plain of ['85+ reusable components, documented', 'components, documented patterns, and a tokens file.', 'Built 85+']) {
      expect(stripHtml(sliceHtml(raw, plain)!)).toBe(plain);
    }
  });
});

describe('selectionHtml', () => {
  test('finds the source string in the case corpus', () => {
    expect(selectionHtml('csbs', 'they often rely heavily on the call center for support.')).toContain('<mark>rely heavily on the call center</mark>');
  });
  test('falls back to escaped plain text', () => {
    expect(selectionHtml('csbs', 'not <her> words')).toBe('not &lt;her&gt; words');
  });
});
