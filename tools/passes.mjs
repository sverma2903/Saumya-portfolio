#!/usr/bin/env node
/**
 * tools/passes.mjs · WP7 (SPEC §8.6 WP7 manual passes, the scriptable part). Three layout passes over every route:
 *
 *   node tools/passes.mjs [--routes=/,/csbs] [--base=URL]
 *
 *  1. reflow (WCAG 1.4.10 / 1.4.4): at 320 × 640 and at 640 × 360 (a 1280 × 720 window at 200 % zoom), Section and
 *     Plan: the page never scrolls sideways, and nothing sticks out of the viewport outside a scroller the reader can
 *     pan (strips, the concept rows);
 *  2. figures have a size: every plate at 320, 390, 600, 767, 1024 and 1440 px, with JavaScript on and off, is larger
 *     than 0 × 0 unless an ancestor hides it on purpose (display: none — an inactive tab, a Plan-view omission).
 *     (It caught CSBS's two edge-cropped screens collapsing to nothing below 768 px.) Chapters are all rendered for it;
 *  3. no JavaScript: after scrolling the page (native lazy loading only), every figure and plate in <main> shows
 *     loaded media — except the home Viewport's plates (the index text carries them; JS projects them) and GIFs in
 *     index cards (a card is a link with no pause control, so its GIF stays a file-facts drawing by design).
 * Exit 1 on any failure.
 */
import { browser, closeBrowser, ROUTES, withServer } from './shoot.mjs';

const argv = process.argv.slice(2);
const kv = Object.fromEntries(argv.filter((a) => a.startsWith('--') && a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(2, i), a.slice(i + 1)]; }));
const routes = kv.routes ? kv.routes.split(',') : ROUTES;
const CASES = new Set(['/cloudflare', '/pff', '/csbs', '/u-up', '/orbit', '/educademy']);
let failures = 0;
const fail = (msg) => { failures++; console.log(`  ✗ ${msg}`); };

async function page(base, route, { w, h, dpr = 1, js = true, view = 'section' }) {
  const b = await browser();
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, javaScriptEnabled: js, reducedMotion: 'reduce' });
  await ctx.addInitScript((v) => { try { localStorage.setItem('sv:view', v); localStorage.setItem('sv:motion', 'reduce'); } catch {} }, view);
  const pg = await ctx.newPage();
  await pg.goto(base + route, { waitUntil: 'load', timeout: 90_000 });
  return { ctx, pg };
}

await withServer(async (base) => {
  console.log('1 · reflow at 320 px and at 200 % zoom');
  for (const [w, h, dpr] of [[320, 640, 1], [640, 360, 2]]) for (const route of routes) for (const view of CASES.has(route) ? ['section', 'plan'] : ['section']) {
    const { ctx, pg } = await page(base, route, { w, h, dpr, view });
    await pg.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 25)); } scrollTo(0, 0); });
    const r = await pg.evaluate(() => {
      const de = document.documentElement, W = de.clientWidth;
      const inScroller = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX)) return true; return false; };
      // a drawing's own strokes may bleed past its edge (the site plan): an SVG is judged by its box, not its contents
      const out = [...document.querySelectorAll('body *')].filter((el) => { if (el.ownerSVGElement) return false; const rc = el.getBoundingClientRect(); return rc.width && rc.height && (rc.right > W + 1 || rc.left < -1) && !inScroller(el); })
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className?.baseVal ?? el.className).split(' ')[0]}`);
      return { sw: de.scrollWidth, W, out };
    });
    if (r.sw > r.W) fail(`${route} ${view} ${w}×${h}${dpr > 1 ? ' (200 %)' : ''}: scrolls sideways (${r.sw} > ${r.W})`);
    else if (r.out.length) fail(`${route} ${view} ${w}×${h}: outside the viewport: ${r.out.slice(0, 4).join(', ')}`);
    await ctx.close();
  }

  console.log('2 · every plate has a size (JS on and off)');
  for (const js of [true, false]) for (const w of [320, 390, 600, 767, 1024, 1440]) for (const route of routes) {
    const { ctx, pg } = await page(base, route, { w, h: 900, js });
    await pg.waitForTimeout(250);
    const zero = await pg.evaluate(() => {
      document.documentElement.dataset.landing = '';
      return [...document.querySelectorAll('main .plate')].filter((p) => {
        if (p.closest('dialog, [hidden], template, noscript')) return false;
        for (let e = p; e; e = e.parentElement) if (getComputedStyle(e).display === 'none') return false;
        const rc = p.getBoundingClientRect();
        return rc.width < 2 || rc.height < 2;
      }).map((p) => p.dataset.file ?? p.className.split(' ')[0]);
    });
    for (const z of zero) fail(`${route} @${w} JS ${js ? 'on' : 'off'}: plate ${z} is 0 × 0`);
    await ctx.close();
  }

  console.log('3 · no JavaScript: every figure shows its media');
  for (const w of [1440, 390]) for (const route of routes) {
    const { ctx, pg } = await page(base, route, { w, h: 900, js: false });
    const H = await pg.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += 700) { await pg.mouse.wheel(0, 700); await pg.waitForTimeout(100); }
    await pg.waitForTimeout(1200);
    const missing = await pg.evaluate(() => {
      const vis = (el) => { const rc = el.getBoundingClientRect(), cs = getComputedStyle(el); return rc.width > 1 && rc.height > 1 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
      return [...document.querySelectorAll('main figure, main .plate')].filter((f) => {
        if (!vis(f) || f.closest('[hidden]')) return false;
        const media = [...f.querySelectorAll('img, video, svg')].filter(vis);
        return !media.some((m) => m.tagName !== 'IMG' || (m.complete && m.naturalWidth > 0));
      }).map((f) => f.querySelector('[data-file]')?.dataset.file ?? f.dataset.file ?? f.className.split(' ')[0]);
    });
    for (const m of missing) fail(`${route} @${w} without JS: figure ${m} shows no media`);
    await ctx.close();
  }
}, kv.base ?? process.env.SHOOT_BASE);
await closeBrowser();
console.log(failures ? `\n${failures} failure(s)` : '\nall passes clean');
process.exit(failures ? 1 : 0);
