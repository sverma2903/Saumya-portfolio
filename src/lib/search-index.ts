/**
 * search-index.ts · WP1. Build-time data for the Sheet list (⌘K, SPEC §4.4), served as `/search-index.json`
 * (src/pages/search-index.json.ts) and fetched by scripts/palette/* on first open.
 *
 *   pages  every sheet of the set (A-000 … C-100 + the two external links). Case pages also carry their levels
 *          (labels, section ids, elevations), so the Levels group is derived client-side, not stored twice.
 *   items  details (every block `h`, anchored at its heading id) and passages (her sentences, split from the
 *          stripped text of every text-bearing block field, anchored at the block id).
 *
 * Nothing here is generated: every `t`, `lead`, `x` and level label is an exact substring of her normalised text
 * (tests/unit/wp1-search.test.ts). Anchors come from the one id scheme (lib/ids.ts via lib/blocks-ctx.ts), so they
 * equal the rendered ids. A passage with `j: 1` continues the previous passage inside the same element text, which is
 * what lets the client add a text-fragment prefix/suffix (§4.4 cross-page citations) that is guaranteed adjacent.
 */
import { about, cases, home, labels, play, selected } from '../content/site';
import type { Block, CaseStudy } from './blocks';
import { chapterCtxs } from './blocks-ctx';
import { blockId, splitChildId } from './ids';
import { reading } from './reading';
import { domainOf, sentences, stripHtml, withoutOrnament } from './text';
import { sheets, SHEET_NO } from '../data/sheets';
import { chrome } from '../data/chrome';
import type { CaseSlug } from './verbatim';

export type PageKind = 'home' | 'case' | 'about' | 'play' | 'external';

export interface IndexPage {
  kind: PageKind;
  /** case slug, 'about', 'fun', '' (home, external) */
  slug: string;
  /** 'A-000' | 'A-101' … | 'B-100' | 'C-100' | '↗' */
  sheet: string;
  /** the row title (her title from sheets.ts; chrome "Cover sheet" for A-000) */
  title: string;
  href: string;
  /** extra verbatim strings a query may match (her case title, line, tags, readouts, eyebrow, meta values, domain) */
  x?: string[];
  /** level / section labels (cases: her chapter labels; site pages: her section titles) */
  lv?: string[];
  /** cases only: section ids (anchors), index-aligned with lv */
  ids?: string[];
  /** cases only: elevations '±00:00' | '+02:32', index-aligned with lv */
  el?: string[];
}

export interface IndexItem {
  k: 'detail' | 'passage';
  /** page index */
  p: number;
  /** level / section index into pages[p].lv */
  c: number;
  /** anchor id on that page (heading id for details, block id for passages); absent on site pages */
  a?: string;
  /** the text (verbatim) */
  t: string;
  /** a verbatim lead shown before t (a stat value, a timeline key) */
  lead?: string;
  /** 1 when this passage directly follows the previous item inside the same element text */
  j?: 1;
  /** 1 when the passage is a fragment, not a sentence: a stat or timeline step (it has a lead), a caption, or a short
   *  label with no end stop. The Sheet list ranks fragments after her sentences and sets them on one line. */
  f?: 1;
  /** 1 when no text directive can match it: the passage runs across a <br> or across block elements. A cross-page
   *  citation then aims its #:~:text= at `d` (the longest single run of the passage) and lands the block by ?cite. */
  nd?: 1;
  /** with nd: the longest part of `t` that sits in one text run (a verbatim substring of t) */
  d?: string;
}

export interface SearchIndex {
  v: 1;
  pages: IndexPage[];
  items: IndexItem[];
}

/**
 * What ships (SPEC §4.4, budget ≤ 16 KB gz for /search-index.json). Her sentences alone are ≈ 51 KB raw / 19 KB gz,
 * so case passages are sharded per sheet (/search-index/<slug>.json, ≈ 4 KB gz each) and fetched in parallel only
 * when a query reaches 2 characters, which is exactly when §4.4 starts showing Passages. The main file holds the
 * pages (Sheets + Levels), every detail and the site-page passages, so the Sheet list opens complete.
 */
export interface MainIndex extends SearchIndex {
  /** page indices whose passages live in a shard: { cloudflare: 1, … } → /search-index/cloudflare.json */
  shards: Record<string, number>;
}
export interface ShardIndex {
  v: 1;
  /** the page index every item belongs to */
  p: number;
  items: Omit<IndexItem, 'p'>[];
}

/** One text field of a block (rendered as one element): its stripped text, an optional verbatim lead, its source
 *  HTML (to find where the rendered text breaks) and whether it is a caption. */
interface Field { text: string; lead?: string; html?: string; cap?: boolean }

const s = (html: string | undefined | null) => stripHtml(html);
const wordCount = (t: string) => (t.match(/\S+/g) ?? []).length;

/** The searchable text fields of one block, in DOM order (split handled by the caller). */
export function blockFields(b: Block): Field[] {
  const out: Field[] = [];
  const add = (html: string | undefined | null, lead?: string, cap?: boolean) => {
    const text = s(html);
    if (!text) return;
    const f: Field = { text, html: html ?? undefined };
    if (lead) f.lead = lead;
    if (cap) f.cap = true;
    out.push(f);
  };
  switch (b.t) {
    case 'h3': case 'lede': case 'p': case 'small': add(b.html); break;
    case 'list': b.items.forEach((x) => add(x)); break;
    case 'media': add(b.caption, undefined, true); break;
    case 'stats': b.items.forEach((x) => add(x.html, s(x.v))); break;
    case 'callout': add(b.lede); add(b.html); break;
    case 'cards': b.items.forEach((x) => { add(x.title); add(x.html); }); break;
    case 'feature': add(b.title); add(b.lede); add(b.html); (b.items ?? []).forEach((x) => add(x)); break;
    case 'stories': b.items.forEach((x) => { add(x.title); x.rows.forEach(([, v]) => add(v)); }); break;
    case 'timeline': b.items.forEach((x) => add(x.v, s(x.k))); break;
    case 'insights': b.items.forEach((x) => { add(x.title); add(x.sub); x.items.forEach((y) => add(y)); }); break;
    case 'concept': add(b.title); b.captions.forEach((x) => add(x, undefined, true)); (b.analysis ?? []).forEach((x) => add(x)); break;
    default: break; // h → details; cta, tabs, spacer, split (children handled by the caller)
  }
  return out;
}

type Piece = { t: string; lead?: string; j?: 1; f?: 1; nd?: 1; d?: string };

/** The longest part of `t` inside one run of `runs` (runs joined by one space make up the field text). */
function longestRun(t: string, runs: string[]): string | undefined {
  const joined = runs.join(' ');
  const at = joined.indexOf(t);
  if (at < 0) return undefined;
  let best = '';
  let pos = 0;
  for (const r of runs) {
    const a = Math.max(pos, at);
    const b = Math.min(pos + r.length, at + t.length);
    if (b > a && b - a > best.length) best = joined.slice(a, b).trim();
    pos += r.length + 1;
  }
  return best && t.includes(best) ? best : undefined;
}

/** A sentence ends with a stop (optionally inside a closing quote or bracket). */
const END_STOP = /[.!?:;…]["'”’)\]]*$/;
/** An unpunctuated run this short reads as a label, not a sentence. */
const LABEL_WORDS = 6;
/** Where the rendered text of one field breaks: a <br> or a block element boundary. */
const TEXT_BREAK = /<br\s*\/?>|<\/?(?:p|li|ul|ol|div|h[1-6]|blockquote|figcaption|dt|dd)\b[^>]*>/gi;

/** Passages of one field: its sentences (≥ 2 words), the first carrying the lead, the rest marked `j`. */
function fieldPassages(f: Field): Piece[] {
  const out: Piece[] = [];
  let prevKept = false;
  const runs = f.html && TEXT_BREAK.test(f.html) ? f.html.split(TEXT_BREAK).map((x) => s(x)).filter(Boolean) : null;
  TEXT_BREAK.lastIndex = 0;
  sentences(f.text).forEach((t, i) => {
    if (wordCount(t) < 2 && !(i === 0 && f.lead)) { prevKept = false; return; }
    const item: Piece = { t };
    if (i === 0 && f.lead) item.lead = f.lead;
    if (i > 0 && prevKept) item.j = 1;
    if (item.lead || f.cap || (!END_STOP.test(t) && wordCount(t) <= LABEL_WORDS)) item.f = 1;
    if (runs && !runs.some((r) => r.includes(t))) {
      item.nd = 1;
      const d = longestRun(t, runs);
      if (d && wordCount(d) >= 2) item.d = d;
    }
    out.push(item);
    prevKept = true;
  });
  return out;
}

function casePage(cs: CaseStudy): IndexPage {
  const slug = cs.slug as CaseSlug;
  const sheet = sheets.find((x) => x.slug === slug)!;
  const r = reading(cs);
  const x = [
    cs.title, s(cs.eyebrow),
    ...(sheet.line ? [sheet.line.text] : []),
    ...sheet.tags.map((t) => t.text),
    ...(sheet.readout?.lines.flatMap((l) => [l.value.text.trim(), l.label.text.trim()]) ?? []),
    ...cs.meta.map(([, v]) => s(v)),
  ].filter((v, i, a) => v && a.indexOf(v) === i && v !== sheet.title.text);
  return {
    kind: 'case', slug, sheet: SHEET_NO[slug], title: sheet.title.text, href: sheet.href, x,
    lv: r.sections.map((z) => z.label), ids: r.sections.map((z) => z.id), el: r.sections.map((z) => z.elev),
  };
}

let memo: SearchIndex | null = null;

/** The whole index (pages + every detail and passage), built once per build. */
export function buildSearchIndex(): SearchIndex {
  if (!memo) memo = build();
  return memo;
}

/** /search-index.json: pages, every detail, the site-page passages, and the shard map. */
export function mainIndex(): MainIndex {
  const ix = buildSearchIndex();
  const shards: Record<string, number> = {};
  ix.pages.forEach((pg, i) => { if (pg.kind === 'case') shards[pg.slug] = i; });
  const sharded = new Set(Object.values(shards));
  return { v: 1, pages: ix.pages, items: ix.items.filter((it) => it.k === 'detail' || !sharded.has(it.p)), shards };
}

/** /search-index/<slug>.json: the passages of one case sheet. */
export function shardIndex(slug: string): ShardIndex {
  const ix = buildSearchIndex();
  const p = ix.pages.findIndex((pg) => pg.kind === 'case' && pg.slug === slug);
  if (p < 0) throw new Error(`search-index: no case page ${slug}`);
  return { v: 1, p, items: ix.items.filter((it) => it.p === p && it.k === 'passage').map(({ p: _p, ...rest }) => rest) };
}

function build(): SearchIndex {
  const w1 = chrome.wp1.titleBar;
  const pages: IndexPage[] = [];
  const items: IndexItem[] = [];

  // ── pages (the Sheets group), in drawing-index order: A-000, A-101…A-106, B-100, C-100, ↗, ↗ ──
  const HOME = pages.push({
    kind: 'home', slug: '', sheet: 'A-000', title: w1.coverSheet, href: '/',
    x: [w1.drawingIndex, s(withoutOrnament(home.headline))], lv: [w1.coverSheet, w1.drawingIndex],
  }) - 1;
  const casePageIdx = new Map<string, number>();
  for (const cs of cases) casePageIdx.set(cs.slug, pages.push(casePage(cs)) - 1);
  const aboutSheet = sheets.find((x) => x.kind === 'about')!;
  const playSheet = sheets.find((x) => x.kind === 'play')!;
  const { fiction, writing, meditation, sketching } = about.loves;
  const ABOUT = pages.push({
    kind: 'about', slug: 'about', sheet: aboutSheet.no, title: aboutSheet.title.text, href: aboutSheet.href,
    x: [s(about.headline)],
    lv: [labels.story.replace(/\s*↓$/, ''), s(fiction.title), s(writing.title), s(meditation.title), s(sketching.title)],
  }) - 1;
  const PLAY = pages.push({
    kind: 'play', slug: 'fun', sheet: playSheet.no, title: playSheet.title.text, href: playSheet.href,
    x: [s(withoutOrnament(play.headline))], lv: [playSheet.title.text],
  }) - 1;
  for (const ext of sheets.filter((x) => x.kind === 'external')) {
    pages.push({ kind: 'external', slug: '', sheet: '↗', title: ext.title.text, href: ext.href, x: [ext.domain ?? domainOf(ext.href)] });
  }

  // ── items ──
  const seen = new Map<number, Set<string>>();
  const push = (p: number, c: number, a: string | undefined, pieces: Piece[]) => {
    let set = seen.get(p);
    if (!set) seen.set(p, (set = new Set()));
    let prevPushed = false;
    for (const piece of pieces) {
      if (set.has(piece.t)) { prevPushed = false; continue; } // one entry per sentence per page (first occurrence)
      set.add(piece.t);
      const it: IndexItem = { k: 'passage', p, c, t: piece.t };
      if (a) it.a = a;
      if (piece.lead) it.lead = piece.lead;
      if (piece.j && prevPushed) it.j = 1;
      if (piece.f) it.f = 1;
      if (piece.nd) it.nd = 1;
      if (piece.d) it.d = piece.d;
      items.push(it);
      prevPushed = true;
    }
  };
  const fieldsOf = (fields: Field[]) => fields.map(fieldPassages);

  // site pages (no anchors: the client finds the sentence in the DOM, or cites by text fragment)
  push(HOME, 0, undefined, fieldPassages({ text: s(withoutOrnament(home.headline)), html: withoutOrnament(home.headline) }));
  push(HOME, 0, undefined, fieldPassages({ text: s(home.sub), html: home.sub }));
  selected.forEach((c) => push(HOME, 1, undefined, fieldPassages({ text: s(c.text), html: c.text })));
  push(ABOUT, 0, undefined, fieldPassages({ text: s(about.headline), html: about.headline }));
  about.story.forEach((x) => push(ABOUT, 0, undefined, fieldPassages({ text: s(x), html: x })));
  push(ABOUT, 1, undefined, fieldPassages({ text: s(fiction.text), html: fiction.text }));
  push(ABOUT, 2, undefined, fieldPassages({ text: s(writing.text), html: writing.text }));
  push(ABOUT, 2, undefined, fieldPassages({ text: s(writing.published), html: writing.published }));
  writing.posts.forEach((x) => push(ABOUT, 2, undefined, fieldPassages({ text: s(x.title), html: x.title })));
  push(ABOUT, 3, undefined, fieldPassages({ text: s(meditation.text), html: meditation.text }));
  push(ABOUT, 4, undefined, fieldPassages({ text: s(sketching.text), html: sketching.text }));
  push(PLAY, 0, undefined, fieldPassages({ text: s(withoutOrnament(play.headline)), html: withoutOrnament(play.headline) }));
  push(PLAY, 0, undefined, fieldPassages({ text: s(play.sub), html: play.sub }));
  play.items.forEach((x) => push(PLAY, 0, undefined, [...fieldPassages({ text: s(x.title), html: x.title }), ...fieldPassages({ text: s(x.tag), html: x.tag })]));

  // cases: details (block h → heading id) and passages (block id)
  for (const cs of cases) {
    const p = casePageIdx.get(cs.slug)!;
    const chapters = chapterCtxs(cs, SHEET_NO[cs.slug as CaseSlug]);
    chapters.forEach((ch) => {
      ch.section.blocks.forEach((b, i) => {
        const ctx = ch.ctxs[i];
        if (b.t === 'h') {
          items.push({ k: 'detail', p, c: ch.index, a: ctx.headingId ?? ctx.id, t: s(b.text) });
          return;
        }
        if (b.t === 'split') {
          const id = blockId(ch.section.id, i);
          (['left', 'right'] as const).forEach((side) => b[side].forEach((child, j) => {
            const cid = splitChildId(id, side === 'left' ? 'l' : 'r', j);
            if (child.t === 'h') items.push({ k: 'detail', p, c: ch.index, a: cid, t: s(child.text) });
            else for (const f of fieldsOf(blockFields(child))) push(p, ch.index, cid, f);
          }));
          return;
        }
        for (const f of fieldsOf(blockFields(b))) push(p, ch.index, ctx.id, f);
      });
    });
  }
  return { v: 1, pages, items };
}

/** Every visible string the index ships (for the verbatim unit test). */
export function indexStrings(ix: SearchIndex): { where: string; text: string; page: IndexPage }[] {
  const out: { where: string; text: string; page: IndexPage }[] = [];
  ix.pages.forEach((pg, i) => {
    if (pg.kind !== 'home') out.push({ where: `pages[${i}].title`, text: pg.title, page: pg });
    (pg.x ?? []).forEach((x, j) => { if (!(pg.kind === 'home' && j === 0) && pg.kind !== 'external') out.push({ where: `pages[${i}].x[${j}]`, text: x, page: pg }); });
    if (pg.kind !== 'home') (pg.lv ?? []).forEach((x, j) => out.push({ where: `pages[${i}].lv[${j}]`, text: x, page: pg }));
  });
  ix.items.forEach((it, i) => {
    out.push({ where: `items[${i}].t`, text: it.t, page: ix.pages[it.p] });
    if (it.lead) out.push({ where: `items[${i}].lead`, text: it.lead, page: ix.pages[it.p] });
  });
  return out;
}
