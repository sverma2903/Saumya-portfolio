#!/usr/bin/env node
/**
 * tools/subset-fonts.mjs · WP7 (SPEC §2.1 fonts, §7.2 budget). Writes the five self-hosted font files that
 * astro.config.mjs serves, as subsets of the fontsource files to the characters this site can render.
 *
 *   node tools/subset-fonts.mjs            regenerate src/assets/fonts/*.woff2 (needs python3 with fonttools + brotli:
 *                                          `pip install fonttools brotli`)
 *   node tools/subset-fonts.mjs --list     print the character set only
 *
 * The fontsource "latin" files carry ≈ 225 characters; the site uses the printable ASCII range and a few dozen more.
 * Kept: printable ASCII (U+0020–007E) and every other character that appears anywhere in src/ (her content, the chrome
 * copy, templates and scripts, comments included, so the set errs on the generous side), each only if the source font
 * has it; every OpenType layout feature (kerning, ligatures, tabular and oldstyle figures, …) with the glyphs they
 * reach; both variation axes (wght + opsz for Newsreader, wght + wdth for Plex Sans); hinting; all name records.
 * Glyph outlines are copied, not re-drawn: every kept character renders exactly as in the full file.
 * Result: 365 KB of fonts → ≈ 240 KB (Newsreader roman 129 → 84 KB, italic 143 → 95, Plex Sans 64 → 42, mono 2 × 9).
 *
 * tests/dist/fonts.test.ts fails when a character on a built page is in a source font but not in its subset (new copy
 * with a new character): run this tool, then rebuild.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src', 'assets', 'fonts');
const NM = path.join(ROOT, 'node_modules');
/** output name → fontsource source (the files P0 configured) */
export const FONTS = {
  'newsreader-roman.woff2': '@fontsource-variable/newsreader/files/newsreader-latin-opsz-normal.woff2',
  'newsreader-italic.woff2': '@fontsource-variable/newsreader/files/newsreader-latin-opsz-italic.woff2',
  'plex-sans.woff2': '@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wdth-normal.woff2',
  'plex-mono-400.woff2': '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2',
  'plex-mono-500.woff2': '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2',
};
const TEXT = /\.(ts|js|mjs|astro|json|css|md|svg|html)$/i;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (TEXT.test(e.name)) out.push(p);
  }
  return out;
}

/** printable ASCII + every non-ASCII code point in src/ */
export function codepoints() {
  const set = new Set();
  for (let c = 0x20; c <= 0x7e; c++) set.add(c);
  for (const f of walk(path.join(ROOT, 'src'))) for (const ch of fs.readFileSync(f, 'utf8')) { const c = ch.codePointAt(0); if (c > 0x7e) set.add(c); }
  return [...set].sort((a, b) => a - b);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const cps = codepoints();
  if (process.argv.includes('--list')) {
    console.log(cps.map((c) => `U+${c.toString(16).toUpperCase().padStart(4, '0')} ${String.fromCodePoint(c)}`).join('\n'));
    process.exit(0);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const list = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sv-subset-')), 'unicodes.txt');
  fs.writeFileSync(list, cps.map((c) => c.toString(16)).join(' '));
  let before = 0, after = 0;
  for (const [name, src] of Object.entries(FONTS)) {
    const from = path.join(NM, src), to = path.join(OUT, name);
    execFileSync('python3', ['-m', 'fontTools.subset', from, `--unicodes-file=${list}`, `--output-file=${to}`, '--flavor=woff2',
      "--layout-features=*", "--layout-scripts=*", '--name-IDs=*', '--name-languages=*', '--name-legacy', '--notdef-outline', '--legacy-kern'], { stdio: 'inherit' });
    const a = fs.statSync(from).size, b = fs.statSync(to).size;
    before += a; after += b;
    console.log(`${name.padEnd(24)} ${(a / 1024).toFixed(1).padStart(6)} KB → ${(b / 1024).toFixed(1).padStart(6)} KB`);
  }
  console.log(`${cps.length} code points · ${(before / 1024).toFixed(0)} KB → ${(after / 1024).toFixed(0)} KB (${OUT})`);
}
