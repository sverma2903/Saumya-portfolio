#!/usr/bin/env node
/**
 * tools/smoke.mjs · polish r1. The post-deploy smoke check (launch checklist, SPEC §8.7): run it against the deployed
 * origin right after `npm run deploy`, and against `npm run preview` (wrangler dev) before it.
 *
 *   node tools/smoke.mjs https://www.saumya-verma.com        (npm run qa:smoke -- https://www.saumya-verma.com)
 *
 * Checks, each a hard failure (exit 1):
 *   · every URL she had answers 200 (/, /about, /fun and the six cases), and a missing page answers 404;
 *   · every local MP4 answers a `Range: bytes=0-1` GET — and a HEAD — with 206, `Content-Range: bytes 0-1/<size>` and
 *     exactly 2 bytes (Safari plays nothing else; Chrome's preload=metadata downloads the whole file on a 200). If this
 *     fails, the Worker in worker/media.js is not running for /media/*.mp4: check `main` and `run_worker_first` in
 *     wrangler.jsonc;
 *   · /media/* carries the immutable Cache-Control from public/_headers (also on the Worker-served MP4s);
 *   · a GIF (served by the asset layer) answers 200 with its full size.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = (process.argv[2] ?? process.env.SMOKE_BASE ?? '').replace(/\/$/, '');
if (!/^https?:\/\//.test(base)) {
  console.error('usage: node tools/smoke.mjs <origin>   e.g. https://www.saumya-verma.com or http://127.0.0.1:8787');
  process.exit(2);
}
const ROUTES = ['/', '/about', '/fun', '/cloudflare', '/pff', '/csbs', '/u-up', '/orbit', '/educademy'];
const MEDIA = path.join(ROOT, 'public', 'media');
const mp4s = fs.readdirSync(MEDIA).filter((f) => f.endsWith('.mp4'));
const gif = fs.readdirSync(MEDIA).find((f) => f.endsWith('.gif'));
const IMMUTABLE = /max-age=31536000.*immutable|immutable.*max-age=31536000/;

let fails = 0;
const check = (ok, what, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}${detail ? `  (${detail})` : ''}`);
  if (!ok) fails++;
};

for (const r of ROUTES) {
  const res = await fetch(base + r, { redirect: 'manual' });
  check(res.status === 200, `GET ${r} → 200`, String(res.status));
  await res.body?.cancel();
}
{
  const res = await fetch(`${base}/sheet-not-in-set-${Date.now()}`);
  check(res.status === 404, 'a missing page → 404', String(res.status));
  await res.body?.cancel();
}
for (const f of mp4s) {
  const size = fs.statSync(path.join(MEDIA, f)).size;
  for (const method of ['GET', 'HEAD']) {
    const res = await fetch(`${base}/media/${f}`, { method, headers: { Range: 'bytes=0-1' } });
    const body = method === 'GET' ? new Uint8Array(await res.arrayBuffer()) : null;
    const cr = res.headers.get('content-range');
    check(res.status === 206 && cr === `bytes 0-1/${size}` && (body == null || body.byteLength === 2),
      `${method} /media/${f} Range: bytes=0-1 → 206`, `${res.status} · Content-Range ${cr ?? '—'}${body ? ` · ${body.byteLength} B` : ''}`);
    if (method === 'GET') check(IMMUTABLE.test(res.headers.get('cache-control') ?? ''), `/media/${f} is immutable`, res.headers.get('cache-control') ?? '—');
  }
}
if (gif) {
  const res = await fetch(`${base}/media/${gif}`);
  const n = (await res.arrayBuffer()).byteLength;
  check(res.status === 200 && n === fs.statSync(path.join(MEDIA, gif)).size, `GET /media/${gif} → 200, whole file`, `${res.status} · ${n} B`);
  check(IMMUTABLE.test(res.headers.get('cache-control') ?? ''), `/media/${gif} is immutable`, res.headers.get('cache-control') ?? '—');
}
console.log(fails ? `\n${fails} check(s) failed` : '\nall checks passed');
process.exit(fails ? 1 : 0);
