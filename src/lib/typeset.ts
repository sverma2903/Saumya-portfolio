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
