/**
 * emphasis.ts · polish r1 (fidelity). Her inline emphasis travels with every selection of her words.
 *
 * The Key plan, the Decision schedule and other 60-second-layer selections pick a verbatim PLAIN substring of her text
 * (tests/data/substrings.test.ts guards it). Rendering that plain text dropped the <strong>/<em>/<mark> she set inside
 * it. `sliceHtml(raw, plain)` maps the substring back onto her source HTML — on exactly the normalisation every
 * verbatim check uses (text.ts stripHtml: <br> → space, tags removed, entities decoded, whitespace collapsed) — and
 * returns that stretch of HTML with her inline emphasis intact: a tag that opens before the slice is re-opened at its
 * start, one still open at its end is closed there. Only emphasis tags survive (strong, em, mark, b, i, sup, sub);
 * anything else (her <a>, spans) keeps its text and loses the tag, because a selection is usually already inside a
 * link (a Key-plan stop, a cited cell) and a link cannot nest.
 *
 * It never adds, removes or reorders a character: stripHtml(sliceHtml(raw, plain)) === plain.
 */
import { corpus, type Src } from './verbatim';
import { decodeEntities, escapeHtml, normalize, stripHtml } from './text';

const KEEP = new Set(['strong', 'em', 'mark', 'b', 'i', 'sup', 'sub']);

interface Ch { ch: string }
type Tok = { kind: 'tag'; name: string; close: boolean; raw: string; at: number } | { kind: 'ch'; i: number };

/** Her HTML as a token stream: tags, and decoded characters. */
function tokenize(raw: string): { toks: Tok[]; chars: Ch[] } {
  const toks: Tok[] = [];
  const chars: Ch[] = [];
  const re = /<\/?([a-zA-Z][\w-]*)[^>]*>|&(?:#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);|[\s\S]/giy;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const s = m[0];
    const at = m.index;
    if (s[0] === '<' && m[1]) {
      const name = m[1].toLowerCase();
      if (name === 'br') { chars.push({ ch: ' ' }); toks.push({ kind: 'ch', i: chars.length - 1 }); continue; }
      toks.push({ kind: 'tag', name, close: s[1] === '/', raw: s, at });
      continue;
    }
    for (const ch of decodeEntities(s)) {
      chars.push({ ch });
      toks.push({ kind: 'ch', i: chars.length - 1 });
    }
  }
  return { toks, chars };
}

/** The HTML of `plain` inside her `raw` HTML, emphasis kept; null when `plain` is not a substring of stripHtml(raw). */
export function sliceHtml(raw: string, plain: string): string | null {
  const want = normalize(plain);
  if (!want) return null;
  const { toks, chars } = tokenize(raw);
  // the normalised text, and for each of its characters the index of the source character it came from
  let norm = '';
  const from: number[] = [];
  let ws = false;
  chars.forEach((c, i) => {
    if (c.ch === '​') return;
    if (/[\s ]/.test(c.ch)) { if (norm && !ws) { norm += ' '; from.push(i); } ws = true; return; }
    ws = false;
    norm += c.ch;
    from.push(i);
  });
  const k = norm.indexOf(want);
  if (k < 0) return null;
  const first = from[k];
  const last = from[k + want.length - 1];
  // walk the tokens: the emphasis open at `first` is re-opened, the slice is copied, what is still open is closed
  const stack: { name: string; raw: string }[] = [];
  let out = '';
  let inside = false;
  for (const t of toks) {
    if (t.kind === 'tag') {
      if (!KEEP.has(t.name)) continue;
      if (t.close) {
        const j = stack.map((x) => x.name).lastIndexOf(t.name);
        if (j >= 0) { stack.splice(j, 1); if (inside) out += `</${t.name}>`; }
      } else {
        stack.push({ name: t.name, raw: `<${t.name}>` });
        if (inside) out += `<${t.name}>`;
      }
      continue;
    }
    if (t.i === first && !inside) { inside = true; out += stack.map((x) => x.raw).join(''); }
    if (inside) out += escapeHtml(chars[t.i].ch);
    if (t.i === last) { out += stack.map((x) => `</${x.name}>`).reverse().join(''); break; }
  }
  // drop emphasis that wraps nothing (a tag re-opened or closed at a clipped edge)
  out = out.replace(/<(strong|em|mark|b|i|sup|sub)>(\s*)<\/\1>/g, '$2').replace(/[ \t\r\n]{2,}/g, ' ');
  return stripHtml(out) === want ? out.trim() : null;
}

/**
 * `plain` (a verbatim selection) as HTML with her emphasis: the first corpus string of `src` that contains it gives
 * the source. Falls back to the escaped plain text (a selection that spans two of her strings has no single source).
 */
export function selectionHtml(src: Src, plain: string, rawHint?: string): string {
  if (rawHint) {
    const h = sliceHtml(rawHint, plain);
    if (h != null) return h;
  }
  const want = normalize(plain);
  for (const e of corpus(src)) {
    if (!e.text.includes(want)) continue;
    const h = sliceHtml(e.raw, want);
    if (h != null) return h;
  }
  return escapeHtml(want);
}
