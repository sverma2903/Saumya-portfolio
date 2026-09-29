#!/usr/bin/env node
/**
 * tools/vitals.mjs · WP7 (SPEC §7.2, §8.5). Lab Core Web Vitals and byte budgets for every route, plus the Home
 * settle-and-stop proof.
 *
 *   node tools/vitals.mjs [--routes=/,/pff] [--runs=3] [--net=fast4g|slow4g|none] [--cpu=4] [--device=mobile|desktop]
 *                         [--gpu=swiftshader|software] [--no-inp] [--no-probe] [--verbose] [--json=out.json] [--base=URL]
 *
 * Every run is a cold load in a fresh browser context:
 *  · device: Moto G Power (412×823, DPR 1.75, touch) by default — SPEC §7.2's p75 reference phone; `desktop` = 1440×900.
 *  · network: DevTools' "Fast 4G" (9 Mbps × 0.9 down, 1.5 Mbps × 0.9 up, 60 ms × 2.75 RTT) through CDP; `slow4g` is
 *    Lighthouse's mobile profile (1.6 Mbps, 562.5 ms). CPU: 4× slowdown (Emulation.setCPUThrottlingRate).
 *  · the server is tools/shoot.mjs' dist/ server with gzip on and the `_headers` rules (what Cloudflare sends).
 * Measured in the page (observers installed before any script runs):
 *  · LCP (and its element), CLS (largest session window, web-vitals' rule), FCP;
 *  · TBT = Σ (long task − 50 ms) between FCP and TTI, each task clipped to that window first (Lighthouse's rule), TTI =
 *    the end of the last long task before a 5 s quiet window;
 *  · INP proxy (unless --no-inp): the slowest of a few real interactions (Tab, the case View toggle / J, the Sheet list
 *    open + close) under the same throttling, from the Event Timing API;
 *  · bytes on the wire before any interaction (CDP encodedDataLength): document, JS, fonts, images/media; CSS as
 *    render-blocking (Resource Timing's renderBlockingStatus, + the inline <style>, gzipped) — the figure compared with
 *    §7.2's 28 KB — and all (+ the async Sheet-list and print sheets). JS/CSS/HTML are compared with §7.2's gz budgets.
 *  · --verbose: where blocking time goes (script self-time in long animation frames, render/style time) per route.
 * The Home probe (unless --no-probe): requestAnimationFrame is wrapped before any script runs; after load the page is
 * left alone for 9 s. PASS = no rAF callback 6 s after load, and no running (infinite) animation at that point.
 * Exit code 1 when any median misses its budget or the probe fails.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';
import { browser as swiftshader, closeBrowser, playwright, ROUTES, withServer } from './shoot.mjs';

const argv = process.argv.slice(2);
const kv = Object.fromEntries(argv.filter((a) => a.startsWith('--') && a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(2, i), a.slice(i + 1)]; }));
const flags = new Set(argv.filter((a) => a.startsWith('--') && !a.includes('=')));
const routes = kv.routes ? kv.routes.split(',') : ROUTES.filter((r) => r !== '/nope');
const RUNS = +(kv.runs ?? 3);
// --gpu=software: Chromium's software compositor instead of SwiftShader GL. A container has no GPU, and SwiftShader
// rasterises on the CPU with the page, so the presentation part of every interaction (INP) and every WebGL canvas
// allocation is far slower than on any phone's GPU; software compositing is the closer stand-in for INP. (WebGL is
// then unavailable: the home cover shows its static drawing, so measure Home's hero with the default.)
const GPU = kv.gpu ?? 'swiftshader';
let softP = null;
const browser = () => (GPU === 'software'
  ? (softP ??= playwright().then(({ chromium }) => chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--disable-gpu', '--disable-gpu-compositing'] })))
  : swiftshader());
const CPU = +(kv.cpu ?? 4);
const NET = {
  fast4g: { latency: 60 * 2.75, downloadThroughput: (9e6 / 8) * 0.9, uploadThroughput: (1.5e6 / 8) * 0.9 },
  slow4g: { latency: 150 * 3.75, downloadThroughput: (1.6e6 / 8) * 0.9, uploadThroughput: (750e3 / 8) * 0.9 },
  none: null,
}[kv.net ?? 'fast4g'];
const DEVICE = {
  mobile: { viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
}[kv.device ?? 'mobile'];

// SPEC §7.2 (lab): LCP/CLS/TBT/INP per kind; bytes gz in KB
const KIND = (r) => (r === '/' ? 'home' : ['/about', '/fun'].includes(r) ? 'aboutplay' : 'case');
const BUDGET = {
  home: { lcp: 1500, cls: 0.02, tbt: 100, inp: 100, js: 45, css: 28, html: 40, transfer: 700 },
  case: { lcp: 2000, cls: 0.02, tbt: 100, inp: 100, js: 35, css: 28, html: 60, transfer: 1200 },
  aboutplay: { lcp: 2000, cls: 0.02, tbt: 100, inp: 100, js: 30, css: 28, html: 30, transfer: 1200 },
};
// the PFF cover (557 KB PNG) and the CSBS cover (a 5 MB GIF whose first frame paints early) get 2.5 s; a case's
// transfer budget is "1.2 MB + cover" (the cover is its LCP image, counted separately)
const LCP_OVERRIDE = { '/pff': 2500, '/csbs': 2500 };
/**
 * Animated-GIF LCP (polish r1, SPEC §7.2 exception): the web-exposed LCP entry of an animated image is timed when the
 * WHOLE file has loaded (5 MB for /csbs), although its first frame paints as soon as that frame's bytes are in. Chrome
 * ≥ 116 reports the first frame to CrUX, not to the page's API (metrics changelog 2023-08), so the lab cannot see it.
 * For these routes the LCP budget is checked against the lab bound of that first paint, max(FCP, the GIF's first
 * byte); the load-time entry is still printed. A first-frame still (a derivative) would end this — owner item §8.9.
 */
const ANIMATED_LCP = new Set(['/csbs']);

const OBSERVE = () => {
  const v = (window.__v = { lcp: [], shifts: [], long: [], loaf: [], fcp: 0, events: [] });
  const po = (type, cb, extra = {}) => { try { new PerformanceObserver((l) => l.getEntries().forEach(cb)).observe({ type, buffered: true, ...extra }); } catch {} };
  po('largest-contentful-paint', (e) => v.lcp.push({ t: e.startTime, size: e.size, tag: e.element?.tagName ?? '', id: e.element?.id ?? '', cls: String(e.element?.className ?? '').slice(0, 60), url: e.url ?? '', text: (e.element?.textContent ?? '').trim().slice(0, 60) }));
  po('layout-shift', (e) => { if (!e.hadRecentInput) v.shifts.push({ t: e.startTime, value: e.value, src: (e.sources ?? []).map((s) => s.node?.nodeName + (s.node?.className ? '.' + String(s.node.className).split(' ')[0] : '')).join(',') }); });
  po('longtask', (e) => v.long.push({ t: e.startTime, d: e.duration }));
  // long animation frames, for attribution (--verbose): the scripts that ran in each, with their self time
  po('long-animation-frame', (e) => v.loaf.push({ t: e.startTime, d: e.duration, block: e.blockingDuration, render: e.renderStart ? e.startTime + e.duration - e.renderStart : 0, style: e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0, scripts: (e.scripts ?? []).map((x) => ({ d: x.duration, layout: x.forcedStyleAndLayoutDuration, inv: x.invoker, src: `${String(x.sourceURL).split('/').pop()}:${x.sourceFunctionName}:${x.sourceCharPosition}` })) }));
  po('paint', (e) => { if (e.name === 'first-contentful-paint') v.fcp = e.startTime; });
  po('event', (e) => { if (e.interactionId) v.events.push({ name: e.name, d: e.duration, t: e.startTime }); }, { durationThreshold: 16 });
};
const PROBE = () => {
  const log = (window.__raf = []);
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf((t) => { log.push(performance.now()); cb(t); });
};

function cls(shifts) {
  let max = 0, cur = 0, start = -1, last = -1;
  for (const s of shifts) {
    if (start < 0 || s.t - last > 1000 || s.t - start > 5000) { cur = 0; start = s.t; }
    cur += s.value; last = s.t; max = Math.max(max, cur);
  }
  return max;
}
function tbt(long, fcp) {
  // TTI: end of the last long task that is followed by a 5 s window without one
  let tti = fcp;
  for (const l of long) if (l.t + l.d > tti && l.t >= fcp - 50) tti = l.t + l.d;
  // Lighthouse's sum: each long task clipped to [FCP, TTI] first, then its time over 50 ms
  let blocking = 0;
  for (const l of long) {
    const d = Math.min(l.t + l.d, tti) - Math.max(l.t, fcp);
    if (d > 50) blocking += d - 50;
  }
  return { tbt: blocking, tti };
}
/** Lighthouse's BenchmarkIndex (page-functions computeBenchmarkIndex), unthrottled: how fast this host is */
const BENCH = () => {
  const gc = () => { const t0 = Date.now(); let n = 0; while (Date.now() - t0 < 500) { let s = ''; for (let j = 0; j < 10000; j++) s += 'a'; if (s.length === 1) throw new Error(); n++; } return Math.round(n / 10 / ((Date.now() - t0) / 1000)); };
  const nogc = () => {
    const a = [], b = [];
    for (let i = 0; i < 100000; i++) a[i] = b[i] = i;
    const t0 = Date.now(); let n = 0;
    while (n % 10 !== 0 || Date.now() - t0 < 500) { const src = n % 2 ? b : a, dst = n % 2 ? a : b; for (let j = 0; j < src.length; j++) dst[j] = src[j]; n++; }
    return Math.round(n / 10 / ((Date.now() - t0) / 1000));
  };
  return Math.round((gc() + nogc()) / 2);
};
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : NaN; };
const kb = (n) => Math.round((n / 1024) * 10) / 10;

async function measure(base, route, { probe = false } = {}) {
  const b = await browser();
  const ctx = await b.newContext({ ...DEVICE, reducedMotion: 'no-preference' });
  await ctx.addInitScript(OBSERVE);
  if (probe) await ctx.addInitScript(PROBE);
  const pg = await ctx.newPage();
  const cdp = await ctx.newCDPSession(pg);
  await cdp.send('Network.enable');
  if (NET) await cdp.send('Network.emulateNetworkConditions', { offline: false, ...NET });
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  const reqs = new Map();
  let interacting = false;
  cdp.on('Network.responseReceived', (e) => { const r = reqs.get(e.requestId) ?? {}; reqs.set(e.requestId, { ...r, url: e.response.url, type: e.type, mime: e.response.mimeType, status: e.response.status }); });
  cdp.on('Network.loadingFinished', (e) => { const r = reqs.get(e.requestId); if (r && !interacting) r.bytes = e.encodedDataLength; });
  const errors = [];
  pg.on('pageerror', (e) => errors.push(e.message));
  const t0 = Date.now();
  const doc = await pg.goto(base + route, { waitUntil: 'load', timeout: 120_000 });
  const source = (await doc?.text()) ?? '';
  const loadAt = await pg.evaluate(() => performance.getEntriesByType('navigation')[0]?.loadEventEnd ?? performance.now());
  // wait for a 5 s window with no long task (TTI), at most 20 s past load
  for (let i = 0; i < 40; i++) {
    await pg.waitForTimeout(500);
    const q = await pg.evaluate(() => { const l = window.__v.long.at(-1); return performance.now() - (l ? l.t + l.d : 0); });
    if (q > 5000 && Date.now() - t0 > 2000) break;
  }
  let probeRes;
  if (probe) {
    const now = await pg.evaluate(() => performance.now());
    if (now < loadAt + 9000) await pg.waitForTimeout(loadAt + 9000 - now);
    probeRes = await pg.evaluate((loadAt) => {
      const log = window.__raf;
      const after = log.filter((t) => t > loadAt + 6000);
      const running = document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().endTime === Infinity).map((a) => `${a.animationName ?? a.constructor.name} on ${a.effect?.target?.tagName?.toLowerCase() ?? '?'}.${String(a.effect?.target?.className ?? '').split(' ')[0]}`);
      return { callbacks: log.length, first: log[0] ?? null, last: log.at(-1) ?? null, after6s: after.length, loadAt, running };
    }, loadAt);
  }
  const v = await pg.evaluate(() => window.__v);
  // the LCP image's first byte (Resource Timing): the earliest its first frame can paint (see ANIMATED_LCP)
  const lcpUrl = v.lcp.at(-1)?.url ?? '';
  const lcpFirstByte = lcpUrl ? await pg.evaluate((u) => performance.getEntriesByName(u)[0]?.responseStart ?? NaN, lcpUrl) : NaN;
  // stylesheets before any interaction, with Chrome's own render-blocking verdict (Resource Timing)
  const sheets = await pg.evaluate(() => performance.getEntriesByType('resource')
    .filter((e) => /\.css(\?|$)/.test(e.name))
    .map((e) => ({ name: e.name.split('/').pop(), blocking: e.renderBlockingStatus === 'blocking', body: e.encodedBodySize })));
  // the INP proxy: a few real interactions, still throttled; each one's slowest event is kept (inpBy)
  let inp = null;
  const inpBy = {};
  if (!flags.has('--no-inp') && !probe) {
    interacting = true;
    const kind = KIND(route);
    const act = async (name, fn, settle) => {
      const n = await pg.evaluate(() => window.__v.events.length);
      await fn();
      await pg.waitForTimeout(settle);
      const ev = await pg.evaluate((n) => window.__v.events.slice(n), n);
      inpBy[name] = ev.length ? Math.max(...ev.map((e) => e.d)) : 0;
    };
    await act('Tab', () => pg.keyboard.press('Tab'), 400);
    if (kind === 'case') {
      const tog = pg.locator('[role=radiogroup] [role=radio]:not([aria-checked=true])').first();
      if (await tog.isVisible().catch(() => false)) await act('view', () => tog.click(), 600);
      await act('J', () => pg.keyboard.press('j'), 600);
    }
    await act('⌘K', () => pg.keyboard.press('Control+k'), 900);
    await act('Esc', () => pg.keyboard.press('Escape'), 600);
    inp = Math.max(0, ...Object.values(inpBy));
  }
  await ctx.close();
  const lcpE = v.lcp.at(-1) ?? null;
  const { tbt: blocking, tti } = tbt(v.long, v.fcp);
  const byType = { Document: 0, Script: 0, Stylesheet: 0, Font: 0, Image: 0, Media: 0, Other: 0 };
  let transfer = 0;
  for (const r of reqs.values()) {
    if (r.bytes == null) continue;
    transfer += r.bytes;
    byType[r.type in byType ? r.type : 'Other'] += r.bytes;
  }
  const inline = [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
  const inlineGz = inline ? zlib.gzipSync(inline, { level: 9 }).length : 0;
  const cssBlocking = sheets.filter((x) => x.blocking).reduce((n, x) => n + x.body, 0) + inlineGz;
  const cssAll = sheets.reduce((n, x) => n + x.body, 0) + inlineGz;
  const cover = lcpE?.url ? [...reqs.values()].find((r) => r.url === lcpE.url)?.bytes ?? 0 : 0;
  return {
    route, lcp: lcpE?.t ?? NaN, firstFrame: /\.gif$/i.test(lcpE?.url ?? '') ? Math.max(v.fcp, lcpFirstByte) : NaN, lcpEl: lcpE ? `${lcpE.tag.toLowerCase()}${lcpE.id ? '#' + lcpE.id : ''}${lcpE.cls ? '.' + lcpE.cls.split(' ')[0] : ''} ${lcpE.url ? lcpE.url.split('/').pop() : JSON.stringify(lcpE.text)}` : '',
    fcp: v.fcp, cls: cls(v.shifts), shifts: v.shifts, tbt: blocking, tti, longTasks: v.long.length, inp, inpBy,
    bytes: { ...byType, inlineCssGz: inlineGz, cssBlocking, cssAll, transfer, cover }, sheets, loaf: v.loaf, probe: probeRes, errors,
  };
}

const out = await withServer(async (base) => {
  const res = [];
  const bench = await (async () => { const b = await browser(); const c = await b.newContext(); const p = await c.newPage(); await p.goto('about:blank'); const v = await p.evaluate(BENCH); await c.close(); return v; })();
  console.log(`host BenchmarkIndex ${bench} (Lighthouse's; 4× CPU → ≈ ${Math.round(bench / CPU)})\n`);
  for (const route of routes) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) runs.push(await measure(base, route));
    const m = {
      route, kind: KIND(route), runs,
      lcp: median(runs.map((r) => r.lcp)), firstFrame: median(runs.map((r) => r.firstFrame)), cls: median(runs.map((r) => r.cls)), tbt: median(runs.map((r) => r.tbt)),
      fcp: median(runs.map((r) => r.fcp)), inp: median(runs.map((r) => r.inp ?? 0)),
      js: kb(median(runs.map((r) => r.bytes.Script))), css: kb(median(runs.map((r) => r.bytes.cssBlocking))), cssAll: kb(median(runs.map((r) => r.bytes.cssAll))),
      html: kb(median(runs.map((r) => r.bytes.Document))), transfer: kb(median(runs.map((r) => r.bytes.transfer))),
      cover: kb(median(runs.map((r) => r.bytes.cover))), lcpEl: runs.at(-1).lcpEl,
      inpBy: Object.fromEntries(Object.keys(runs[0].inpBy ?? {}).map((k) => [k, median(runs.map((r) => r.inpBy?.[k] ?? 0))])),
    };
    const b = { ...BUDGET[m.kind], lcp: LCP_OVERRIDE[route] ?? BUDGET[m.kind].lcp };
    const transferBudget = b.transfer + (m.kind === 'case' ? m.cover : 0);
    m.fail = [
      ANIMATED_LCP.has(route) && Number.isFinite(m.firstFrame)
        ? m.firstFrame > b.lcp && `first frame ${Math.round(m.firstFrame)} > ${b.lcp}`
        : m.lcp > b.lcp && `LCP ${Math.round(m.lcp)} > ${b.lcp}`,
      m.cls > b.cls && `CLS ${m.cls.toFixed(3)} > ${b.cls}`,
      m.tbt > b.tbt && `TBT ${Math.round(m.tbt)} > ${b.tbt}`,
      m.inp > b.inp && `INP~ ${Math.round(m.inp)} > ${b.inp}`,
      m.js > b.js && `JS ${m.js} > ${b.js} KB`,
      m.css > b.css && `render-blocking CSS ${m.css} > ${b.css} KB`,
      m.html > b.html && `HTML ${m.html} > ${b.html} KB`,
      m.transfer > transferBudget && `transfer ${m.transfer} > ${transferBudget} KB`,
    ].filter(Boolean);
    console.log(`${route.padEnd(12)} LCP ${String(Math.round(m.lcp)).padStart(5)} ms (${m.lcpEl})${Number.isFinite(m.firstFrame) ? ` · first frame ~${Math.round(m.firstFrame)} ms` : ''} · FCP ${Math.round(m.fcp)} · CLS ${m.cls.toFixed(3)} · TBT ${Math.round(m.tbt)} ms · INP~ ${Math.round(m.inp)} ms · JS ${m.js} · CSS ${m.css} (all ${m.cssAll}) · HTML ${m.html} · transfer ${m.transfer} KB${m.fail.length ? `  ✗ ${m.fail.join('; ')}` : '  ✓'}`);
    for (const r of runs) if (r.errors.length) console.log(`    page errors: ${r.errors.join(' | ')}`);
    if (Object.keys(m.inpBy).length) console.log(`    interactions (median ms): ${Object.entries(m.inpBy).map(([k, d]) => `${k} ${Math.round(d)}`).join(' · ')}`);
    if (flags.has('--verbose')) {
      // where the blocking time goes: script self-time in long animation frames (all runs), and style/layout/paint
      const by = new Map();
      let render = 0, frames = 0;
      for (const r of runs) for (const f of r.loaf) {
        if (f.t + f.d < r.fcp) continue;
        frames++; render += f.render;
        for (const x of f.scripts) by.set(`${x.inv} ${x.src}`, (by.get(`${x.inv} ${x.src}`) ?? 0) + x.d);
      }
      const top = [...by].sort((a, b) => b[1] - a[1]).slice(0, 8);
      console.log(`    long frames after FCP: ${(frames / runs.length).toFixed(1)}/run, render+style ${Math.round(render / runs.length)} ms/run; scripts (ms/run):`);
      for (const [k, d] of top) console.log(`      ${String(Math.round(d / runs.length)).padStart(5)}  ${k}`);
      console.log(`    long tasks (ms): ${runs.map((r) => r.longTasks).join(', ')} tasks; sheets: ${runs[0].sheets.map((x) => `${x.name}${x.blocking ? '' : ' (async)'} ${kb(x.body)}`).join(', ')}`);
    }
    res.push(m);
  }
  let probe = null;
  if (!flags.has('--no-probe') && routes.includes('/')) {
    const r = await measure(base, '/', { probe: true });
    probe = r.probe;
    const pass = probe.after6s === 0 && probe.running.length === 0;
    console.log(`\nHome settle-and-stop (4× CPU): ${probe.callbacks} rAF callbacks, first ${Math.round(probe.first ?? 0)} ms, last ${Math.round(probe.last ?? 0)} ms, load ${Math.round(probe.loadAt)} ms → ${probe.after6s} callback(s) later than load + 6 s; running infinite animations: ${probe.running.length ? probe.running.join(', ') : 'none'}  ${pass ? '✓' : '✗'}`);
    probe.pass = pass;
  }
  return { res, probe, bench };
}, kv.base ?? process.env.SHOOT_BASE);
await closeBrowser();
if (softP) await (await softP).close();
const failed = out.res.filter((m) => m.fail.length).length + (out.probe && !out.probe.pass ? 1 : 0);
console.log(`\n${out.res.length} routes × ${RUNS} runs · ${kv.device ?? 'mobile'} · net ${kv.net ?? 'fast4g'} · CPU ${CPU}× · GPU ${GPU} · ${failed ? `${failed} FAILING` : 'all within budget'}`);
if (kv.json) fs.writeFileSync(kv.json, JSON.stringify(out, null, 1));
process.exit(failed ? 1 : 0);
