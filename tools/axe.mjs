#!/usr/bin/env node
/**
 * tools/axe.mjs · WP7 (SPEC §7.1, §8.5). axe-core 4.13 through Playwright on every route of the built site.
 *
 *   node tools/axe.mjs [--routes=/,/pff] [--widths=1440,390] [--themes=vellum,dusk] [--views=section,plan]
 *                      [--json=out.json] [--verbose] [--base=URL]
 *
 * Default matrix: the 10 routes (ROUTES, incl. /nope → the 404 sheet) × {1440×900, 390×844} × {Vellum, Dusk} ×
 * {Section, Plan} = 80 runs. The gate (§8.6 WP7) is 0 serious or critical violations; moderate and minor ones are
 * listed too, and the run exits 1 on any violation at all.
 *
 * How each run is set up, and why:
 *  · the paper's fibre texture is removed first. With it on, axe marks every contrast node "incomplete · bgImage" and
 *    checks nothing (P0 note). The texture is a 2–3 % tint of the ground, so the ground colour is what text sits on.
 *  · the page is walked end to end, so every `content-visibility: auto` chapter has rendered once and every lazy
 *    plate has its pixels, then it returns to the top and waits for the drafting-in to settle.
 *  · the experimental `label-content-name-mismatch` rule (WCAG 2.5.3) is switched on.
 *  · "incomplete" results (nodes axe could not decide, e.g. text over a plate or a canvas) are counted by reason and
 *    printed with --verbose; they are reviewed by hand (qa notes), they are not failures.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { browser, closeBrowser, ROUTES, withServer } from './shoot.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AXE = fs.readFileSync(path.join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8');

const argv = process.argv.slice(2);
const kv = Object.fromEntries(argv.filter((a) => a.startsWith('--') && a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(2, i), a.slice(i + 1)]; }));
const flags = new Set(argv.filter((a) => a.startsWith('--') && !a.includes('=')));
const list = (k, d) => (kv[k] ? kv[k].split(',').map((s) => s.trim()).filter(Boolean) : d);
const routes = list('routes', ROUTES);
const widths = list('widths', ['1440', '390']).map(Number);
const themes = list('themes', ['vellum', 'dusk']);
const views = list('views', ['section', 'plan']);
const HEIGHT = { 1440: 900, 1280: 720, 834: 1112, 390: 844, 320: 640 };

/** open a route in a fresh context with the stored preferences the head script reads before first paint */
async function open(base, route, { w, theme, view }) {
  const b = await browser();
  const ctx = await b.newContext({ viewport: { width: w, height: HEIGHT[w] ?? 900 } });
  await ctx.addInitScript(({ theme, view }) => {
    try {
      localStorage.setItem('sv:theme', theme);
      localStorage.setItem('sv:view', view);
    } catch {}
  }, { theme, view });
  const pg = await ctx.newPage();
  const errors = [];
  pg.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  pg.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (/status of 404/.test(m.text()) && (m.location()?.url ?? '').endsWith('/nope')) return; // the 404 sheet's own status
    errors.push(`console: ${m.text()}`);
  });
  await pg.goto(base + route, { waitUntil: 'networkidle', timeout: 90_000 });
  await pg.addStyleTag({ content: ':root{--paper-texture:none!important} body{background-image:none!important}' });
  // walk the page once (content-visibility chapters render, lazy plates load), then back to the top
  await pg.evaluate(async () => {
    const H = document.documentElement.scrollHeight;
    for (let y = 0; y < H; y += Math.round(innerHeight * 0.8)) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    scrollTo(0, 0);
  });
  await pg.waitForTimeout(1200);
  return { ctx, pg, errors };
}

async function audit(pg) {
  await pg.addScriptTag({ content: AXE });
  return pg.evaluate(async () => {
    const r = await window.axe.run(document, {
      resultTypes: ['violations', 'incomplete'],
      rules: { 'label-content-name-mismatch': { enabled: true } },
    });
    const slim = (x) => ({
      id: x.id, impact: x.impact, help: x.help,
      nodes: x.nodes.map((n) => ({ target: n.target.join(' '), summary: (n.failureSummary ?? '').slice(0, 400), why: [...n.any, ...n.all, ...n.none].map((c) => c.data?.messageKey ?? c.id).filter(Boolean).join(',') })),
    });
    return { violations: r.violations.map(slim), incomplete: r.incomplete.map(slim) };
  });
}

const runs = [];
for (const w of widths) for (const theme of themes) for (const view of views) for (const route of routes) runs.push({ route, w, theme, view });

const results = await withServer(async (base) => {
  const out = [];
  for (const r of runs) {
    const { ctx, pg, errors } = await open(base, r.route, r);
    const res = await audit(pg);
    await ctx.close();
    out.push({ ...r, ...res, errors });
    const v = res.violations;
    const tag = `${r.w} ${r.theme.padEnd(6)} ${r.view.padEnd(7)} ${r.route}`;
    const inc = res.incomplete.reduce((n, x) => n + x.nodes.length, 0);
    console.log(`${tag.padEnd(40)} violations ${v.length}${v.length ? ` (${v.map((x) => `${x.impact}:${x.id}×${x.nodes.length}`).join(', ')})` : ''} · incomplete ${inc}${errors.length ? ` · ${errors.length} page error(s)` : ''}`);
    if (flags.has('--verbose') || v.length) {
      for (const x of v) for (const n of x.nodes.slice(0, 6)) console.log(`    ✗ ${x.id} ${n.target}\n      ${n.summary.replace(/\n/g, ' ')}`);
      if (flags.has('--verbose')) for (const x of res.incomplete) console.log(`    ? ${x.id} ×${x.nodes.length} [${[...new Set(x.nodes.map((n) => n.why))].join(' | ')}]`);
      for (const e of errors) console.log(`    ! ${e}`);
    }
  }
  return out;
}, kv.base ?? process.env.SHOOT_BASE);
await closeBrowser();

const byImpact = {};
for (const r of results) for (const v of r.violations) byImpact[v.impact] = (byImpact[v.impact] ?? 0) + 1;
const incReasons = {};
for (const r of results) for (const x of r.incomplete) for (const n of x.nodes) { const k = `${x.id}:${n.why || '?'}`; incReasons[k] = (incReasons[k] ?? 0) + 1; }
const serious = (byImpact.serious ?? 0) + (byImpact.critical ?? 0);
const total = Object.values(byImpact).reduce((a, b) => a + b, 0);
const pageErrors = results.reduce((n, r) => n + r.errors.length, 0);
console.log(`\n${results.length} runs · violations by impact ${JSON.stringify(byImpact)} · serious+critical ${serious} · page errors ${pageErrors}`);
console.log(`incomplete (manual review) by rule:reason ${JSON.stringify(incReasons)}`);
if (kv.json) fs.writeFileSync(kv.json, JSON.stringify(results, null, 1));
process.exit(total || pageErrors ? 1 : 0);
