/**
 * verbatim.ts · P0. The verbatim guard's source of truth (SPEC §0.1.1, §8.5).
 *
 *  - VerbatimRef: a string we SELECT from her text (index line, readout part, Key-plan override, decision half,
 *    label). It declares its source; tests/data/substrings.test.ts asserts it is an exact substring of that
 *    source's normalised text (tags stripped, entities decoded, whitespace collapsed; see text.ts).
 *  - corpus(src): every visible string she wrote, per source ('site' or a case slug), normalised.
 *  - pageRequired / pageAllowed / emphasisTexts: the three corpora tests/dist/verbatim.test.ts uses.
 *  - blockTexts / findBlock: resolve "which block does this sentence live in" → a stable block id (ids.ts).
 */
import { about, cases, home, labels, links, play, selected } from '../content/site';
import type { Block, CaseStudy } from './blocks';
import { blockId, splitChildId } from './ids';
import { normalize, stripHtml } from './text';

export type CaseSlug = 'cloudflare' | 'pff' | 'csbs' | 'u-up' | 'orbit' | 'educademy';
export type Src = 'site' | CaseSlug;
export const CASE_SLUGS: CaseSlug[] = cases.map((c) => c.slug as CaseSlug);

export interface VerbatimRef {
  src: Src;
  text: string;
  /** human pointer for reviewers, e.g. 'selected[0].text' or 'overview › Results › stats[0].html' */
  field?: string;
}
export function ref(src: Src, text: string, field?: string): VerbatimRef {
  return { src, text, field };
}

export interface CorpusEntry {
  /** normalised plain text (stripHtml) */
  text: string;
  /** her raw HTML/string as authored */
  raw: string;
  /** where it lives, e.g. 'cloudflare/empathize/3.items[0]' */
  field: string;
}

export function caseBySlug(slug: string): CaseStudy {
  const cs = cases.find((c) => c.slug === slug);
  if (!cs) throw new Error(`Unknown case slug: ${slug}`);
  return cs;
}

/** Every text-bearing field of one block, in DOM order. */
export function blockEntries(b: Block, at: string): CorpusEntry[] {
  const out: CorpusEntry[] = [];
  const add = (raw: string | undefined | null, field: string) => {
    if (raw == null) return;
    const text = stripHtml(raw);
    if (text) out.push({ text, raw, field: `${at}.${field}` });
  };
  switch (b.t) {
    case 'h': add(b.text, 'text'); break;
    case 'h3': case 'lede': case 'p': case 'small': add(b.html, 'html'); break;
    case 'list': b.items.forEach((x, i) => add(x, `items[${i}]`)); break;
    case 'media': add(b.caption, 'caption'); break;
    case 'stats': b.items.forEach((x, i) => { add(x.v, `items[${i}].v`); add(x.html, `items[${i}].html`); }); break;
    case 'cta': b.items.forEach((x, i) => add(x.label, `items[${i}].label`)); break;
    case 'callout': add(b.title, 'title'); add(b.lede, 'lede'); add(b.html, 'html'); break;
    case 'cards': b.items.forEach((x, i) => { add(x.kicker, `items[${i}].kicker`); add(x.title, `items[${i}].title`); add(x.html, `items[${i}].html`); }); break;
    case 'feature':
      add(b.n, 'n'); add(b.kicker, 'kicker'); add(b.title, 'title'); add(b.lede, 'lede'); add(b.html, 'html');
      (b.items ?? []).forEach((x, i) => add(x, `items[${i}]`));
      break;
    case 'stories':
      b.items.forEach((x, i) => { add(x.title, `items[${i}].title`); x.rows.forEach(([k, v], j) => { add(k, `items[${i}].rows[${j}][0]`); add(v, `items[${i}].rows[${j}][1]`); }); });
      break;
    case 'timeline': b.items.forEach((x, i) => { add(x.k, `items[${i}].k`); add(x.v, `items[${i}].v`); }); break;
    case 'insights':
      b.items.forEach((x, i) => { add(x.title, `items[${i}].title`); add(x.sub, `items[${i}].sub`); x.items.forEach((y, j) => add(y, `items[${i}].items[${j}]`)); });
      break;
    case 'split':
      b.left.forEach((c, j) => out.push(...blockEntries(c, `${at}.left[${j}]`)));
      b.right.forEach((c, j) => out.push(...blockEntries(c, `${at}.right[${j}]`)));
      break;
    case 'tabs': b.items.forEach((x, i) => add(x.label, `items[${i}].label`)); break;
    case 'concept':
      add(b.title, 'title'); b.captions.forEach((x, i) => add(x, `captions[${i}]`)); (b.analysis ?? []).forEach((x, i) => add(x, `analysis[${i}]`));
      break;
    case 'spacer': break;
  }
  return out;
}

/** Every visible string of one case (header + title block + chapter labels + blocks). */
export function caseCorpus(cs: CaseStudy, opts: { includeMetaTitle?: boolean } = {}): CorpusEntry[] {
  const out: CorpusEntry[] = [];
  const add = (raw: string, field: string) => { const text = stripHtml(raw); if (text) out.push({ text, raw, field: `${cs.slug}/${field}` }); };
  add(cs.eyebrow, 'eyebrow');
  add(cs.title, 'title');
  if (opts.includeMetaTitle !== false) add(cs.metaTitle, 'metaTitle');
  add(cs.description, 'description');
  cs.meta.forEach(([k, v], i) => { add(k, `meta[${i}][0]`); add(v, `meta[${i}][1]`); });
  cs.sections.forEach((s) => {
    add(s.label, `${s.id}.label`);
    s.blocks.forEach((b, i) => out.push(...blockEntries(b, `${cs.slug}/${s.id}/${i}`)));
  });
  return out;
}

export const emailAddress = links.email.replace(/^mailto:/, '');

/** Every visible string in site.ts (home, the four home cards, about, play, her labels, her address). */
export function siteCorpus(): CorpusEntry[] {
  const out: CorpusEntry[] = [];
  const add = (raw: string | undefined, field: string) => { if (raw == null) return; const text = stripHtml(raw); if (text) out.push({ text, raw, field: `site/${field}` }); };
  add(home.headline, 'home.headline'); add(home.sub, 'home.sub'); add(home.connect, 'home.connect'); add(home.closing, 'home.closing'); add(home.copyright, 'home.copyright');
  selected.forEach((s, i) => { add(s.title, `selected[${i}].title`); add(s.text, `selected[${i}].text`); s.tags.forEach((t, j) => add(t, `selected[${i}].tags[${j}]`)); });
  add(about.headline, 'about.headline');
  about.story.forEach((s, i) => add(s, `about.story[${i}]`));
  const { fiction, writing, meditation, sketching } = about.loves;
  add(fiction.title, 'about.loves.fiction.title'); add(fiction.text, 'about.loves.fiction.text');
  add(writing.title, 'about.loves.writing.title'); add(writing.text, 'about.loves.writing.text'); add(writing.published, 'about.loves.writing.published');
  writing.posts.forEach((p, i) => add(p.title, `about.loves.writing.posts[${i}].title`));
  add(meditation.title, 'about.loves.meditation.title'); add(meditation.text, 'about.loves.meditation.text');
  add(sketching.title, 'about.loves.sketching.title'); add(sketching.text, 'about.loves.sketching.text');
  add(play.headline, 'play.headline'); add(play.sub, 'play.sub');
  play.items.forEach((p, i) => { add(p.title, `play.items[${i}].title`); add(p.tag, `play.items[${i}].tag`); });
  add(labels.selected, 'labels.selected'); add(labels.story, 'labels.story'); add(labels.loves, 'labels.loves');
  add(labels.architecture, 'labels.architecture'); add(labels.conceptAnalysis, 'labels.conceptAnalysis');
  add(labels.nav.about, 'labels.nav.about'); add(labels.nav.play, 'labels.nav.play'); add(labels.nav.resume, 'labels.nav.resume');
  add(emailAddress, 'links.email (address)');
  return out;
}

const corpusCache = new Map<Src, CorpusEntry[]>();
export function corpus(src: Src): CorpusEntry[] {
  let c = corpusCache.get(src);
  if (!c) {
    c = src === 'site' ? siteCorpus() : caseCorpus(caseBySlug(src));
    corpusCache.set(src, c);
  }
  return c;
}

/** Is `r.text` an exact substring of one of the declared source's normalised strings? */
export function isVerbatim(r: VerbatimRef): boolean {
  const needle = normalize(r.text);
  if (!needle) return false;
  return corpus(r.src).some((e) => e.text.includes(needle));
}

// ─────────────────────────── page corpora for tests/dist/verbatim.test.ts ───────────────────────────
export type PageKey = 'index' | 'about' | 'fun' | '404' | CaseSlug;
export const PAGE_FILES: Record<PageKey, string> = {
  index: 'index.html', about: 'about.html', fun: 'fun.html', '404': '404.html',
  cloudflare: 'cloudflare.html', pff: 'pff.html', csbs: 'csbs.html', 'u-up': 'u-up.html', orbit: 'orbit.html', educademy: 'educademy.html',
};

const siteField = (prefix: string) => siteCorpus().filter((e) => e.field.startsWith(`site/${prefix}`));

/** (b) No omission: every one of these strings must be inside some [data-v] element of the page. */
export function pageRequired(page: PageKey): CorpusEntry[] {
  const common = (heading: 'connect' | 'closing') => [...siteField(`home.${heading}`), ...siteField('home.copyright')];
  switch (page) {
    case 'index':
      return [...siteField('home.headline'), ...siteField('home.sub'), ...siteField('labels.selected'), ...siteField('selected['), ...common('connect')];
    case 'about':
      return [...siteField('about.'), ...siteField('labels.story'), ...siteField('labels.loves'), ...siteField('labels.architecture'), ...common('connect')];
    case 'fun':
      return [...siteField('play.'), ...common('connect')];
    case '404':
      return common('connect');
    default:
      return [...caseCorpus(caseBySlug(page), { includeMetaTitle: false }), ...common('closing')];
  }
}

/** (a) No alteration: every [data-v] text segment must be a substring of one of these. */
export function pageAllowed(page: PageKey): CorpusEntry[] {
  const all = [...corpus('site'), ...CASE_SLUGS.flatMap((s) => corpus(s))];
  if (page === 'index' || page === '404' || page === 'about' || page === 'fun') return all;
  const i = CASE_SLUGS.indexOf(page);
  const next = CASE_SLUGS[(i + 1) % CASE_SLUGS.length];
  return [...corpus('site'), ...corpus(page), ...corpus(next)];
}

/** (c) Emphasis she authored: stripped inner text of every <strong>, <mark>, <em> in her HTML. */
export function emphasisTexts(): Record<'strong' | 'mark' | 'em', string[]> {
  const raws = [...corpus('site'), ...CASE_SLUGS.flatMap((s) => corpus(s))].map((e) => e.raw);
  const grab = (tag: string) => {
    const out: string[] = [];
    const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    for (const raw of raws) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(raw))) out.push(stripHtml(m[1]));
    }
    return out;
  };
  return { strong: grab('strong'), mark: grab('mark'), em: grab('em') };
}

// ─────────────────────────── block lookup (anchors for citations) ───────────────────────────
export interface BlockText {
  id: string;           // block root id (ids.ts)
  sectionId: string;
  sectionIndex: number; // 0-based
  sectionLabel: string;
  t: Block['t'];
  text: string;         // all of the block's strings, stripped, joined with ' '
}

/** Every block (and split child) of a case in document order with its stripped text. */
export function blockTexts(cs: CaseStudy): BlockText[] {
  const out: BlockText[] = [];
  cs.sections.forEach((s, si) => {
    s.blocks.forEach((b, i) => {
      const id = blockId(s.id, i);
      out.push({ id, sectionId: s.id, sectionIndex: si, sectionLabel: s.label, t: b.t, text: blockEntries(b, id).map((e) => e.text).join(' ') });
      if (b.t === 'split') {
        (['left', 'right'] as const).forEach((side) =>
          b[side].forEach((c, j) => {
            const cid = splitChildId(id, side === 'left' ? 'l' : 'r', j);
            out.push({ id: cid, sectionId: s.id, sectionIndex: si, sectionLabel: s.label, t: c.t, text: blockEntries(c, cid).map((e) => e.text).join(' ') });
          }),
        );
      }
    });
  });
  return out;
}

/** First block, in order, whose stripped text contains `text` (split parents are skipped in favour of their child). */
export function findBlock(cs: CaseStudy, text: string): BlockText | undefined {
  const needle = normalize(text);
  return blockTexts(cs).find((b) => b.t !== 'split' && b.text.includes(needle));
}
