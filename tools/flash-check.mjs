#!/usr/bin/env node
/**
 * tools/flash-check.mjs · WP7 (SPEC §7.1 2.3.1 Three flashes). Checks every GIF and video the site shows, frame by frame.
 *
 *   node tools/flash-check.mjs [--files=a.gif,b.mp4] [--remote=/path/to/6GwunOSeX0YVHJspIvJG7W3Q.mp4] [--json=out.json]
 *
 * Decoding: ffmpeg (from $FFMPEG, PATH, or the imageio-ffmpeg wheel's static binary), frames at their real timestamps
 * (`-fps_mode passthrough`; GIF delays under 20 ms become 100 ms, as browsers play them), area-downscaled to 256 px wide.
 * The one remote video (framerusercontent.com) is read from --remote, else fetched once with curl into the OS temp dir.
 *
 * Test (WCAG 2.3.1 general-flash and red-flash thresholds, applied conservatively):
 *  · each frame is cut into an 8 × 8 grid; at the site's largest display (a figure up to the 1440 px column, a GIF full
 *    width in Enlarged detail) one cell is about a quarter of the 10° field (341 × 256 px at 1024 × 768), i.e. the
 *    smallest area WCAG counts — so a flash confined to one cell already counts;
 *  · a cell's relative luminance (sRGB → linear, WCAG formula) changing by ≥ 0.10 where the darker state is < 0.80 is a
 *    transition; two opposing transitions are one flash;
 *  · red flash: a transition in saturated red (R / (R + G + B) ≥ 0.8) with a red-difference change ≥ 20 (PEAT scale);
 *  · FAIL when any cell has more than 3 flashes (general or red) inside any 1 s window. The frame-level peak
 *    luminance change is reported too (large cuts between walkthrough screens are single transitions, not flashes).
 * Exit 1 on any failure.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MEDIA = path.join(ROOT, 'public', 'media');
const REMOTE = { '6GwunOSeX0YVHJspIvJG7W3Q.mp4': 'https://framerusercontent.com/assets/6GwunOSeX0YVHJspIvJG7W3Q.mp4' };
const W = 256;
const GRID = 8;

const argv = process.argv.slice(2);
const kv = Object.fromEntries(argv.filter((a) => a.startsWith('--') && a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(2, i), a.slice(i + 1)]; }));

function findFfmpeg() {
  const cands = [process.env.FFMPEG];
  try { cands.push(execFileSync('sh', ['-c', 'command -v ffmpeg'], { encoding: 'utf8' }).trim()); } catch {}
  try {
    cands.push(execFileSync('python3', ['-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim());
  } catch {}
  for (const c of cands.filter(Boolean)) {
    try { execFileSync(c, ['-hide_banner', '-decoders'], { stdio: ['ignore', 'pipe', 'ignore'] }); return c; } catch {}
  }
  throw new Error('flash-check: no ffmpeg (set $FFMPEG, install ffmpeg, or `pip install imageio-ffmpeg`)');
}
const FF = findFfmpeg();

/** decode every frame (rgb24, W px wide) with its presentation time */
function frames(file) {
  return new Promise((resolve, reject) => {
    const gif = /\.gif$/i.test(file);
    const args = ['-hide_banner', '-nostats', ...(gif ? ['-min_delay', '2', '-default_delay', '10', '-ignore_loop', '1'] : []), '-i', file,
      '-vf', `scale=${W}:-2:flags=area,showinfo`, '-fps_mode', 'passthrough', '-an', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'];
    const p = spawn(FF, args);
    const chunks = [];
    let err = '';
    p.stdout.on('data', (c) => chunks.push(c));
    p.stderr.on('data', (c) => { err += c; });
    p.on('error', reject);
    p.on('close', (code) => {
      if (code !== 0) { reject(new Error(`ffmpeg exited ${code}: ${err.slice(-400)}`)); return; }
      const size = /Stream #0:0.*?, (\d+)x(\d+)/.exec(err.split('Output #0')[1] ?? '');
      const [w, h] = size ? [+size[1], +size[2]] : [W, 0];
      const pts = [...err.matchAll(/pts_time:\s*([\d.]+)/g)].map((m) => +m[1]);
      const buf = Buffer.concat(chunks);
      const n = Math.floor(buf.length / (w * h * 3));
      resolve({ w, h, n, pts: pts.slice(0, n), buf });
    });
  });
}

const lin = (c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const LIN = Float64Array.from({ length: 256 }, (_, i) => lin(i));

/** per-cell mean relative luminance, red ratio and red difference for one frame */
function cells(f, i) {
  const { w, h, buf } = f;
  const base = i * w * h * 3;
  const L = new Float64Array(GRID * GRID), R = new Float64Array(GRID * GRID), RD = new Float64Array(GRID * GRID), N = new Float64Array(GRID * GRID);
  const sumR = new Float64Array(GRID * GRID), sumG = new Float64Array(GRID * GRID), sumB = new Float64Array(GRID * GRID);
  for (let y = 0; y < h; y++) {
    const cy = Math.min(GRID - 1, Math.floor((y * GRID) / h));
    for (let x = 0; x < w; x++) {
      const cx = Math.min(GRID - 1, Math.floor((x * GRID) / w));
      const k = cy * GRID + cx;
      const o = base + (y * w + x) * 3;
      const r = buf[o], g = buf[o + 1], b = buf[o + 2];
      L[k] += 0.2126 * LIN[r] + 0.7152 * LIN[g] + 0.0722 * LIN[b];
      sumR[k] += r; sumG[k] += g; sumB[k] += b;
      N[k]++;
    }
  }
  for (let k = 0; k < L.length; k++) {
    L[k] /= N[k];
    const r = sumR[k] / N[k], g = sumG[k] / N[k], b = sumB[k] / N[k];
    R[k] = r / Math.max(1, r + g + b);
    RD[k] = Math.max(0, (r - g - b) * 320 / 255);
  }
  return { L, R, RD };
}

function analyse(f) {
  const G = GRID * GRID;
  const events = Array.from({ length: G }, () => []); // per cell: [t, sign]
  const red = Array.from({ length: G }, () => []);
  let prev = cells(f, 0);
  let peak = 0;
  for (let i = 1; i < f.n; i++) {
    const cur = cells(f, i);
    const t = f.pts[i] ?? i / 30;
    let frameMean = 0;
    for (let k = 0; k < G; k++) {
      const a = prev.L[k], b = cur.L[k], d = b - a;
      frameMean += Math.abs(d) / G;
      if (Math.abs(d) >= 0.1 && Math.min(a, b) < 0.8) events[k].push([t, Math.sign(d)]);
      const saturated = prev.R[k] >= 0.8 || cur.R[k] >= 0.8;
      const rd = cur.RD[k] - prev.RD[k];
      if (saturated && Math.abs(rd) >= 20) red[k].push([t, Math.sign(rd)]);
    }
    peak = Math.max(peak, frameMean);
    prev = cur;
  }
  /** flashes = pairs of opposing transitions; the most in any 1 s window, over all cells */
  const worst = (ev) => {
    let max = 0;
    for (const cell of ev) {
      // collapse same-direction runs: only a reversal completes half a flash
      const alt = cell.filter((e, i) => i === 0 || e[1] !== cell[i - 1][1]);
      for (let i = 0; i < alt.length; i++) {
        let j = i;
        while (j + 1 < alt.length && alt[j + 1][0] - alt[i][0] <= 1) j++;
        max = Math.max(max, Math.floor((j - i + 1) / 2));
      }
    }
    return max;
  };
  return { flashes: worst(events), redFlashes: worst(red), peakMeanChange: peak, transitions: events.reduce((n, c) => n + c.length, 0) };
}

function remotePath(name) {
  if (kv.remote && fs.existsSync(kv.remote)) return kv.remote;
  const cache = path.join(os.tmpdir(), 'sv-media-cache', name);
  if (!fs.existsSync(cache)) {
    fs.mkdirSync(path.dirname(cache), { recursive: true });
    console.log(`fetching ${REMOTE[name]} …`);
    execFileSync('curl', ['-sSfL', '-o', cache, REMOTE[name]], { stdio: 'inherit' });
  }
  return cache;
}

const all = kv.files ? kv.files.split(',') : [...fs.readdirSync(MEDIA).filter((f) => /\.(gif|mp4)$/i.test(f)), ...Object.keys(REMOTE)];
const out = [];
let failed = 0;
for (const name of all) {
  const file = REMOTE[name] ? remotePath(name) : path.isAbsolute(name) ? name : path.join(MEDIA, name);
  const f = await frames(file);
  const dur = f.pts.length ? f.pts.at(-1) - f.pts[0] : 0;
  const r = analyse(f);
  const fail = r.flashes > 3 || r.redFlashes > 3;
  if (fail) failed++;
  out.push({ file: name, frames: f.n, seconds: +dur.toFixed(2), ...r, fail });
  console.log(`${fail ? '✗' : '✓'} ${name.padEnd(36)} ${String(f.n).padStart(4)} frames · ${dur.toFixed(1).padStart(5)} s · max flashes/1 s ${r.flashes} (red ${r.redFlashes}) · peak mean ΔL ${r.peakMeanChange.toFixed(3)}`);
}
console.log(`\n${out.length} files · ${failed ? `${failed} FAIL` : 'none exceeds 3 flashes in any second (general or red)'}`);
if (kv.json) fs.writeFileSync(kv.json, JSON.stringify(out, null, 1));
process.exit(failed ? 1 : 0);
