/**
 * text.ts · P0. Pure string helpers shared by the build (lib/*), the tests and the search index.
 * Nothing here ever changes her words: these functions only *read* her HTML.
 *
 * Normalisation contract (used by every verbatim check in the project):
 *   stripHtml(html) = `<br>` → space, every other tag removed (no space inserted), entities decoded,
 *                     whitespace collapsed, trimmed.
 */

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', middot: '·', times: '×', rarr: '→', larr: '←', copy: '©',
};

/** Decode HTML entities (named subset used by the content + all numeric forms). */
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : m;
    }
    const v = NAMED[e.toLowerCase()];
    return v ?? m;
  });
}

/** Collapse all whitespace (incl. NBSP) to single spaces, drop zero-width spaces, trim. */
export function normalize(s: string): string {
  return s.replace(/​/g, '').replace(/[\s ]+/g, ' ').trim();
}

/** Her HTML → the normalised plain text every verbatim comparison uses. */
export function stripHtml(html: string | undefined | null): string {
  if (!html) return '';
  const noBr = html.replace(/<br\s*\/?>/gi, ' ');
  const noTags = noBr.replace(/<[^>]*>/g, '');
  return normalize(decodeEntities(noTags));
}

/** Escape text for safe insertion into HTML (used when we must build markup around her plain text). */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Word count used by the reading model: runs of non-space characters. */
export function words(s: string): number {
  const m = s.match(/\S+/g);
  return m ? m.length : 0;
}

/** Sentence splitter (SPEC §4.4 / SM5a): split after . ! ? when followed by space + an opening character. */
export const SENTENCE_RE = /(?<=[.!?])\s+(?=[A-Z“"‘(0-9~])/;
export function sentences(text: string): string[] {
  return text
    .trim()
    .split(SENTENCE_RE)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Inner HTML of every <strong>…</strong> in document order (her own bold). */
export function strongs(html: string | undefined | null): string[] {
  if (!html) return [];
  const out: string[] = [];
  const re = /<strong\b[^>]*>([\s\S]*?)<\/strong>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

/** Count of non-space characters in the stripped text (Plan view threshold: ≥ 3). */
export function nonSpaceLength(html: string): number {
  return stripHtml(html).replace(/\s+/g, '').length;
}

/** URL-safe slug for heading ids: `Competitive Analysis` → `competitive-analysis`. */
export function slugify(s: string): string {
  return stripHtml(s)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Stat value split (SPEC §6.2 stats). Typographic only: pre + num + rest === decoded value, always.
 * Returns null when the value is a word (e.g. "High AI adoption") → render in the word style.
 */
export const STAT_RE = /^(?<pre>[>~≈]\s?)?(?<num>\d[\d.,]*\s?(?:%|K|M|PB)?)(?<rest>.*)$/s;
export interface StatSplit { pre: string; num: string; rest: string }
export function splitStat(v: string): StatSplit | null {
  const text = decodeEntities(v);
  const m = STAT_RE.exec(text);
  if (!m || !m.groups) return null;
  return { pre: m.groups.pre ?? '', num: m.groups.num ?? '', rest: m.groups.rest ?? '' };
}

/** "+MM:SS" elevation (Overview is "±00:00"). */
export function formatElevation(sec: number, isFirst = false): string {
  if (isFirst) return '±00:00';
  const s = Math.max(0, Math.round(sec));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `+${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/** Python-compatible round-half-to-even (the SM4 table was computed with Python's round()). */
export function roundHalfEven(x: number): number {
  const r = Math.round(x);
  return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r;
}

/** Derived domain for external links (mono, chrome): https://issuu.com/... → issuu.com */
export function domainOf(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** Zero-padded two-digit number: 1 → "01". */
export const pad2 = (n: number) => String(n).padStart(2, '0');
