#!/usr/bin/env node
/**
 * tools/chapter-heights.mjs · polish r1 (perf). Measures every case chapter's rendered height and writes
 * src/data/chapter-heights.json, which Chapter.astro turns into its `contain-intrinsic-size` (the placeholder height
 * an off-screen, content-visibility:auto chapter has until it is first rendered).
 *
 *   node tools/chapter-heights.mjs            measure (needs a build: npm run build), then rebuild to use the table
 *   node tools/chapter-heights.mjs --check    measure and compare only: exit 1 when a chapter's placeholder is off by
 *                                             more than 20 % (run it after a content or layout change; QA checklist)
 *
 * Why: one flat 1400px placeholder made a first visit's document less than half its real height (/cloudflare: 12,517
 * vs 25,062px at 1440) — the scrollbar, End, drag-scrolling and scroll restoration all worked from the estimate, and the
 * page grew under the reader as chapters rendered. `auto` stays in front of the value, so once a chapter has rendered
 * the browser remembers its real size; the table only has to be right for the first visit.
 * Measured with JavaScript on (the Highlights tabs, walkthrough stages and strips are laid out as readers get them), all
 * media boxes sized from their width/height attributes (no file needs to load), fonts loaded, content-visibility
 * forced visible, at one width per chapter-grid range (≥ 1280, 1024–1279, 768–1023, < 768) and in both views
 * (Full story, and Skim: html[data-view=plan]).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { browser, closeBrowser, withServer } from './shoot.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src', 'data', 'chapter-heights.json');
const CASES = ['cloudflare', 'pff', 'csbs', 'u-up', 'orbit', 'educademy'];
/** [key, width, height]: one representative width per chapter-grid range (Chapter.astro's media queries) */
const WIDTHS = [['xl', 1440, 900], ['l', 1100, 800], ['m', 834, 1112], ['s', 390, 844]];
const VIEWS = ['section', 'plan'];
const check = process.argv.includes('--check');

const table = {};
await withServer(async (base) => {
  const b = await browser();
  for (const [key, w, h] of WIDTHS) {
    for (const view of VIEWS) {
      const mobile = w < 768;
      const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
      await ctx.addInitScript((v) => { try { localStorage.setItem('sv:view', v); } catch {} }, view);
      const p = await ctx.newPage();
      for (const slug of CASES) {
        await p.goto(`${base}/${slug}`, { waitUntil: 'load' });
        await p.evaluate(() => document.fonts.ready);
        await p.addStyleTag({ content: '.chapter { content-visibility: visible !important; }' });
        await p.waitForTimeout(300);
        const hs = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('section.chapter[id]')]
          .map((s) => [s.id, Math.round(s.getBoundingClientRect().height)])));
        for (const [id, px] of Object.entries(hs)) ((table[slug] ??= {})[id] ??= {})[`${view === 'plan' ? 'p' : ''}${key}`] = px;
      }
      await ctx.close();
    }
  }
});
await closeBrowser();

if (check) {
  const old = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const off = [];
  for (const [slug, chs] of Object.entries(table)) for (const [id, v] of Object.entries(chs)) for (const [k, px] of Object.entries(v)) {
    const was = old[slug]?.[id]?.[k];
    if (!was || Math.abs(was - px) / px > 0.2) off.push(`${slug}#${id} ${k}: table ${was ?? '—'} · measured ${px}`);
  }
  console.log(off.length ? `${off.length} placeholder(s) off by > 20 %:\n  ${off.join('\n  ')}\nrun node tools/chapter-heights.mjs, then rebuild` : 'chapter heights: table matches (±20 %)');
  process.exit(off.length ? 1 : 0);
}
fs.writeFileSync(OUT, `${JSON.stringify({ _about: 'Measured by tools/chapter-heights.mjs: each case chapter\'s rendered height in CSS px at 1440 (xl), 1100 (l), 834 (m), 390 (s) wide; p* = Skim (plan view). Chapter.astro → contain-intrinsic-size.', ...table }, null, 1)}\n`);
console.log(`wrote ${path.relative(ROOT, OUT)}: ${Object.values(table).reduce((n, c) => n + Object.keys(c).length, 0)} chapters`);
