#!/usr/bin/env node
/**
 * tools/shoot.mjs · P0. Screenshot helper for every work package (SPEC §8.6). A port of scratchpad/local.mjs.
 *
 *   node tools/shoot.mjs <path> <out.png> [scrollY] [w] [h] [full] [--reduced] [--dusk] [--plan] [--report] [--base=URL]
 *   npm run shoot -- /cloudflare shots/cf.png 0 1440 900 1 --plan
 *
 *   scrollY   wheel-scroll this many px before the shot (drives scroll handlers like a user would)
 *   w h       viewport (default 1440 × 900)
 *   full      1 → full-page (scrolls through first so lazy media loads, then back to top)
 *   --reduced Motion off: prefers-reduced-motion + localStorage sv:motion=reduce
 *   --dusk    localStorage sv:theme=dusk
 *   --plan    localStorage sv:view=plan
 *   --report  print console errors/warnings, failed requests, and the loaded font families (document.fonts)
 *   --base    server origin (default: $SHOOT_BASE, else an internal static server over dist/ with clean URLs + 404.html)
 *
 * Chromium: /opt/pw-browsers/chromium with the SwiftShader WebGL flags (never `playwright install`).
 * Playwright: $PLAYWRIGHT_PATH or /opt/node22/lib/node_modules/playwright/index.mjs.
 * Also importable: `import { shoot, withServer } from './tools/shoot.mjs'` for batch runs.
 */
import http from 'node:http';
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PW = process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright/index.mjs';
const CHROMIUM = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
};

/**
 * _headers rules (Cloudflare syntax: a path pattern line, then indented "Name: value" lines), read once per server.
 * Applied to every response, so tools see the production cache policy (e.g. vitals' repeat views).
 */
function readHeaderRules(dir = DIST) {
  const file = path.join(dir, '_headers');
  if (!fs.existsSync(file)) return [];
  const rules = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) rules.push({ re: new RegExp(`^${line.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`), set: [] });
    else if (rules.length) { const i = line.indexOf(':'); rules.at(-1).set.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]); }
  }
  return rules;
}
const COMPRESSIBLE = /^(text\/|application\/(json|xml|javascript)|image\/svg)/;

/**
 * A tiny static server over dist/ that mimics Cloudflare assets: clean URLs, 404.html, byte ranges for video, the
 * `_headers` cache rules and (opts.compress, default on) gzip for text types when the client accepts it — Cloudflare
 * compresses HTML/CSS/JS/JSON/SVG on the wire, so transfer sizes and lab LCP are measured the way visitors get them.
 */
export function serveDist(port = 0, opts = {}) {
  const { compress = true, dir = DIST } = opts;
  const ROOTDIR = path.resolve(dir);
  const rules = readHeaderRules(ROOTDIR);
  const gz = new Map(); // file → gzipped buffer (built once)
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    let p = decodeURIComponent(url.pathname);
    if (p.endsWith('/')) p += 'index';
    let file = path.join(ROOTDIR, p);
    if (!file.startsWith(ROOTDIR)) { res.writeHead(403).end(); return; }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = fs.existsSync(`${file}.html`) ? `${file}.html` : '';
    const extra = {};
    for (const r of rules) if (r.re.test(url.pathname)) for (const [k, v] of r.set) extra[k] = v;
    const accepts = compress && /\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''));
    const send = (status, f, type) => {
      if (accepts && COMPRESSIBLE.test(type)) {
        const key = `${f}:${fs.statSync(f).mtimeMs}`; // a rebuild under a running server is picked up
        if (!gz.has(key)) gz.set(key, zlib.gzipSync(fs.readFileSync(f), { level: 9 }));
        const body = gz.get(key);
        res.writeHead(status, { ...extra, 'content-type': type, 'content-encoding': 'gzip', 'content-length': body.length, vary: 'accept-encoding' });
        res.end(req.method === 'HEAD' ? undefined : body);
        return;
      }
      const size = fs.statSync(f).size;
      const range = status === 200 && /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
      if (range) {
        const start = range[1] ? +range[1] : 0;
        const end = range[2] ? +range[2] : size - 1;
        res.writeHead(206, { ...extra, 'content-type': type, 'content-range': `bytes ${start}-${end}/${size}`, 'accept-ranges': 'bytes', 'content-length': end - start + 1 });
        fs.createReadStream(f, { start, end }).pipe(res);
        return;
      }
      res.writeHead(status, { ...extra, 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes' });
      if (req.method === 'HEAD') res.end();
      else fs.createReadStream(f).pipe(res);
    };
    if (!file) {
      const nf = path.join(ROOTDIR, '404.html');
      if (fs.existsSync(nf)) send(404, nf, TYPES['.html']);
      else res.writeHead(404).end();
      return;
    }
    send(200, file, TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream');
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

/** Run `fn(base)` with a base URL: $SHOOT_BASE / --base, or an internal dist/ server for the duration. */
export async function withServer(fn, base = process.env.SHOOT_BASE) {
  if (base) return fn(base.replace(/\/$/, ''));
  if (!fs.existsSync(path.join(DIST, 'index.html'))) throw new Error('dist/ is missing — run `npm run build` first.');
  const server = await serveDist();
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
  }
}

let browserP = null;
/** The shared Chromium (SwiftShader flags). WP7's tools (axe, vitals, og, a11y passes) reuse it. */
export async function browser() {
  if (!browserP) {
    const { chromium } = await import(pathToFileURL(PW).href);
    browserP = chromium.launch({ executablePath: CHROMIUM, args: ARGS });
  }
  return browserP;
}
/** Playwright's module (for tools that need `devices`, `request`, …). */
export const playwright = () => import(pathToFileURL(PW).href);
/** The ten routes every QA tool walks (§8.6 WP7: the nine URLs + an unknown path for the 404 sheet). */
export const ROUTES = ['/', '/cloudflare', '/pff', '/csbs', '/u-up', '/orbit', '/educademy', '/about', '/fun', '/nope'];
export async function closeBrowser() {
  if (browserP) (await browserP).close();
  browserP = null;
}

/**
 * Take one screenshot. Returns { errors, failed, fonts, title, status }.
 * opts: { base, path, out, scrollY=0, w=1440, h=900, full=false, reduced, dusk, plan, report }
 */
export async function shoot(opts) {
  const { base, out, scrollY = 0, w = 1440, h = 900, full = false, reduced = false, dusk = false, plan = false } = opts;
  const b = await browser();
  const ctx = await b.newContext({ viewport: { width: +w, height: +h }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(({ reduced, dusk, plan }) => {
    try {
      if (reduced) localStorage.setItem('sv:motion', 'reduce');
      if (dusk) localStorage.setItem('sv:theme', 'dusk');
      if (plan) localStorage.setItem('sv:view', 'plan');
    } catch {}
  }, { reduced, dusk, plan });
  const pg = await ctx.newPage();
  const errors = [];
  const failed = [];
  const target = base + opts.path;
  pg.on('console', (m) => {
    if (m.type() !== 'error' && m.type() !== 'warning') return;
    if (m.location()?.url === target && /status of 404/.test(m.text())) return; // the document's own 404 (e.g. /nope) is intended
    errors.push(`${m.type()}: ${m.text()}`);
  });
  pg.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  pg.on('response', (r) => { if (r.status() >= 400 && !r.url().endsWith(opts.path)) failed.push(`${r.status()} ${r.url()}`); });
  const resp = await pg.goto(base + opts.path, { waitUntil: 'networkidle', timeout: 90000 }).catch((e) => { errors.push(`goto: ${e.message}`); return null; });
  await pg.waitForTimeout(1500);
  if (+scrollY) { await pg.mouse.move(w / 2, h / 2); await pg.mouse.wheel(0, +scrollY); await pg.waitForTimeout(2500); }
  if (full) {
    const H = await pg.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < H; y += 600) { await pg.mouse.wheel(0, 600); await pg.waitForTimeout(120); }
    await pg.waitForTimeout(1500);
    await pg.evaluate(() => scrollTo(0, 0));
    await pg.waitForTimeout(800);
  }
  const fonts = await pg.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family.replace(/-[0-9a-f]{16}$/, '')} ${f.style} ${f.weight}`);
  });
  const title = await pg.title();
  if (out) {
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    await pg.screenshot({ path: out, fullPage: !!full });
  }
  await ctx.close();
  return { errors, failed, fonts: [...new Set(fonts)].sort(), title, status: resp ? resp.status() : 0 };
}

// ───────────────────────────── CLI ─────────────────────────────
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const argv = process.argv.slice(2);
  const flags = new Set(argv.filter((a) => a.startsWith('--') && !a.includes('=')));
  const kv = Object.fromEntries(argv.filter((a) => a.startsWith('--') && a.includes('=')).map((a) => a.slice(2).split('=')));
  const [p = '/', out = 'shot.png', scrollY = '0', w = '1440', h = '900', full = '0'] = argv.filter((a) => !a.startsWith('--'));
  const r = await withServer(
    (base) => shoot({ base, path: p, out, scrollY: +scrollY, w: +w, h: +h, full: full === '1', reduced: flags.has('--reduced'), dusk: flags.has('--dusk'), plan: flags.has('--plan') }),
    kv.base ?? process.env.SHOOT_BASE,
  );
  await closeBrowser();
  if (r.errors.length) console.log(r.errors.join('\n'));
  if (flags.has('--report')) {
    console.log(`status ${r.status} · ${r.title}`);
    console.log(`fonts: ${r.fonts.join(' | ')}`);
    if (r.failed.length) console.log(`failed:\n${r.failed.join('\n')}`);
  }
}
