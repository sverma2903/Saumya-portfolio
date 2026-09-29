#!/usr/bin/env node
/**
 * tools/matrix.mjs · WP7 (SPEC §8.6 WP7 "Screenshot matrix"). The review set for every release:
 *
 *   node tools/matrix.mjs [--out=qa/shots] [--viewports=1440x900,1280x720,834x1112,390x844] [--routes=/,/pff]
 *                         [--quality=80] [--base=URL]
 *
 * viewports {1440×900, 1280×720, 834×1112, 390×844} × pages {/, the six cases, /about, /fun, /nope} × states
 * {default, reduced (motion off), dusk, plan (cases)} + palette-open and detail-open on /cloudflare: 152 first-viewport
 * captures, WebP (lossy q80 via Pillow when python3 has it, else JPEG q80), named <viewport>/<page>--<state>.<ext>.
 * Each capture waits for the fonts, the network to go idle and the page to settle (the home cover finishes drafting
 * in; motion states are captured at rest). Plan is captured at the first level (Overview), where Plan view shows.
 * Writes <out>/index.html, a contact sheet of the whole set, and prints the total size.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { browser, closeBrowser, withServer, ROUTES } from './shoot.mjs';

const argv = process.argv.slice(2);
const kv = Object.fromEntries(argv.filter((a) => a.startsWith('--') && a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(2, i), a.slice(i + 1)]; }));
const OUT = path.resolve(kv.out ?? 'qa/shots');
const VIEWPORTS = (kv.viewports ?? '1440x900,1280x720,834x1112,390x844').split(',').map((v) => v.split('x').map(Number));
const routes = kv.routes ? kv.routes.split(',') : ROUTES;
const Q = +(kv.quality ?? 80);
const CASES = ['/cloudflare', '/pff', '/csbs', '/u-up', '/orbit', '/educademy'];
const name = (r) => (r === '/' ? 'home' : r.slice(1));

let webp = false;
try { execFileSync('python3', ['-c', 'from PIL import features; import sys; sys.exit(0 if features.check("webp") else 1)'], { stdio: 'ignore' }); webp = true; } catch {}
const EXT = webp ? 'webp' : 'jpg';

/** PNG buffer → WebP file (Pillow), or a JPEG straight from Chromium */
function save(png, file) {
  const tmp = `${file}.png`;
  fs.writeFileSync(tmp, png);
  execFileSync('python3', ['-c', `from PIL import Image; Image.open(${JSON.stringify(tmp)}).convert('RGB').save(${JSON.stringify(file)}, 'WEBP', quality=${Q}, method=6)`]);
  fs.rmSync(tmp);
}

async function capture(base, { route, w, h, state }) {
  const b = await browser();
  const reduced = state === 'reduced';
  const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript((s) => {
    try {
      if (s === 'reduced') localStorage.setItem('sv:motion', 'reduce');
      if (s === 'dusk') localStorage.setItem('sv:theme', 'dusk');
      if (s === 'plan') localStorage.setItem('sv:view', 'plan');
    } catch {}
  }, state);
  const pg = await ctx.newPage();
  const errors = [];
  pg.on('pageerror', (e) => errors.push(e.message));
  await pg.goto(base + route, { waitUntil: 'networkidle', timeout: 90_000 }).catch(() => pg.goto(base + route, { waitUntil: 'networkidle', timeout: 90_000 }));
  await pg.evaluate(() => document.fonts.ready);
  await pg.waitForTimeout(route === '/' && !reduced ? 4500 : 1200); // the cover drafts in, then stops
  if (state === 'plan') {
    await pg.evaluate(() => { const c = document.querySelector('main section.chapter'); if (c) scrollTo(0, c.getBoundingClientRect().top + scrollY - 64); });
    await pg.waitForTimeout(900);
  }
  if (state === 'palette') { await pg.keyboard.press('Control+k'); await pg.waitForSelector('dialog.palette[open]'); await pg.waitForTimeout(900); }
  if (state === 'detail') {
    // the first figure of the first level (a still), opened from its Enlarge control
    const el = pg.locator('main section.chapter [data-plate][data-fig-no][data-kind=image] .plate__open').first();
    await el.scrollIntoViewIfNeeded();
    await pg.waitForTimeout(400);
    await el.click({ force: true });
    await pg.waitForSelector('dialog.detail[open]');
    await pg.waitForTimeout(1500);
  }
  const png = await pg.screenshot({ type: webp ? 'png' : 'jpeg', ...(webp ? {} : { quality: Q }) });
  await ctx.close();
  return { png, errors };
}

const jobs = [];
for (const [w, h] of VIEWPORTS) {
  for (const route of routes) {
    for (const state of ['default', 'reduced', 'dusk']) jobs.push({ route, w, h, state });
    if (CASES.includes(route)) jobs.push({ route, w, h, state: 'plan' });
  }
  if (routes.includes('/cloudflare')) for (const state of ['palette', 'detail']) jobs.push({ route: '/cloudflare', w, h, state });
}

const shots = await withServer(async (base) => {
  const done = [];
  for (const j of jobs) {
    const dir = path.join(OUT, `${j.w}x${j.h}`);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${name(j.route)}--${j.state}.${EXT}`);
    const { png, errors } = await capture(base, j);
    if (webp) save(png, file); else fs.writeFileSync(file, png);
    done.push({ ...j, file: path.relative(OUT, file), bytes: fs.statSync(file).size, errors });
    if (errors.length) console.log(`  ! ${j.route} ${j.w}x${j.h} ${j.state}: ${errors.join(' | ')}`);
  }
  return done;
}, kv.base ?? process.env.SHOOT_BASE);
await closeBrowser();

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Screenshot matrix</title>
<style>body{margin:16px;font:14px/1.4 system-ui,sans-serif;background:#eeebe3;color:#211e19}h2{margin:32px 0 8px;font-size:15px}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}figure{margin:0}img{width:100%;height:auto;border:1px solid #0002;background:#fff}
figcaption{font:12px ui-monospace,monospace;margin-top:4px}</style>
<h1>Screenshot matrix</h1><p>${shots.length} captures · ${(shots.reduce((n, s) => n + s.bytes, 0) / 1048576).toFixed(1)} MB · first viewport · ${new Date().toISOString().slice(0, 10)}</p>
${VIEWPORTS.map(([w, h]) => `<h2>${w} × ${h}</h2><div class="g">${shots.filter((s) => s.w === w && s.h === h).map((s) => `<figure><a href="${esc(s.file)}"><img loading="lazy" src="${esc(s.file)}" alt="${esc(`${s.route} · ${s.state}`)}"></a><figcaption>${esc(s.route)} · ${s.state}</figcaption></figure>`).join('')}</div>`).join('\n')}`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
const total = shots.reduce((n, s) => n + s.bytes, 0);
console.log(`${shots.length} captures (${EXT}) · ${(total / 1048576).toFixed(2)} MB → ${OUT}`);
