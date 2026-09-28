import { describe, expect, test } from 'vitest';
import { cases } from '@/content/site';
import { decodeEntities, formatElevation, roundHalfEven, sentences, slugify, splitStat, stripHtml, strongs, words } from '@/lib/text';

describe('stripHtml', () => {
  test('br → space, tags removed without space, entities decoded, whitespace collapsed', () => {
    expect(stripHtml('Self-walkthrough<br>Hypothesis Map')).toBe('Self-walkthrough Hypothesis Map');
    expect(stripHtml('That made me curious.<strong> If I')).toBe('That made me curious. If I');
    expect(stripHtml('<strong>R2&#39;s</strong>  dashboard &amp; &gt; 13 PB')).toBe("R2's dashboard & > 13 PB");
    expect(stripHtml('  a  b​ ')).toBe('a b');
    expect(stripHtml(undefined)).toBe('');
  });
  test('decodeEntities keeps unknown entities untouched', () => {
    expect(decodeEntities('&foo; &amp; &#x2192;')).toBe('&foo; & →');
  });
});

describe('sentences', () => {
  test('splits after . ! ? before an opening character', () => {
    expect(sentences('One. Two! “Three” (four)? 5 is five. ~6 min.')).toEqual(['One.', 'Two!', '“Three” (four)?', '5 is five.', '~6 min.']);
  });
  test('does not split inside "U.S. territories" style abbreviations followed by lower case', () => {
    expect(sentences('from all 50 states and U.S. territories.')).toHaveLength(1);
  });
});

describe('strongs / words / slugify', () => {
  test('strongs returns inner HTML in order', () => {
    expect(strongs('a <strong>b</strong> c <strong>d <em>e</em></strong>')).toEqual(['b', 'd <em>e</em>']);
  });
  test('words counts runs of non-space characters', () => {
    expect(words(' a  b\nc ')).toBe(3);
    expect(words('')).toBe(0);
  });
  test('slugify', () => {
    expect(slugify('Competitive Analysis')).toBe('competitive-analysis');
    expect(slugify('External Configuration (S3 API token connections)')).toBe('external-configuration-s3-api-token-connections');
    expect(slugify('Discoverability &amp; Clarity')).toBe('discoverability-clarity');
    expect(slugify("Understand small company user's experiences")).toBe('understand-small-company-users-experiences');
  });
});

describe('splitStat: every stat value round-trips (typographic split only)', () => {
  const values = cases.flatMap((cs) => cs.sections.flatMap((s) => s.blocks.flatMap((b) => (b.t === 'stats' ? b.items.map((i) => i.v) : []))));
  test('there are 24 stat values', () => expect(values).toHaveLength(24));
  test.each(values)('%s', (v) => {
    const sp = splitStat(v);
    const decoded = decodeEntities(v);
    if (v === 'High AI adoption') expect(sp).toBeNull();
    else {
      expect(sp).not.toBeNull();
      expect(sp!.pre + sp!.num + sp!.rest).toBe(decoded);
    }
  });
  test('parts', () => {
    expect(splitStat('~60%')).toEqual({ pre: '~', num: '60%', rest: '' });
    expect(splitStat('&gt; 13 PB of user data')).toEqual({ pre: '> ', num: '13 PB', rest: ' of user data' });
    expect(splitStat('~ 600 K')).toEqual({ pre: '~ ', num: '600 K', rest: '' });
  });
});

describe('formatting', () => {
  test('elevations', () => {
    expect(formatElevation(0, true)).toBe('±00:00');
    expect(formatElevation(36)).toBe('+00:36');
    expect(formatElevation(438)).toBe('+07:18');
  });
  test('roundHalfEven matches Python round()', () => {
    expect([0.5, 1.5, 2.5, 36.08, 36.5, 37.5].map(roundHalfEven)).toEqual([0, 2, 2, 36, 36, 38]);
  });
});
