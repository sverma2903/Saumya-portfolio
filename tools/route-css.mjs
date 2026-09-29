/**
 * tools/route-css.mjs · WP7 (SPEC §7.2: CSS ≤ 28 KB gz on every page). An Astro integration, registered in
 * astro.config.mjs; it runs after `astro build` and never in dev.
 *
 * Astro emits one stylesheet per route component, so the six case pages (one route, src/pages/[slug].astro) all linked
 * the styles of every block any case renders: the Compare slider only /cloudflare uses, the CSBS timeline, the
 * Educademy tabs, blocks no case uses at all (15.9 KB gz, of which one case needs 11–12.6). After the build, every
 * stylesheet that only the pages of one dynamic route link is replaced, on each of those pages, by exactly the rules
 * that can match there, inlined as a <style> in the link's place:
 *  · a rule scoped to a component (its selector carries `[data-astro-cid-…]`) is kept when, for at least one selector
 *    in its list, every component that selector names renders on the page, i.e. its attribute is in the page's HTML
 *    (templates and noscript included; no script creates scoped elements, which tests/dist/css.test.ts checks); a
 *    scope inside a pseudo-class argument (:not(), :is(), :has() …) is never required;
 *  · every other rule (global rules, @font-face, @keyframes, @property, …) is kept;
 *  · @media / @supports / @container / @layer blocks keep their kept rules and are dropped when empty.
 * Kept rules are copied byte for byte and in order, into the same cascade position, so the cascade on each page is
 * exactly the one it had (computed styles of every element were compared before/after on all six cases, both themes,
 * both views, 390 and 1440: identical); the only difference is that rules which could never match are not shipped.
 * Inline, because a case's rules differ from the next case's: a file per page would be one more render-blocking
 * request on every case-to-case navigation, while the <style> travels inside the page, which Speculation Rules have
 * usually prefetched already (HTML ≈ 47 KB gz at most, within §7.2's 60). Before splitting, the parser must reproduce
 * the whole file from its own rule list (else the stylesheet is left untouched, with a warning); a stylesheet whose
 * text contains "</style" would be written as a hashed file instead. The original is deleted once nothing in the build
 * references it. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const CID = /data-astro-cid-([a-z0-9]+)/g;
/** at-rules whose block holds rules (pruned recursively); any other block at-rule is copied whole */
const GROUPING = new Set(['media', 'supports', 'container', 'layer', 'scope', 'starting-style', 'document', '-moz-document']);

/** index just past the string whose opening quote is at s[i] */
function endOfString(s, i) {
  for (let j = i + 1; j < s.length; j++) {
    if (s[j] === '\\') j++;
    else if (s[j] === s[i]) return j + 1;
  }
  return s.length;
}
/** index just past the comment, string or unquoted url(…) starting at s[i], or -1 when none starts there */
function skipToken(s, i) {
  const c = s[i];
  if (c === '"' || c === "'") return endOfString(s, i);
  if (c === '/' && s[i + 1] === '*') {
    const e = s.indexOf('*/', i + 2);
    return e < 0 ? s.length : e + 2;
  }
  if ((c === 'u' || c === 'U') && /^url\(\s*[^"'\s)]/i.test(s.slice(i, i + 64))) {
    const e = s.indexOf(')', i);
    return e < 0 ? s.length : e + 1;
  }
  return -1;
}
function matchingBrace(s, open) {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    const t = skipToken(s, i);
    if (t >= 0) { i = t - 1; continue; }
    if (s[i] === '\\') { i++; continue; }
    if (s[i] === '{') depth++;
    else if (s[i] === '}' && --depth === 0) return i;
  }
  throw new Error(`route-css: unbalanced "{" at ${open}`);
}
/** the top-level statements and blocks of s[from, to): { start, end, prelude, open, close } (open/close: brace indices) */
function nodes(s, from, to) {
  const out = [];
  let start = from;
  for (let i = from; i < to; i++) {
    const t = skipToken(s, i);
    if (t >= 0) { i = t - 1; continue; }
    const c = s[i];
    if (c === '\\') { i++; continue; }
    if (c === ';') {
      out.push({ start, end: i + 1, prelude: s.slice(start, i), open: -1, close: -1 });
      start = i + 1;
    } else if (c === '{') {
      const close = matchingBrace(s, i);
      out.push({ start, end: close + 1, prelude: s.slice(start, i), open: i, close });
      i = close;
      start = close + 1;
    } else if (c === '}') {
      throw new Error(`route-css: stray "}" at ${i}`);
    }
  }
  if (start < to) out.push({ start, end: to, prelude: s.slice(start, to), open: -1, close: -1 }); // trailing space/comments
  return out;
}
/** a selector list split at its top-level commas */
function selectors(list) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i++) {
    const t = skipToken(list, i);
    if (t >= 0) { i = t - 1; continue; }
    const c = list[i];
    if (c === '\\') i++;
    else if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === ',' && depth === 0) { out.push(list.slice(start, i)); start = i + 1; }
  }
  out.push(list.slice(start));
  return out;
}
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/** a selector without its parenthesised arguments (:not(…), :is(…), :has(…), :nth-child(… of …), …) */
function outsideParens(sel) {
  let out = '';
  let depth = 0;
  for (let i = 0; i < sel.length; i++) {
    const t = skipToken(sel, i);
    if (t >= 0) { if (!depth) out += sel.slice(i, t); i = t - 1; continue; }
    const c = sel[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (!depth) out += c;
  }
  return out;
}
/**
 * Can this style rule match on a page rendering the components `present`? (null: every rule.) A selector needs every
 * component named in its compounds; a scope inside a pseudo-class argument (:not(), :is(), :has() …) may be negated or
 * an alternative, so it is never required: such rules are kept, which can only keep too much, never too little.
 */
function canMatch(prelude, present) {
  if (!present) return true;
  return selectors(stripComments(prelude)).some((sel) => [...outsideParens(sel).matchAll(CID)].every((m) => present.has(m[1])));
}
/** s[from, to) keeping only what can match (present = null keeps everything, for the round-trip check) */
export function prune(s, present, from = 0, to = s.length) {
  let out = '';
  for (const n of nodes(s, from, to)) {
    if (n.open < 0) { out += s.slice(n.start, n.end); continue; }
    const head = stripComments(n.prelude).trim();
    if (head.startsWith('@')) {
      const name = /^@([\w-]+)/.exec(head)?.[1].toLowerCase() ?? '';
      if (GROUPING.has(name)) {
        const inner = prune(s, present, n.open + 1, n.close);
        if (!present || stripComments(inner).trim()) out += s.slice(n.start, n.open + 1) + inner + '}';
        continue;
      }
      out += s.slice(n.start, n.end);
      continue;
    }
    if (canMatch(n.prelude, present)) out += s.slice(n.start, n.end);
  }
  return out;
}
/** the components rendered on a page: every scope attribute in its HTML */
export const componentsIn = (html) => new Set([...html.matchAll(CID)].map((m) => m[1]));

const gz = (s) => zlib.gzipSync(s, { level: 9 }).length;
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const LINK = /<link\b[^>]*>/gi;
const attr = (tag, name) => new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag)?.slice(1).find((v) => v !== undefined);

/** root-relative stylesheet hrefs a page links */
function stylesheets(html) {
  return [...html.matchAll(LINK)]
    .map((m) => m[0])
    .filter((tag) => /(^|\s)stylesheet(\s|$)/i.test(attr(tag, 'rel') ?? ''))
    .map((tag) => attr(tag, 'href'))
    .filter((href) => href && href.startsWith('/') && !href.startsWith('//') && href.endsWith('.css'));
}

function walk(dir, exts, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, exts, out);
    else if (exts.test(e.name)) out.push(p);
  }
  return out;
}

/** @returns {import('astro').AstroIntegration} */
export default function routeCss() {
  let base = '/';
  return {
    name: 'sv:route-css',
    hooks: {
      'astro:config:done': ({ config }) => { base = config.base.endsWith('/') ? config.base : `${config.base}/`; },
      'astro:build:done': ({ dir, assets, logger }) => {
        const root = fileURLToPath(dir);
        const fileOf = (href) => path.join(root, decodeURIComponent(href.slice(base.length - 1)));
        const htmlFiles = walk(root, /\.html$/i);
        const html = new Map(htmlFiles.map((f) => [f, fs.readFileSync(f, 'utf8')]));
        const linkedBy = new Map(); // href → pages
        for (const [f, h] of html) for (const href of stylesheets(h)) linkedBy.set(href, [...(linkedBy.get(href) ?? []), f]);

        // pages grouped by the dynamic route that generated them
        const groups = [...assets.values()]
          .map((urls) => urls.map((u) => fileURLToPath(u)).filter((f) => html.has(f)))
          .filter((files) => files.length > 1);

        const rewrites = new Map(); // page → [[href, the tag that replaces its <link>]]
        const retired = new Set();
        for (const group of groups) {
          const inGroup = new Set(group);
          for (const [href, pages] of linkedBy) {
            if (!pages.every((p) => inGroup.has(p))) continue; // shared with another route: left as built
            const file = fileOf(href);
            if (!fs.existsSync(file)) continue;
            const css = fs.readFileSync(file, 'utf8');
            let variants;
            try {
              if (prune(css, null) !== css) throw new Error('the parsed rules do not reproduce the file');
              variants = pages.map((p) => [p, prune(css, componentsIn(html.get(p)))]);
            } catch (e) {
              logger.warn(`${path.basename(file)} left whole: ${e.message}`);
              continue;
            }
            if (variants.every(([, v]) => v === css)) continue;
            const stem = path.basename(file).replace(/\.[^.]+\.css$/, '').replace(/\.css$/, '');
            const sizes = [];
            for (const [p, v] of variants) {
              const page = path.relative(root, p).replace(/\.html$/i, '').replace(/[\\/]/g, '-');
              if (!/<\/style/i.test(v)) {
                // inline, in the link's place (same cascade position): no request, and it travels with the prefetched page
                rewrites.set(p, [...(rewrites.get(p) ?? []), [href, `<style data-route-css>${v}</style>`]]);
              } else {
                const hash = crypto.createHash('sha256').update(v).digest('base64url').replace(/[-_]/g, '').slice(0, 8);
                const name = `${stem}-${page}.${hash}.css`;
                fs.writeFileSync(path.join(path.dirname(file), name), v);
                rewrites.set(p, [...(rewrites.get(p) ?? []), [href, `<link rel="stylesheet" href="${href.slice(0, href.lastIndexOf('/') + 1) + name}">`]]);
              }
              sizes.push(`${page} ${kb(gz(v))}`);
            }
            retired.add(file);
            logger.info(`${path.basename(file)} (${kb(gz(css))} gz) → each page's own rules, inline: ${sizes.join(', ')}`);
          }
        }

        for (const [p, pairs] of rewrites) {
          let h = html.get(p);
          for (const [from, to] of pairs) h = h.replace(LINK, (tag) => (attr(tag, 'href') === from ? to : tag));
          fs.writeFileSync(p, h);
          html.set(p, h);
        }
        // delete a split stylesheet once no built file mentions it (JS preload maps, headers, other pages)
        if (retired.size) {
          const texts = walk(root, /\.(html|js|mjs|css|json|txt|xml|webmanifest)$|^_headers$|^_redirects$/i).map((f) => fs.readFileSync(f, 'utf8'));
          for (const file of retired) {
            const name = path.basename(file);
            if (!texts.some((t) => t.includes(name))) fs.rmSync(file);
            else logger.warn(`${name} is still referenced; kept`);
          }
        }
      },
    },
  };
}
