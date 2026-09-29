/**
 * typeset.ts · WP5. Presentation-only typesetting for HER words: never changes, adds or removes a character.
 * Every function returns escaped HTML whose textContent is identical to its input (the verbatim guard compares it).
 *
 * keepCompounds(text) — every hyphenated compound ("e-learning", "COVID-era") sits in a `<span class="nobr">`
 *   (white-space: nowrap), so a display title never breaks at its hyphen ("Simplifying e- / learning").
 * keepItems(text) — each item of a comma-separated list ("1 PM, 3 Designers, 1 UX Researcher") sits in a
 *   `<span class="keep">` (display: inline-block), with its comma. An inline-block is atomic on its line: the list
 *   breaks only between items ("1 PM, 3 Designers, / 1 UX Researcher", never "…, 1 / UX Researcher"), and an item too
 *   long for the line still wraps inside itself, so nothing can overflow. The separating spaces stay outside the spans.
 * keepPhrases(text, phrases) — keepCompounds, plus each listed phrase (an exact substring: a noun phrase of a display
 *   title, "Object Storage") in a `<span class="keep">` (display: inline-block), so the title breaks between its
 *   phrases, never inside one ("Cloudflare R2 / Object Storage / Redesign", not "R2 Object / Storage"). Like keepItems,
 *   a phrase too long for the line still wraps inside itself. A phrase that is not in the text is ignored.
 */
import { escapeHtml } from './text';

export function keepCompounds(text: string): string {
  return text
    .split(/(\S+-\S+)/)
    .map((part, i) => (i % 2 === 1 ? `<span class="nobr">${escapeHtml(part)}</span>` : escapeHtml(part)))
    .join('');
}

export function keepItems(text: string): string {
  // split after each comma, keeping the comma with its item and the whitespace between items as a separate part
  return text
    .split(/(?<=,)(\s+)/)
    .map((part, i) => (i % 2 === 1 || !part ? escapeHtml(part) : `<span class="keep">${escapeHtml(part)}</span>`))
    .join('');
}

export function keepPhrases(text: string, phrases: readonly string[]): string {
  const found = phrases.filter((p) => p && text.includes(p));
  if (!found.length) return keepCompounds(text);
  const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${found.map(esc).join('|')})`);
  return text
    .split(re)
    .map((part, i) => (i % 2 === 1 ? `<span class="keep">${keepCompounds(part)}</span>` : keepCompounds(part)))
    .join('');
}
