/**
 * sheets.ts · P0 (shared). The drawing set: every sheet, its index row (SM2), its cover plate (§6.4),
 * its per-case accents (§2.3) and the Key-plan overrides (SM5a).
 *
 * EVERY string we select from her text is a VerbatimRef and is test-enforced to be an exact substring of its
 * declared source (tests/data/substrings.test.ts). Typographic splits (readout `value` + `label` with
 * `joined: true`) must also concatenate back to a verbatim substring. Group titles "Further projects",
 * "Also in the set" and the derived domains are chrome.
 */
import { cases, labels, links, play, selected } from '../content/site';
import { m, type Media } from '../lib/blocks';
import { ref, type CaseSlug, type VerbatimRef } from '../lib/verbatim';

export type SheetNo = 'A-000' | 'A-101' | 'A-102' | 'A-103' | 'A-104' | 'A-105' | 'A-106' | 'B-100' | 'C-100';
export type SheetGroup = 'selected' | 'further' | 'also';

export interface PlateLayer {
  file: string;
  /** 'contain' (default) or 'fill' (only when the layer's native aspect equals the box aspect) */
  fit?: 'contain' | 'fill';
  /** % inset for a contained layer (stage margin) */
  pad?: number;
}
export interface CoverPlate {
  layers: PlateLayer[];   // bottom → top
  stage: string;          // CSS background (her stage, exact)
  aspect: number;         // box w/h — 16/10 everywhere (case header, Viewport, card, match line)
}

export interface Accent {
  acc: string;            // text-safe on paper
  accMark: string;        // non-text marks (fills, ticks)
  accSoft: string;
  accDusk: string;        // text-safe on the Dusk grounds (≥ 5:1 on #2E2522, ≥ 5.5:1 on #1D1614); also Dusk's marks
  stage: string;          // her stage (never recoloured)
}

/** A readout figure: `value` (big numeral) + `label`, each verbatim. `joined` = value+label is ALSO one verbatim run. */
export interface ReadoutLine {
  value: VerbatimRef;
  label: VerbatimRef;
  joined?: boolean;
}
export interface Readout {
  lines: ReadoutLine[];                      // 1 or 2
  sub?: VerbatimRef;                         // a verbatim sub-line
  bars?: { from: VerbatimRef; to: VerbatimRef; caption: VerbatimRef; ratio: [number, number] };  // PFF 15 : 6
  cited: string[];                           // chrome "Cited from" parts, e.g. ['Home card', 'A-101 Overview', 'Update']
}

export interface Sheet {
  no: SheetNo | '↗';
  kind: 'case' | 'about' | 'play' | 'external';
  group: SheetGroup;
  slug?: CaseSlug;          // cases only
  href: string;
  external?: boolean;
  title: VerbatimRef;       // her title for the row
  line: VerbatimRef | null; // her outcome line (italic); null for external rows (they show `domain`)
  domain?: string;          // derived domain for external rows (chrome, mono)
  tags: VerbatimRef[];      // her role and date tags
  readout?: Readout;
  plate?: CoverPlate;       // 16:10 cover plate (cases) or the Viewport plate (B-100, C-100)
  accent?: Accent;
  /**
   * Her original HOME CARD imagery (site.ts `selected`): card cover, company logo and card tone. The spec's index
   * does not place these (the plates come from COVERS so the VT morph matches the case header); they are kept here so
   * WP3/owner can decide (4 logos + the PFF composite are otherwise unreferenced — see P0-NOTES).
   */
  card?: { cover: string; logo: string; tone: string };
}

const A16x10 = 16 / 10;

export const STAGES = {
  cloudflare: 'linear-gradient(180deg, #fdc07c 0%, #ffa07d 100%)',
  pff: 'linear-gradient(160deg, #c0d4ce 0%, #cad7cc 55%, #d7dac9 100%)', // CSS equivalent of her flat-gradient bitmap GhlckHHG…png (owner note §8.9)
  csbs: '#4878aa',                                                       // flat: the GIF edge is flat, a gradient shows a seam
  'u-up': 'linear-gradient(180deg, #61324e 0%, #3c2841 100%)',
  orbit: '#a26666',                                                      // + her backdrop bitmap T8tenC… as the plate's bottom layer
  educademy: '#bbb3fa',                                                  // fixes the #4c6971 extraction bug
  about: 'var(--paper-2)',
  play: 'linear-gradient(#fdd0a4 0%, #dccfff 100%)',                    // Conversense stage (her play.items[0].tone)
} as const;

export const ACCENTS: Record<CaseSlug, Accent> = {
  cloudflare: { acc: '#A3420B', accMark: '#E4691E', accSoft: '#FCE3CF', accDusk: '#F17129', stage: STAGES.cloudflare },
  pff: { acc: '#2F6E62', accMark: '#2F6E62', accSoft: '#D6E6DF', accDusk: '#47A593', stage: STAGES.pff },
  csbs: { acc: '#2F5F93', accMark: '#3F6FA3', accSoft: '#DCE6F1', accDusk: '#689ACF', stage: STAGES.csbs },
  'u-up': { acc: '#8A3F72', accMark: '#8A3F72', accSoft: '#EEDDE8', accDusk: '#C57FAE', stage: STAGES['u-up'] },
  orbit: { acc: '#8C3F3F', accMark: '#A36667', accSoft: '#F0DEDC', accDusk: '#C88585', stage: STAGES.orbit },
  educademy: { acc: '#5B45C9', accMark: '#6A55D8', accSoft: '#E6E1FA', accDusk: '#9A8CDE', stage: STAGES.educademy },
};

/**
 * Inline style for <html> on case pages: `--acc-l:…; --acc-mark-l:…; --acc-soft-l:…; --acc-d:…; --stage:…`.
 * Theme-neutral inputs only: an inline style beats `:root[data-theme=dusk]`, so tokens.css resolves
 * `--acc`/`--acc-mark`/`--acc-soft` from the -l (Vellum) or -d (Dusk) values. Components read only --acc*.
 */
export function accentStyle(slug: CaseSlug): string {
  const a = ACCENTS[slug];
  return `--acc-l: ${a.acc}; --acc-mark-l: ${a.accMark}; --acc-soft-l: ${a.accSoft}; --acc-d: ${a.accDusk}; --stage: ${a.stage}`;
}

export const COVERS: Record<CaseSlug, CoverPlate> = {
  cloudflare: { layers: [{ file: 'ynF3JX3AYbXmF5u4ZKwl04aGc.png', pad: 8 }], stage: STAGES.cloudflare, aspect: A16x10 },
  pff: { layers: [{ file: 'NfispiNGsXrWqGyPllkA6wjliKo.png', pad: 6 }], stage: STAGES.pff, aspect: A16x10 },
  csbs: { layers: [{ file: 'hc5LSNViBiB98sAACx272BNZYw.gif', pad: 0 }], stage: STAGES.csbs, aspect: A16x10 },
  'u-up': { layers: [{ file: 'y8vKVnSvce5bLvmSJjZXBbMPNWU.png', pad: 7 }], stage: STAGES['u-up'], aspect: A16x10 },
  orbit: {
    layers: [
      { file: 'T8tenCXKluVSCNxnIJ2yBvycmw.jpg', pad: 0 },   // backdrop, contained at full width (letterbox is seamless on #a26666)
      { file: 'IJYwPa4qI0oYO2wGbVxyxwzlZOM.png', pad: 9 },  // laptop
    ],
    stage: STAGES.orbit,
    aspect: A16x10,
  },
  educademy: { layers: [{ file: 'J07qObGcr5c64oNlhZc7sblQE.png', pad: 6 }], stage: STAGES.educademy, aspect: A16x10 },
};

/** A cover plate's layers as Media objects (with their per-layer pad/fit) for <Plate layers=…>. */
export function plateLayers(p: CoverPlate): (Media & { pad?: number; fit?: 'contain' | 'fill' })[] {
  return p.layers.map((l) => ({ ...m(l.file), pad: l.pad, fit: l.fit }));
}

export const SHEET_NO: Record<CaseSlug, SheetNo> = {
  cloudflare: 'A-101', pff: 'A-102', csbs: 'A-103', 'u-up': 'A-104', orbit: 'A-105', educademy: 'A-106',
};

const sel = (i: number) => selected[i];
const card = (i: number) => ({ cover: selected[i].cover.src.split('/').pop()!, logo: selected[i].logo.src.split('/').pop()!, tone: selected[i].tone });

export const sheets: Sheet[] = [
  {
    no: 'A-101', kind: 'case', group: 'selected', slug: 'cloudflare', href: '/cloudflare',
    title: ref('site', sel(0).title, 'selected[0].title'),
    line: ref('site', sel(0).text, 'selected[0].text'),
    tags: sel(0).tags.map((t, j) => ref('site', t, `selected[0].tags[${j}]`)),
    readout: {
      lines: [{ value: ref('site', 'Two', 'selected[0].text'), label: ref('site', ' of the gaps identified have since been shipped independently.', 'selected[0].text'), joined: true }],
      sub: ref('cloudflare', 'Cloudflare has since introduced bulk emptying and folder deletion.', 'overview › callout "Update"'),
      cited: ['Home card', 'A-101 Overview', 'Update'],
    },
    plate: COVERS.cloudflare, accent: ACCENTS.cloudflare, card: card(0),
  },
  {
    no: 'A-102', kind: 'case', group: 'selected', slug: 'pff', href: '/pff',
    title: ref('site', sel(1).title, 'selected[1].title'),
    line: ref('site', sel(1).text, 'selected[1].text'),
    tags: sel(1).tags.map((t, j) => ref('site', t, `selected[1].tags[${j}]`)),
    readout: {
      lines: [{ value: ref('pff', '~60%', 'overview › Results › stats[0].v'), label: ref('pff', 'reduction in time spent creating a mission assignment', 'overview › Results › stats[0].html') }],
      bars: {
        from: ref('pff', '15 minutes', 'overview › Results › stats[0].html'),
        to: ref('pff', '~6 minutes', 'overview › Results › stats[0].html'),
        caption: ref('pff', '15 minutes → ~6 minutes', 'overview › Results › stats[0].html'),
        ratio: [15, 6],
      },
      cited: ['A-102', 'Overview', 'Results'],
    },
    plate: COVERS.pff, accent: ACCENTS.pff, card: card(1),
  },
  {
    no: 'A-103', kind: 'case', group: 'selected', slug: 'csbs', href: '/csbs',
    title: ref('site', sel(2).title, 'selected[2].title'),
    line: ref('site', sel(2).text, 'selected[2].text'),
    tags: sel(2).tags.map((t, j) => ref('site', t, `selected[2].tags[${j}]`)),
    readout: {
      lines: [
        { value: ref('csbs', '50%', 'reflection › Impact Stats › stats[0].v'), label: ref('csbs', 'reduction in navigation time across 10 common searches', 'reflection › Impact Stats › stats[0].html') },
        { value: ref('csbs', '~ 600 K', 'reflection › Impact Stats › stats[1].v'), label: ref('csbs', 'industry users impacted (state and federal Resource Center)', 'reflection › Impact Stats › stats[1].html') },
      ],
      cited: ['A-103', 'Reflection', 'Impact Stats'],
    },
    plate: COVERS.csbs, accent: ACCENTS.csbs, card: card(2),
  },
  {
    no: 'A-104', kind: 'case', group: 'selected', slug: 'u-up', href: '/u-up',
    title: ref('site', sel(3).title, 'selected[3].title'),
    line: ref('site', sel(3).text, 'selected[3].text'),
    tags: sel(3).tags.map((t, j) => ref('site', t, `selected[3].tags[${j}]`)),
    readout: {
      lines: [{ value: ref('site', '1st', 'selected[3].text'), label: ref('site', ' Place + Social Innovation Prize at XHacks by Carnegie Mellon University', 'selected[3].text'), joined: true }],
      cited: ['Home card'],
    },
    plate: COVERS['u-up'], accent: ACCENTS['u-up'], card: card(3),
  },
  {
    no: 'A-105', kind: 'case', group: 'further', slug: 'orbit', href: '/orbit',
    title: ref('site', play.items[3].title, 'play.items[3].title'),
    line: ref('orbit', 'We designed a web-based tool that helps faculty track their workload, understand when to say yes to new commitments, and better balance teaching, service, and research.', 'overview › Design Solution › p'),
    tags: [ref('orbit', 'UX Research X UMD', 'meta Context'), ref('orbit', 'MAR 2025 - JUN 2025', 'meta Timeline')],
    readout: {
      lines: [
        { value: ref('orbit', '8', 'empathize › Methods › stats[0].v'), label: ref('orbit', 'in-depth faculty interviews', 'empathize › Methods › stats[0].html') },
        { value: ref('orbit', '5', 'empathize › Methods › stats[1].v'), label: ref('orbit', 'participatory design sessions', 'empathize › Methods › stats[1].html') },
      ],
      cited: ['A-105', 'Empathize', 'Methods'],
    },
    plate: COVERS.orbit, accent: ACCENTS.orbit,
  },
  {
    no: 'A-106', kind: 'case', group: 'further', slug: 'educademy', href: '/educademy',
    title: ref('site', play.items[4].title, 'play.items[4].title'),
    line: ref('educademy', 'The COVID-19 pandemic disrupted traditional schooling in India, revealing a lack of structured tools to support digital learning.', 'overview › Problem › lede'),
    tags: [ref('educademy', 'Education X Personal Project', 'meta Context'), ref('educademy', 'AUG 2023', 'meta Timeline')],
    readout: {
      lines: [{ value: ref('educademy', '~ 320 M', 'overview › Problem › stats[0].v'), label: ref('educademy', 'learners and students in India adversely affected by the pandemic', 'overview › Problem › stats[0].html') }],
      cited: ['A-106', 'Overview', 'Problem'],
    },
    plate: COVERS.educademy, accent: ACCENTS.educademy,
  },
  {
    no: 'B-100', kind: 'about', group: 'also', href: '/about',
    title: ref('site', labels.nav.about, 'labels.nav.about'),
    line: ref('site', 'I blend business thinking, psychology, and systems design to create experiences that move metrics.', 'about.headline'),
    tags: [],
    plate: { layers: [{ file: 'AIv5iYq94P5wgTfviYYCQf5ATw.png', pad: 6 }], stage: STAGES.about, aspect: A16x10 },
  },
  {
    no: 'C-100', kind: 'play', group: 'also', href: '/fun',
    title: ref('site', labels.nav.play, 'labels.nav.play'),
    line: ref('site', "Hackathons & side quests that didn't make the case study cut", 'play.headline'),
    tags: [],
    plate: { layers: [{ file: 'GHjG21Lo2f64p4k0y3obKTFGgck.mp4', pad: 6 }], stage: STAGES.play, aspect: A16x10 },
  },
  {
    no: '↗', kind: 'external', group: 'also', href: links.architecture, external: true,
    title: ref('site', labels.architecture, 'labels.architecture'), line: null, domain: 'issuu.com', tags: [],
  },
  {
    no: '↗', kind: 'external', group: 'also', href: links.resume, external: true,
    title: ref('site', labels.nav.resume, 'labels.nav.resume'), line: null, domain: 'drive.google.com', tags: [],
  },
];

export const caseSheets = sheets.filter((s): s is Sheet & { slug: CaseSlug } => s.kind === 'case');

export function sheetBySlug(slug: string): Sheet & { slug: CaseSlug } {
  const s = caseSheets.find((x) => x.slug === slug);
  if (!s) throw new Error(`No sheet for ${slug}`);
  return s;
}

/** Index line used as the deck/meta description for orbit and educademy (their `description` is a context tag). */
export const DECK_FROM_INDEX: CaseSlug[] = ['orbit', 'educademy'];
export function deckOf(slug: CaseSlug): { text: string; fromIndex: boolean } {
  const cs = cases.find((c) => c.slug === slug)!;
  if (DECK_FROM_INDEX.includes(slug)) return { text: sheetBySlug(slug).line!.text, fromIndex: true };
  return { text: cs.description, fromIndex: false };
}

/** The next sheet after a case (cases order in site.ts, cycling). */
export function nextCase(slug: CaseSlug): CaseSlug {
  const order = cases.map((c) => c.slug as CaseSlug);
  return order[(order.indexOf(slug) + 1) % order.length];
}

// ─────────────── Key plan overrides (SM5a ⊕). Each must be an exact substring of that section. ───────────────
export type KeyplanOverride = { text: VerbatimRef } | { stat: { v: VerbatimRef; html: VerbatimRef } };

export const keyplanOverrides: Record<string, KeyplanOverride> = {
  'pff.overview': { text: ref('pff', 'For their emergency management clients, we redesigned InCEP, a legacy budget planning platform, into Treasora, an AI-assisted system that streamlines how mission assignments, cost estimates, and transactions move through a multi-role approval chain.', 'overview › At a Glance › p') },
  'csbs.overview': { text: ref('csbs', 'In 2023, the call center received 320,000 calls from MLOs struggling to complete their licenses, with an average cost of $9.70 per call.', 'overview › Problem › p') },
  'csbs.define': { text: ref('csbs', 'From there, I extracted user pain points and identified over 25 issues that directly informed six journey maps.', 'define › Affinity Mapping and Synthesis › p') },
  'csbs.reflection': { stat: { v: ref('csbs', '50%', 'reflection › Impact Stats › stats[0].v'), html: ref('csbs', 'reduction in navigation time across 10 common searches', 'reflection › Impact Stats › stats[0].html') } },
  'u-up.reflection': { text: ref('u-up', 'Problem framing and ethics matter as much as features.', 'reflection › list[0]') },
  'orbit.define': { text: ref('orbit', 'The Wall Walk generated a wealth of innovative ideas that guided our visioning session.', 'define › Walk Walk › p') },
};

/** Every VerbatimRef in this file (for the substrings test and the owner review list). */
export function sheetRefs(): { where: string; ref: VerbatimRef; joinedWith?: VerbatimRef }[] {
  const out: { where: string; ref: VerbatimRef; joinedWith?: VerbatimRef }[] = [];
  for (const s of sheets) {
    const w = `${s.no} ${s.title.text}`;
    out.push({ where: `${w} · title`, ref: s.title });
    if (s.line) out.push({ where: `${w} · line`, ref: s.line });
    s.tags.forEach((t, i) => out.push({ where: `${w} · tags[${i}]`, ref: t }));
    s.readout?.lines.forEach((l, i) => {
      out.push({ where: `${w} · readout[${i}].value`, ref: l.value, joinedWith: l.joined ? l.label : undefined });
      out.push({ where: `${w} · readout[${i}].label`, ref: l.label });
    });
    if (s.readout?.sub) out.push({ where: `${w} · readout.sub`, ref: s.readout.sub });
    if (s.readout?.bars) {
      const b = s.readout.bars;
      out.push({ where: `${w} · bars.from`, ref: b.from }, { where: `${w} · bars.to`, ref: b.to }, { where: `${w} · bars.caption`, ref: b.caption });
    }
  }
  for (const [k, o] of Object.entries(keyplanOverrides)) {
    if ('text' in o) out.push({ where: `keyplan ${k}`, ref: o.text });
    else out.push({ where: `keyplan ${k} v`, ref: o.stat.v }, { where: `keyplan ${k} html`, ref: o.stat.html });
  }
  return out;
}
