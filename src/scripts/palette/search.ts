/**
 * palette/search.ts · WP1. The Sheet list's matcher (SPEC §4.4). Pure: no DOM, no fetch, so it is unit-tested with the
 * real build-time index (tests/unit/wp1-search.test.ts). No library; one pass over ≈ 800 entries, well under 3 ms.
 *
 *   q → lower-case → tokens of ≥ 2 characters. An entry matches only if EVERY token occurs in it (the last token may
 *   be a partial word, i.e. a prefix, which substring matching already allows). A 2-character token must start a
 *   word ("ai" finds "AI-generated", never "det·ai·led" or "em·ai·l").
 *   score = Σ tokens (+3 word-boundary hit, +1 substring hit) + 2 if the first hit is within the first 24 characters
 *           + type bonus (sheet 6, level 5, detail 4, passage 0) + 2 if on the current page − length / 220
 *           − 4 for a passage fragment (a stat, a timeline step, a caption, a label without an end stop)
 *   sorted by tier first (every token hits a word start, above any entry that only matched inside a word), then by
 *   score, then document order. Groups: at most 6 rows each, Passages 8 (only when the query is ≥ 2 chars).
 */
import type { IndexItem, IndexPage, MainIndex, ShardIndex } from '../../lib/search-index';

export type EntryKind = 'sheet' | 'level' | 'detail' | 'passage';

export interface Entry {
  kind: EntryKind;
  /** document order across the whole set (tie-break) */
  order: number;
  /** page index */
  p: number;
  /** the text shown (verbatim) */
  t: string;
  /** a verbatim lead shown before t (stat value, timeline key) */
  lead?: string;
  /** chapter / section index (levels, details, passages) */
  c?: number;
  /** anchor id on its page (level → section id, detail → heading id, passage → block id) */
  a?: string;
  /** passages: continues the previous passage inside the same element (text-fragment prefix is safe) */
  j?: boolean;
  /** passages: a fragment (stat, timeline step, caption, label), not one of her sentences — ranked after sentences */
  f?: boolean;
  /** passages: no text directive can match it (her text runs across elements or a <br>) — cite by block only */
  nd?: boolean;
  /** with nd: the part of t a text directive can match (one text run), when there is one of ≥ 2 words */
  d?: string;
  /** extra verbatim strings that may match (sheets) */
  x?: string[];
  /** lower-cased haystacks, computed once */
  hay: string;
  hx?: string[];
}

export interface Hit {
  e: Entry;
  score: number;
  /** sheets: the verbatim piece of `x` that explains the match (shown as a sub-line), when t itself did not match */
  why?: string;
  /** every token starts a word (the upper tier) */
  wb: boolean;
}

export interface Groups {
  sheets: Hit[];
  levels: Hit[];
  details: Hit[];
  passages: Hit[];
  /** total passage matches before the cap of 8 (for "N found · verbatim") */
  passageTotal: number;
}

export const LIMITS = { sheets: 6, levels: 6, details: 6, passages: 8 } as const;
const BONUS: Record<EntryKind, number> = { sheet: 6, level: 5, detail: 4, passage: 0 };
const FRAGMENT = -4;

export class Corpus {
  pages: IndexPage[] = [];
  entries: Entry[] = [];
  private loaded = new Set<number>();
  private seq = 0;

  constructor(main: MainIndex) {
    this.pages = main.pages;
    main.pages.forEach((pg, p) => {
      this.add({ kind: 'sheet', p, t: pg.title, x: [pg.sheet, ...(pg.x ?? [])] });
      (pg.kind === 'case' ? pg.lv ?? [] : []).forEach((label, c) => this.add({ kind: 'level', p, c, t: label, a: pg.ids?.[c] }));
    });
    this.addItems(main.items);
    main.items.forEach((it) => { if (it.k === 'passage') this.loaded.add(it.p); });
  }

  /** Merge one shard of passages (idempotent). */
  addShard(sh: ShardIndex): void {
    if (this.loaded.has(sh.p)) return;
    this.loaded.add(sh.p);
    this.addItems(sh.items.map((it) => ({ ...it, p: sh.p })));
    // keep document order stable: pages first, then their items (shards may arrive in any order)
    this.entries.sort((a, b) => a.order - b.order);
  }

  hasPassages(p: number): boolean {
    return this.loaded.has(p);
  }

  private addItems(items: IndexItem[]): void {
    for (const it of items) this.add({ kind: it.k, p: it.p, c: it.c, a: it.a, t: it.t, lead: it.lead, j: it.j === 1, f: it.f === 1, nd: it.nd === 1, d: it.d });
  }

  private add(e: Omit<Entry, 'order' | 'hay' | 'hx'>): void {
    // order: page-major so a late shard slots in where its page is
    const order = e.p * 100000 + this.seq++;
    const hay = (e.lead ? `${e.lead} ${e.t}` : e.t).toLowerCase();
    this.entries.push({ ...e, order, hay, hx: e.x?.map((s) => s.toLowerCase()) });
  }
}

/** Query → tokens (lower-case, split on whitespace, ≥ 2 characters). */
export function tokens(q: string): string[] {
  return q.toLowerCase().split(/\s+/).map((t) => t.trim()).filter((t) => t.length >= 2);
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isWordChar = (ch: string | undefined) => !!ch && /[\p{L}\p{N}]/u.test(ch);

/** Tokens shorter than this must start a word: two letters inside a word are noise, not a find. */
const MIN_INNER = 3;

/** +3 when `tok` starts a word somewhere in `hay`, +1 when it only occurs inside a word (≥ 3 characters), 0 else. */
function tokenScore(hay: string, tok: string): number {
  let i = hay.indexOf(tok);
  if (i < 0) return 0;
  while (i >= 0) {
    if (!isWordChar(hay[i - 1])) return 3;
    i = hay.indexOf(tok, i + 1);
  }
  return tok.length >= MIN_INNER ? 1 : 0;
}

/** true when every token starts a word of `text` (actions match by their label's word starts only). */
export function wordStarts(text: string, toks: string[]): boolean {
  const hay = text.toLowerCase();
  return toks.every((t) => tokenScore(hay, t) === 3);
}

export function scoreEntry(e: Entry, toks: string[], currentPage: number): Hit | null {
  let score = 0;
  let why: string | undefined;
  let wb = true;
  for (const tok of toks) {
    let s = tokenScore(e.hay, tok);
    if (!s && e.hx) {
      // sheets: a token may match her line / tags / readout / case title instead of the row title
      for (let i = 0; i < e.hx.length; i++) {
        const sx = tokenScore(e.hx[i], tok);
        if (sx > s) { s = sx; why = e.x![i]; }
      }
    }
    if (!s) return null;
    if (s < 3) wb = false;
    score += s;
  }
  const first = e.hay.indexOf(toks[0]);
  if (first >= 0 && first < 24) score += 2;
  score += BONUS[e.kind];
  if (e.p === currentPage) score += 2;
  score -= e.t.length / 220;
  if (e.f) score += FRAGMENT;
  // the sheet's own code (x[0]) never needs explaining
  if (why && why === e.x?.[0]) why = undefined;
  return { e, score, why, wb };
}

/** Run a query. `levelPage` limits the Levels group to one case when the query is empty (current case page). */
export function search(corpus: Corpus, q: string, currentPage: number): Groups {
  const toks = tokens(q);
  const out: Groups = { sheets: [], levels: [], details: [], passages: [], passageTotal: 0 };
  if (!toks.length) return out;
  const wantPassages = q.trim().length >= 2;
  const hits: Record<EntryKind, Hit[]> = { sheet: [], level: [], detail: [], passage: [] };
  for (const e of corpus.entries) {
    if (e.kind === 'passage' && !wantPassages) continue;
    const h = scoreEntry(e, toks, currentPage);
    if (h) hits[e.kind].push(h);
  }
  const rank = (a: Hit, b: Hit) => Number(b.wb) - Number(a.wb) || b.score - a.score || a.e.order - b.e.order;
  for (const k of Object.keys(hits) as EntryKind[]) hits[k].sort(rank);
  out.sheets = hits.sheet.slice(0, LIMITS.sheets);
  out.levels = hits.level.slice(0, LIMITS.levels);
  out.details = hits.detail.slice(0, LIMITS.details);
  out.passageTotal = hits.passage.length;
  out.passages = hits.passage.slice(0, LIMITS.passages);
  return out;
}

/**
 * Ranges [start, end) of the token hits in `text` (case-insensitive), merged. For <mark class="q">. Only hits that
 * start a word are marked; a token (≥ 3 characters) that occurs only inside words marks those occurrences instead.
 */
export function markRanges(text: string, toks: string[]): [number, number][] {
  const lower = text.toLowerCase();
  const r: [number, number][] = [];
  for (const t of toks) {
    const re = new RegExp(esc(t), 'g');
    let m: RegExpExecArray | null;
    const starts: [number, number][] = [];
    const inner: [number, number][] = [];
    while ((m = re.exec(lower))) (isWordChar(lower[m.index - 1]) ? inner : starts).push([m.index, m.index + t.length]);
    r.push(...(starts.length ? starts : t.length >= MIN_INNER ? inner : []));
  }
  r.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const x of r) {
    const last = merged[merged.length - 1];
    if (last && x[0] <= last[1]) last[1] = Math.max(last[1], x[1]);
    else merged.push([x[0], x[1]]);
  }
  return merged;
}

/**
 * The text directive for a cross-page citation (§4.4): the first 6 words and the last 4 (or the whole sentence when it
 * has ≤ 10 words), percent-encoding - , &. `prev`/`next` are the neighbouring sentences in the SAME element: when
 * present, 3 words of context (prefix-, or -suffix) pin the match to her paragraph rather than to an earlier verbatim
 * quote of it (the Key plan and the Decision schedule sit above the chapters).
 */
export function textDirective(t: string, prev?: string, next?: string): string {
  const enc = (s: string) => encodeURIComponent(s).replace(/-/g, '%2D');
  const w = t.trim().split(/\s+/);
  let d = w.length <= 10 ? enc(w.join(' ')) : `${enc(w.slice(0, 6).join(' '))},${enc(w.slice(-4).join(' '))}`;
  if (prev) d = `${enc(prev.trim().split(/\s+/).slice(-3).join(' '))}-,${d}`;
  else if (next) d = `${d},-${enc(next.trim().split(/\s+/).slice(0, 3).join(' '))}`;
  return `:~:text=${d}`;
}
