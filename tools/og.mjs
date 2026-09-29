#!/usr/bin/env node
/**
 * tools/og.mjs · WP7 (SPEC §7.3, §8.9 item 14). Renders the Open Graph sheets into public/og/<page>.png (1200 × 630).
 *
 *   npm run og                       # every page: index, the six cases, about, fun
 *   node tools/og.mjs --pages=pff,orbit [--keep]
 *
 * 1. `astro build` with SV_OG=1 into a temporary outDir: src/pages/og/[page].astro only has routes in that build, so
 *    the site's own build never ships /og/* pages.
 * 2. Serves that build (tools/shoot.mjs' static server), opens /og/<page> at 1200 × 630 (DPR 1), waits for the page's
 *    own readiness flag (fonts loaded, title fitted, the CSBS GIF's poster frame drawn, every image decoded).
 * 3. Screenshots it to public/og/<page>.png and prints the sizes. Pages reference them through Base's `ogImage`.
 * Afterwards run `npm run build` so dist/ carries the new PNGs. --keep leaves the temporary build for inspection.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { browser, closeBrowser, serveDist } from './shoot.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'og');
const ALL = ['index', 'cloudflare', 'pff', 'csbs', 'u-up', 'orbit', 'educademy', 'about', 'fun'];

const argv = process.argv.slice(2);
const kv = Object.fromEntries(argv.filter((a) => a.startsWith('--') && a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(2, i), a.slice(i + 1)]; }));
const pages = kv.pages ? kv.pages.split(',') : ALL;
const keep = argv.includes('--keep');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sv-og-'));
process.env.SV_OG = '1';
const { build } = await import('astro');
console.log(`og: building the OG sheets into ${tmp} …`);
await build({ root: ROOT, outDir: tmp, logLevel: 'warn' });
for (const p of pages) if (!fs.existsSync(path.join(tmp, 'og', `${p}.html`))) throw new Error(`og: /og/${p} was not built`);

const server = await serveDist(0, { dir: tmp });
const base = `http://127.0.0.1:${server.address().port}`;
fs.mkdirSync(OUT, { recursive: true });
const b = await browser();
let failed = 0;
for (const p of pages) {
  const ctx = await b.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const pg = await ctx.newPage();
  const errors = [];
  pg.on('pageerror', (e) => errors.push(e.message));
  pg.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  pg.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  await pg.goto(`${base}/og/${p}`, { waitUntil: 'networkidle', timeout: 90_000 });
  await pg.waitForSelector('html[data-ready]', { timeout: 60_000 });
  // nothing may spill out of the text block or the sheet (the fit loop shrinks the title first, then the deck)
  const fit = await pg.evaluate(() => {
    const t = document.querySelector('[data-og-fit]');
    return { over: t.scrollHeight - t.clientHeight, h1: getComputedStyle(t.querySelector('h1')).fontSize, doc: document.documentElement.scrollHeight };
  });
  const file = path.join(OUT, `${p}.png`);
  await pg.screenshot({ path: file, clip: { x: 0, y: 0, width: 1200, height: 630 } });
  await ctx.close();
  const kb = Math.round(fs.statSync(file).size / 1024);
  const bad = errors.length || fit.over > 1;
  if (bad) failed++;
  console.log(`${bad ? '✗' : '✓'} public/og/${p}.png  ${kb} KB  · title ${fit.h1}${fit.over > 1 ? ` · text overflows by ${fit.over}px` : ''}${errors.length ? ` · ${errors.join(' | ')}` : ''}`);
}
await closeBrowser();
server.close();
if (!keep) fs.rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `og: ${failed} sheet(s) need attention` : 'og: done — run `npm run build` so dist/ carries them');
process.exit(failed ? 1 : 0);
