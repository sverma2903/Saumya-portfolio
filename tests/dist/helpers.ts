/**
 * Shared helpers for tests/dist/* (run after `astro build`). P0 skeleton → WP7 owns.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse, type HTMLElement } from 'node-html-parser';
import { stripHtml } from '@/lib/text';
import { PAGE_FILES, type PageKey } from '@/lib/verbatim';

export const DIST = path.resolve('dist');
export const PAGES = Object.keys(PAGE_FILES) as PageKey[];

export function distExists(): boolean {
  return fs.existsSync(path.join(DIST, 'index.html'));
}

const cache = new Map<PageKey, { raw: string; root: HTMLElement }>();
export function load(page: PageKey): { raw: string; root: HTMLElement } {
  let hit = cache.get(page);
  if (!hit) {
    const raw = fs.readFileSync(path.join(DIST, PAGE_FILES[page]), 'utf8');
    hit = { raw, root: parse(raw, { comment: false, blockTextElements: { script: true, style: true, noscript: true } }) };
    cache.set(page, hit);
  }
  return hit;
}

export const SEP = '\u0001';

/**
 * Normalised text of a [data-v] element with its [data-chrome] descendants removed (SPEC §8.5 a).
 * Chrome is removed with no separator, so the whole remaining text is checked as one string.
 * The one exception is a skim joiner (`[data-chrome][data-join]`, the ' ⋯ ' between kept pieces): with
 * `separate: true` it becomes a boundary, and the caller must find all pieces in ONE corpus string, in order.
 */
export function verbatimText(el: HTMLElement, separate: boolean): string[] {
  const sub = parse(el.outerHTML, { comment: false });
  const self = sub.firstChild as HTMLElement;
  for (const c of self.querySelectorAll('[data-chrome]')) c.replaceWith(separate && c.hasAttribute('data-join') ? SEP : '');
  const text = stripHtml(self.innerHTML);
  return separate ? text.split(SEP).map((s) => s.trim()).filter(Boolean) : [text];
}

/** True when every piece occurs in `corpus` in order, without overlap (one piece = plain substring). */
export function inOrder(corpus: string, pieces: string[]): boolean {
  let at = 0;
  for (const p of pieces) {
    const i = corpus.indexOf(p, at);
    if (i < 0) return false;
    at = i + p.length;
  }
  return true;
}

/** fidelity.py's page text: script/style removed, <br> and every tag → space, entities decoded, collapsed. */
export function fidelityText(raw: string): string {
  const noScripts = raw.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ');
  return stripHtml(noScripts.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' '));
}
