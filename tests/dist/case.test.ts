/**
 * WP5 · the case template on the built pages (SPEC §5.2, SM4, SM5, §8.6 WP5 acceptance). Proposed for WP7's suite.
 * Header rules (deck, CTA, REV, cover plate + VT name, LCP preload), the Key plan (= keyplan()), the Decision
 * schedule (= decisions.ts, anchors inside the right chapter), the Levels rail, section marks, omit runs, legacy
 * anchors, the match line, and the rhythm constraint (no <script> between two blocks).
 */
import { beforeAll, describe, expect, test } from 'vitest';
import type { HTMLElement } from 'node-html-parser';
import { cases } from '@/content/site';
import { COVERS, deckOf, nextCase, sheetBySlug } from '@/data/sheets';
import { resolveDecisions } from '@/data/decisions';
import { aliasesFor } from '@/data/legacy-anchors';
import { keyplan } from '@/lib/keyplan';
import { reading } from '@/lib/reading';
import { stripHtml } from '@/lib/text';
import { srcOf } from '@/lib/staging';
import type { CaseSlug } from '@/lib/verbatim';
import { distExists, load } from './helpers';

beforeAll(() => {
  if (!distExists()) throw new Error('dist/ is missing — run `npm run build` first.');
});

const text = (el: HTMLElement | null | undefined) => stripHtml(el?.innerHTML ?? '');
/** her text inside an element with its chrome removed (what the verbatim guard reads) */
const hers = (el: HTMLElement) => stripHtml(el.querySelectorAll('[data-v]').map((v) => v.innerHTML).join(' '));

describe.each(cases.map((c) => c.slug as CaseSlug))('%s', (slug) => {
  const cs = cases.find((c) => c.slug === slug)!;
  const r = reading(cs);
  const page = () => load(slug).root;

  test('header: eyebrow, h1, deck rule, primary-CTA rule, REV only for an Update, the cover plate', () => {
    const head = page().querySelector('[data-case-head]')!;
    expect(text(head.querySelector('.case-head__eyebrow'))).toBe(stripHtml(cs.eyebrow));
    expect(text(head.querySelector('h1'))).toBe(stripHtml(cs.title));
    expect(text(head.querySelector('.case-head__deck'))).toBe(deckOf(slug).text);
    const firstCta = cs.sections[0].blocks.find((b) => b.t === 'cta');
    const primary = head.querySelector('.case-head__cta');
    if (firstCta && firstCta.t === 'cta') {
      expect(primary?.getAttribute('href')).toBe(firstCta.items[0].href);
      expect(text(primary)).toBe(firstCta.items[0].label);
      if (firstCta.items[1]) expect(head.querySelector('.case-head__second')?.getAttribute('href')).toBe(firstCta.items[1].href);
    } else expect(primary).toBeNull();
    expect(['csbs', 'orbit', 'educademy'].includes(slug)).toBe(!primary);
    const rev = head.querySelector('.titleblock__rev');
    expect(!!rev).toBe(slug === 'cloudflare');
    if (rev) expect(page().getElementById(rev.getAttribute('href')!.slice(1))?.getAttribute('data-block')).toBe('callout');
    const plate = head.querySelector('.case-head__plate [data-plate]')!;
    expect(plate.getAttribute('style')).toContain(`view-transition-name: plate-${slug}`);
    expect(plate.getAttribute('style')).toContain('aspect-ratio: 1.6');
    const top = COVERS[slug].layers[COVERS[slug].layers.length - 1].file;
    expect(page().querySelector('link[rel=preload][as=image]')?.getAttribute('href')).toBe(srcOf(top));
    expect(text(head.querySelector('.titleblock__sheet'))).toBe(`${sheetBySlug(slug).no} · ${r.levels} levels · ≈ ${r.minutes} min`);
  });

  test('Key plan: one stop per level, exactly keyplan(), a strip segment per level, Go ↓ to each chapter', () => {
    const kp = page().querySelector('[data-keyplan]')!;
    const stops = keyplan(cs);
    const lis = kp.querySelectorAll('[data-kp-stop]');
    expect(lis).toHaveLength(stops.length);
    expect(kp.querySelectorAll('[data-kp-seg]')).toHaveLength(stops.length);
    lis.forEach((li, i) => {
      const line = li.querySelector('.keyplan__line')!;
      const joiner = stops[i].kind === 'parts' ? ' · ' : ' ';
      expect(stripHtml(line.querySelectorAll('[data-v]').map((v) => v.innerHTML).join(joiner)), stops[i].label).toBe(stops[i].plain);
      const go = li.querySelector('a')!;
      expect(go.getAttribute('href')).toBe(`#${cs.sections[i].id}`);
      expect(go.getAttribute('aria-label')).toBe(`Go to ${cs.sections[i].label}`);
    });
    // the last stop spans the empty cells of a short last row in every layout (2, 3 and 4 columns), so the box closes
    const n = stops.length;
    const style = kp.getAttribute('style') ?? '';
    for (const c of [2, 3, 4]) {
      const want = n % c === 0 ? 1 : c - (n % c) + 1;
      expect(style, `--_span${c}`).toContain(`--_span${c}: ${want}`);
    }
    expect(kp.classList.contains('keyplan--wide')).toBe(n > 6);
  });

  test('Decision schedule: every pair verbatim, LEVEL links land inside the right chapter', () => {
    const rows = resolveDecisions(cs);
    const t = page().querySelector('[data-decisions] table')!;
    const trs = t.querySelectorAll('tbody tr');
    expect(trs).toHaveLength(rows.length);
    trs.forEach((tr, i) => {
      expect(text(tr.querySelector('th'))).toBe(`D-${String(i + 1).padStart(2, '0')}`);
      expect(text(tr.querySelector('.decisions__c [data-v]'))).toBe(stripHtml(rows[i].considered));
      expect(text(tr.querySelector('.decisions__d p[data-v]'))).toBe(stripHtml(rows[i].decided));
      expect(tr.querySelectorAll('.decisions__plus li').map((li) => text(li))).toEqual(rows[i].plusItems);
      const a = tr.querySelector('.decisions__lk')!;
      const id = a.getAttribute('href')!.slice(1);
      expect(id).toBe(rows[i].anchor!.id);
      const target = page().getElementById(id);
      expect(target, id).toBeTruthy();
      let el: HTMLElement | null = target;
      while (el && !(el.tagName === 'SECTION' && el.classList.contains('chapter'))) el = el.parentNode as HTMLElement | null;
      expect(el?.getAttribute('id')).toBe(rows[i].anchor!.sectionId);
    });
  });

  test('Levels rail: a nav of floors (her labels, elevations) sized by seconds, with View and the match line', () => {
    const nav = page().querySelector('nav[aria-label="Levels"]')!;
    const floors = nav.querySelectorAll('[data-floor]');
    expect(floors).toHaveLength(r.sections.length);
    floors.forEach((f, i) => {
      const s = r.sections[i];
      expect(f.getAttribute('style')).toBe(`--_s: ${s.sec}`);
      const a = f.querySelector('a')!;
      expect(a.getAttribute('href')).toBe(`#${s.id}`);
      expect(text(a.querySelector('.floor__label'))).toBe(s.label);
      expect(a.getAttribute('data-elev')).toBe(s.elev);
    });
    const rail = page().querySelector('[data-rail]')!;
    expect(rail.querySelectorAll('[data-view-value]')).toHaveLength(2);
    expect(rail.querySelector('[data-rail-match]')?.getAttribute('href')).toBe(`/${nextCase(slug)}`);
  });

  test('chapters: ids, section marks with a focusable h2, legacy anchors inside their chapter, no script between blocks', () => {
    const secs = page().querySelectorAll('main section.chapter');
    expect(secs.map((s) => s.id)).toEqual(cs.sections.map((s) => s.id));
    secs.forEach((sec, i) => {
      const h2 = sec.querySelector(`#${sec.id}-h`)!;
      expect(h2.tagName).toBe('H2');
      expect(h2.getAttribute('tabindex')).toBe('-1');
      expect(text(h2)).toBe(cs.sections[i].label);
      expect(text(sec.querySelector('.section-mark__meta'))).toBe(`Level ${String(i + 1).padStart(2, '0')} · ${r.sections[i].elev} · ≈ ${r.sections[i].minutes} min`);
      for (const alias of aliasesFor(slug, sec.id)) expect(sec.querySelector(`#${alias}`), `${slug}#${alias}`).toBeTruthy();
      // the §6.1 rhythm is sibling-based: nothing but blocks, runs and the mark between blocks
      const kids = sec.childNodes.filter((n) => (n as HTMLElement).tagName) as HTMLElement[];
      expect(kids.filter((k) => k.tagName === 'SCRIPT' || k.tagName === 'STYLE')).toHaveLength(0);
    });
  });

  test('omit runs: a disclosure per run, labelled with its counts, controlling its body', () => {
    for (const run of page().querySelectorAll('[data-omit-run]')) {
      const body = run.querySelector('.omit-run__body')!;
      const btn = run.querySelector('.breakline');
      if (!btn) continue;
      expect(btn.getAttribute('aria-expanded')).toBe('false');
      expect(btn.getAttribute('aria-controls')).toBe(body.id);
      expect(text(btn.querySelector('.breakline__label'))).toMatch(/^Omitted: \d+ /);
      expect(run.childNodes.filter((n) => (n as HTMLElement).tagName)[0]).toBe(btn);
    }
  });

  test('match line: the next case (cycling), its plate carrying plate-<next>', () => {
    const next = nextCase(slug);
    const ml = page().querySelector('[data-matchline]')!;
    const card = ml.querySelector('[data-matchline-card]')!;
    expect(card.querySelectorAll('a').map((a) => a.getAttribute('href'))).toEqual([`/${next}`]);
    expect(card.querySelector('[data-plate]')?.getAttribute('style')).toContain(`view-transition-name: plate-${next}`);
    expect(hers(card)).toContain(stripHtml(sheetBySlug(next).title.text));
  });
});

test('cycling: cloudflare → pff → csbs → u-up → orbit → educademy → cloudflare', () => {
  expect(cases.map((c) => nextCase(c.slug as CaseSlug))).toEqual(['pff', 'csbs', 'u-up', 'orbit', 'educademy', 'cloudflare']);
});
