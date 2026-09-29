#!/usr/bin/env node
/**
 * tools/alt-draft.mjs · WP7 (SPEC §7.1 1.1.1, §8.9 item 2). The alt-text workbench.
 *
 *   node tools/alt-draft.mjs                 coverage: every media file the built site renders vs src/data/alt.ts
 *   node tools/alt-draft.mjs --sheet[=path]  the owner's review sheet (default qa/alt-review.html): each file beside its
 *                                            draft, where it is used, and her caption when it has one (marked as hers);
 *                                            approve / edit per row in the browser, then "Export" a JSON of the changes
 *   node tools/alt-draft.mjs --context=FILE  what a writer needs for one file: pages, figure, her caption and the text
 *                                            around it on the page (to write a draft that complements, never repeats it)
 *
 * How the drafts in alt.ts were written (and how to write new ones): open the file itself — every frame strip for a
 * GIF or video — and say what is visible; quote text inside the image exactly; never paraphrase her caption or the
 * adjacent sentence as if it were hers (the page already reads those out); lead with what the thing is (screenshot,
 * wireframe, journey map, photo, sketch) and keep a UI shot to the parts that carry the point.
 * Needs a build (reads dist/*.html). Exit 1 when a rendered file has no draft.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from 'node-html-parser';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PAGES = ['index', 'cloudflare', 'pff', 'csbs', 'u-up', 'orbit', 'educademy', 'about', 'fun', '404'];
const SKIP = new Set(['ACwkGtncbgGidk0PGO4wEAjBQ4.png']); // the apple-touch icon (not an <img>)

const argv = process.argv.slice(2);
const kv = Object.fromEntries(argv.map((a) => a.replace(/^--/, '').split('=')).map(([k, ...v]) => [k, v.join('=') || true]));
if (!fs.existsSync(path.join(DIST, 'index.html'))) { console.error('alt-draft: dist/ is missing — run `npm run build` first.'); process.exit(2); }
const { altDrafts, ALT_STATUS } = await import(pathToFileURL(path.join(ROOT, 'src/data/alt.ts')).href);

const text = (el) => (el ? el.text.replace(/\s+/g, ' ').trim() : '');
const fileOf = (src) => (src ?? '').split('#')[0].split('?')[0].split('/').pop();

/** every rendered media element (and its <noscript> twin), with its page, figure number, caption and surroundings */
const uses = new Map();
for (const page of PAGES) {
  const html = fs.readFileSync(path.join(DIST, `${page}.html`), 'utf8');
  const root = parse(html, { comment: false, blockTextElements: { script: false, style: false, noscript: true } });
  // a second parse without <noscript> bodies, for clean surrounding text
  const plain = parse(html, { comment: false, blockTextElements: { script: false, style: false, noscript: false } });
  const els = [...root.querySelectorAll('img, video')];
  for (const n of root.querySelectorAll('noscript')) els.push(...parse(`<div>${n.innerHTML}</div>`).querySelectorAll('img, video').map((e) => Object.assign(e, { host: n })));
  for (const e of els) {
    const f = fileOf(e.getAttribute('src') ?? e.getAttribute('data-src'));
    if (!f || SKIP.has(f) || !/\.(png|jpe?g|gif|webp|mp4)$/i.test(f)) continue;
    const host = e.host ?? e;
    const plate = host.closest('[data-plate]');
    const capId = plate?.getAttribute('data-cap-id');
    const tpl = plate?.querySelector('template[data-cap]');
    const cap = capId ? text(root.getElementById(capId)) : tpl ? text(parse(tpl.innerHTML)) : '';
    const blkId = (host.closest('[data-block]') ?? host.closest('.blk'))?.getAttribute('id');
    const blk = blkId ? plain.getElementById(blkId) : null;
    const prev = blk?.previousElementSibling;
    const next = blk?.nextElementSibling;
    const rec = uses.get(f) ?? { file: f, pages: new Set(), figs: new Set(), caps: new Set(), around: [], decorative: 0, named: 0 };
    rec.pages.add(page);
    const fig = plate?.getAttribute('data-fig-no');
    if (fig) rec.figs.add(fig);
    if (cap) rec.caps.add(cap);
    if (rec.around.length < 2 && (prev || next)) rec.around.push({ page, before: text(prev).slice(-240), after: text(next).slice(0, 240) });
    const a = e.getAttribute('alt') ?? e.getAttribute('aria-label') ?? '';
    if (a) rec.named++; else rec.decorative++;
    uses.set(f, rec);
  }
}

const files = [...uses.keys()];
const missing = files.filter((f) => !altDrafts[f]);
const orphans = Object.keys(altDrafts).filter((f) => !uses.has(f));
const lengths = Object.values(altDrafts).map((s) => s.length).sort((a, b) => a - b);

if (kv.context) {
  const r = uses.get(kv.context);
  if (!r) { console.error(`alt-draft: ${kv.context} is not rendered on any page`); process.exit(2); }
  console.log(JSON.stringify({ file: r.file, pages: [...r.pages], figs: [...r.figs], hersCaption: [...r.caps], around: r.around, draft: altDrafts[r.file] ?? null }, null, 2));
  process.exit(0);
}

console.log(`alt drafts: ${Object.keys(altDrafts).length} in src/data/alt.ts (${ALT_STATUS})`);
console.log(`rendered media: ${files.length} files on ${PAGES.length} pages · named ${files.filter((f) => uses.get(f).named).length} · decorative-only uses ${files.filter((f) => !uses.get(f).named).length}`);
console.log(`draft length: min ${lengths[0]} · median ${lengths[Math.floor(lengths.length / 2)]} · max ${lengths.at(-1)} chars`);
if (orphans.length) console.log(`drafts for files no page renders (keep for re-use, or delete): ${orphans.join(', ')}`);
if (missing.length) console.log(`✗ MISSING drafts (${missing.length}):\n${missing.map((f) => `  ${f} · ${[...uses.get(f).pages].join(', ')} · ${[...uses.get(f).figs].join(', ')}`).join('\n')}`);
else console.log('✓ every rendered media file has a draft');

if (kv.sheet) {
  const out = path.resolve(ROOT, typeof kv.sheet === 'string' ? kv.sheet : 'qa/alt-review.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const rel = path.relative(path.dirname(out), path.join(ROOT, 'public', 'media')).split(path.sep).join('/');
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const order = PAGES.flatMap((p) => files.filter((f) => [...uses.get(f).pages][0] === p));
  const rows = order.map((f, i) => {
    const r = uses.get(f);
    const media = /\.mp4$/.test(f)
      ? `<video src="${rel}/${f}" muted playsinline preload="metadata" controls></video>`
      : `<img src="${rel}/${f}" alt="" loading="lazy" decoding="async">`;
    const remote = /\.mp4$/.test(f) && !fs.existsSync(path.join(ROOT, 'public', 'media', f)) ? '<p class="note">Served from framerusercontent.com (not in public/media).</p>' : '';
    return `<article class="row" data-file="${esc(f)}">
  <div class="m">${media}${remote}</div>
  <div class="t">
    <p class="k"><span class="n">${String(i + 1).padStart(3, '0')}</span> <code>${esc(f)}</code> · ${esc([...r.pages].join(', '))}${r.figs.size ? ` · ${esc([...r.figs].join(', '))}` : ''}${r.named ? '' : ' · <em>shown decoratively (alt="") where it appears</em>'}</p>
    ${[...r.caps].map((c) => `<p class="cap"><span>Her caption</span> ${esc(c)}</p>`).join('')}
    <label class="d"><span>Draft alt text</span><textarea rows="4" spellcheck="true">${esc(altDrafts[f] ?? '')}</textarea></label>
    <p class="act"><label><input type="checkbox" class="ok"> Approved</label> <span class="len"></span></p>
  </div>
</article>`;
  }).join('\n');
  fs.writeFileSync(out, `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Alt text review</title>
<style>
  :root { --paper: #EEEBE3; --ink: #211E19; --ink-2: #4A453C; --line: rgb(33 30 25 / .25); --rust: #A63D00; color-scheme: light; }
  body { margin: 0; background: var(--paper); color: var(--ink); font: 16px/1.45 system-ui, sans-serif; }
  header { position: sticky; top: 0; z-index: 1; background: var(--paper); border-bottom: 1px solid var(--line); padding: 12px 24px; display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
  h1 { font-size: 18px; margin: 0; } header p { margin: 0; color: var(--ink-2); flex: 1 1 320px; }
  button { font: inherit; padding: 8px 14px; border: 1px solid var(--ink); background: #fff; border-radius: 4px; cursor: pointer; }
  main { padding: 8px 24px 64px; max-width: 1400px; margin: 0 auto; }
  .row { display: grid; grid-template-columns: minmax(0, 420px) minmax(0, 1fr); gap: 24px; padding: 20px 0; border-bottom: 1px solid var(--line); }
  .m img, .m video { display: block; max-width: 100%; max-height: 360px; margin: 0 auto; background: repeating-conic-gradient(#ddd 0 25%, #fff 0 50%) 0 0 / 16px 16px; }
  .k { margin: 0 0 8px; color: var(--ink-2); font-size: 14px; } .n { font-weight: 600; color: var(--rust); }
  .cap { margin: 0 0 8px; } .cap span, .d span { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: var(--ink-2); }
  textarea { width: 100%; box-sizing: border-box; font: inherit; padding: 8px; border: 1px solid var(--line); border-radius: 4px; background: #fff; }
  .act { display: flex; gap: 16px; align-items: center; margin: 8px 0 0; font-size: 14px; } .len { color: var(--ink-2); }
  .row.is-ok textarea { border-color: #2F6E62; } .note { font-size: 13px; color: var(--ink-2); }
  @media (max-width: 800px) { .row { grid-template-columns: 1fr; } }
</style></head>
<body>
<header><h1>Alt text review · ${files.length} files</h1>
<p>Drafts written by looking at each file; nothing here is your copy until you approve it. Edit a draft in place, tick Approved, then Export — the JSON lists every approved or edited file for src/data/alt.ts. Your progress is kept in this browser.</p>
<button type="button" id="export">Export JSON</button></header>
<main>
${rows}
</main>
<script>
  const KEY = 'sv:alt-review';
  let st = {}; try { st = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} };
  for (const row of document.querySelectorAll('.row')) {
    const f = row.dataset.file, ta = row.querySelector('textarea'), ok = row.querySelector('.ok'), len = row.querySelector('.len');
    const orig = ta.value;
    if (st[f]) { ta.value = st[f].alt; ok.checked = !!st[f].ok; }
    const upd = () => { len.textContent = ta.value.length + ' characters'; row.classList.toggle('is-ok', ok.checked); };
    const rec = () => { if (ta.value !== orig || ok.checked) st[f] = { alt: ta.value, ok: ok.checked, edited: ta.value !== orig }; else delete st[f]; save(); upd(); };
    ta.addEventListener('input', rec); ok.addEventListener('change', rec); upd();
  }
  document.getElementById('export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(st, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'alt-review.json' });
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
</script>
</body></html>
`);
  console.log(`review sheet: ${path.relative(ROOT, out)} (${Math.round(fs.statSync(out).size / 1024)} KB)`);
}
process.exit(missing.length ? 1 : 0);
