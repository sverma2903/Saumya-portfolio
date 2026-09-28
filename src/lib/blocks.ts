import dims from '../data/dims.json';

const D = dims as Record<string, [number, number]>;

/** Large videos that exceed Cloudflare's per-file asset limit are served from their original CDN. */
const REMOTE: Record<string, string> = {
  '6GwunOSeX0YVHJspIvJG7W3Q.mp4': 'https://framerusercontent.com/assets/6GwunOSeX0YVHJspIvJG7W3Q.mp4',
};

export const media = (file: string) => REMOTE[file] ?? `/media/${file}`;

export interface Media {
  src: string;
  w: number;
  h: number;
  kind: 'image' | 'video';
}

export const m = (file: string): Media => {
  const [w, h] = D[file] ?? [1600, 1000];
  return { src: media(file), w, h, kind: file.endsWith('.mp4') ? 'video' : 'image' };
};

type Html = string;

export type Block =
  | { t: 'h'; text: string }
  | { t: 'h3'; html: Html }
  | { t: 'lede'; html: Html; size?: 'sm' | 'md' | 'lg' }
  | { t: 'p'; html: Html; size?: 'sm' | 'md' }
  | { t: 'small'; html: Html }
  | { t: 'list'; items: Html[]; numbered?: boolean }
  | { t: 'media'; items: Media[]; cols?: number; caption?: Html; frame?: 'soft' | 'bare'; wide?: boolean; zoom?: boolean }
  | { t: 'stats'; items: { v: string; html: Html }[] }
  | { t: 'cta'; items: { label: string; href: string }[] }
  | { t: 'callout'; title: string; lede: Html; html: Html }
  | { t: 'cards'; items: { img?: Media; kicker?: string; title: Html; html?: Html }[]; cols?: number; variant?: 'icon' | 'plain' | 'numbered' }
  | { t: 'feature'; kicker?: string; title?: Html; lede?: Html; html?: Html; items?: Html[]; media: Media[]; flip?: boolean; n?: string }
  | { t: 'stories'; items: { title: string; img: Media; rows: [string, string][] }[] }
  | { t: 'timeline'; items: { k: string; v: string }[] }
  | { t: 'insights'; items: { title: Html; sub?: Html; items: Html[]; img?: Media }[] }
  | { t: 'split'; left: Block[]; right: Block[]; ratio?: string }
  | { t: 'tabs'; items: { label: string; media: Media }[] }
  | { t: 'concept'; title: Html; media: Media[]; captions: Html[]; analysis?: Html[] }
  | { t: 'spacer' };

export interface Section {
  id: string;
  label: string;
  blocks: Block[];
}

export interface CaseStudy {
  slug: string;
  eyebrow: string;
  title: string;
  metaTitle: string;
  description: string;
  meta: [string, string][];
  cover: Media[];
  accent: string;
  accentSoft: string;
  /** Background painted behind the cover art (from the original design). */
  coverBg?: string;
  /** Show the cover art uncropped. */
  coverContain?: boolean;
  sections: Section[];
}

// ---------- terse helpers for authoring content ----------
export const h = (text: string): Block => ({ t: 'h', text });
export const h3 = (html: Html): Block => ({ t: 'h3', html });
export const lede = (html: Html, size?: 'sm' | 'md' | 'lg'): Block => ({ t: 'lede', html, size });
export const p = (html: Html, size?: 'sm' | 'md'): Block => ({ t: 'p', html, size });
export const small = (html: Html): Block => ({ t: 'small', html });
export const list = (items: Html[], numbered = false): Block => ({ t: 'list', items, numbered });
export const img = (file: string, opts: { caption?: Html; frame?: 'soft' | 'bare'; wide?: boolean; zoom?: boolean } = {}): Block => ({
  t: 'media',
  items: [m(file)],
  ...opts,
});
export const video = (file: string, opts: { caption?: Html; frame?: 'soft' | 'bare'; wide?: boolean } = {}): Block => ({
  t: 'media',
  items: [m(file)],
  ...opts,
});
export const gallery = (files: string[], opts: { cols?: number; caption?: Html; frame?: 'soft' | 'bare'; wide?: boolean } = {}): Block => ({
  t: 'media',
  items: files.map(m),
  cols: opts.cols ?? files.length,
  ...opts,
});
export const stats = (items: [string, Html][]): Block => ({ t: 'stats', items: items.map(([v, html]) => ({ v, html })) });
export const cta = (label: string, href: string, ...more: [string, string][]): Block => ({
  t: 'cta',
  items: [{ label, href }, ...more.map(([label, href]) => ({ label, href }))],
});
export const callout = (title: string, ledeHtml: Html, html: Html): Block => ({ t: 'callout', title, lede: ledeHtml, html });
export const cards = (
  items: { img?: string; kicker?: string; title: Html; html?: Html }[],
  opts: { cols?: number; variant?: 'icon' | 'plain' | 'numbered' } = {},
): Block => ({ t: 'cards', items: items.map((i) => ({ ...i, img: i.img ? m(i.img) : undefined })), ...opts });
export const feature = (o: {
  kicker?: string;
  title?: Html;
  lede?: Html;
  html?: Html;
  items?: Html[];
  media: string[];
  flip?: boolean;
  n?: string;
}): Block => ({ t: 'feature', ...o, media: o.media.map(m) });
export const stories = (items: { title: string; img: string; rows: [string, string][] }[]): Block => ({
  t: 'stories',
  items: items.map((i) => ({ ...i, img: m(i.img) })),
});
export const timeline = (items: [string, string][]): Block => ({ t: 'timeline', items: items.map(([k, v]) => ({ k, v })) });
export const insights = (items: { title: Html; sub?: Html; items: Html[]; img?: string }[]): Block => ({
  t: 'insights',
  items: items.map((i) => ({ ...i, img: i.img ? m(i.img) : undefined })),
});
export const split = (left: Block[], right: Block[], ratio?: string): Block => ({ t: 'split', left, right, ratio });
export const concept = (title: Html, files: string[], captions: Html[], analysis?: Html[]): Block => ({
  t: 'concept',
  title,
  media: files.map(m),
  captions,
  analysis,
});
export const tabs = (items: [string, string][]): Block => ({ t: 'tabs', items: items.map(([label, file]) => ({ label, media: m(file) })) });
