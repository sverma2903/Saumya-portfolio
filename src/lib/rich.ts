/**
 * rich.ts · P0. The ONE post-process applied to her HTML before `set:html` (SPEC §6.1).
 *
 * It only ADDS ATTRIBUTES to external <a> tags: target="_blank" rel="noopener" and
 * aria-describedby="sv-newtab" (a hidden "opens in a new tab" element rendered once by Base.astro).
 * It never touches text nodes, never adds, removes or reorders characters of her text.
 *
 * Deviation from the spec text (documented in P0-NOTES): the spec suggested appending a
 * `<span class="sr-only"> (opens in a new tab)</span>` INSIDE the link. That inserts words into the
 * middle of her sentence in the DOM (e.g. About › "published at Rethinking the Future and Novatr"),
 * which breaks find-in-page, text-fragment citations (§4.4) and the independent fidelity checker.
 * aria-describedby gives screen readers the same hint without altering her text.
 */

export const NEWTAB_ID = 'sv-newtab';

const SITE_HOSTS = new Set(['www.saumya-verma.com', 'saumya-verma.com']);

/** true for absolute http(s) links that leave the site. */
export function isExternal(href: string | undefined | null): boolean {
  if (!href) return false;
  if (!/^https?:\/\//i.test(href)) return false;
  try {
    return !SITE_HOSTS.has(new URL(href).hostname);
  } catch {
    return true;
  }
}

/** Attributes for any external link we render ourselves (CTAs, chrome). Spread onto <a>. */
export function externalAttrs(href: string): Record<string, string> {
  return isExternal(href) ? { target: '_blank', rel: 'noopener', 'aria-describedby': NEWTAB_ID } : {};
}

/** Post-process her HTML string. Only opening <a …> tags are rewritten; everything else is byte-identical. */
export function rich(html: string | undefined | null): string {
  if (!html) return '';
  return html.replace(/<a\b([^>]*)>/gi, (tag, attrs: string) => {
    const hrefMatch = /\shref\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs);
    const href = hrefMatch ? (hrefMatch[2] ?? hrefMatch[3] ?? '') : '';
    if (!isExternal(href)) return tag;
    let extra = '';
    if (!/\starget\s*=/i.test(attrs)) extra += ' target="_blank"';
    if (!/\srel\s*=/i.test(attrs)) extra += ' rel="noopener"';
    if (!/\saria-describedby\s*=/i.test(attrs)) extra += ` aria-describedby="${NEWTAB_ID}"`;
    return `<a${attrs}${extra}>`;
  });
}
