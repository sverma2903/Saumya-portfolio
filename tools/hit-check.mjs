#!/usr/bin/env node
/**
 * tools/hit-check.mjs · polish r1 (a11y). Every control drawn over a raised hit surface must win its own hit test.
 *
 *   node tools/hit-check.mjs [--routes=/fun,/pff] [--widths=1440,390] [--base=URL]
 *
 * A plate's Enlarge surface (button.plate__open) and a card's stretched link (.matchline__title::after) cover the
 * media they sit on; the media controls (Pause / Play, Restart, Mute, Enlarge) are drawn over them. If a control's
 * layer loses (same z-index, later in the DOM, or trapped inside a stacking context such as a plate's
 * view-transition-name), a click on Pause opens the Enlarged detail or follows the card's link, and the control can
 * never be used with a pointer (SC 2.2.2 in practice). For every visible control button in [data-mc] / .mc, and the
 * home Viewport's ⤢ and Pause, the element at its centre must be the button itself (or inside it). Exits 1 on any
 * miss. 390 runs with touch (coarse pointer: the overlay is always shown and its buttons are 44px).
 */
import { browser, closeBrowser, ROUTES, withServer } from './shoot.mjs';

const argv = process.argv.slice(2);
const kv = Object.fromEntries(argv.filter((a) => a.startsWith('--') && a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(2, i), a.slice(i + 1)]; }));
const list = (k, d) => (kv[k] ? kv[k].split(',').map((s) => s.trim()).filter(Boolean) : d);
const routes = list('routes', ROUTES.filter((r) => r !== '/nope'));
const widths = list('widths', ['1440', '390']).map(Number);
const HEIGHT = { 1440: 900, 1280: 720, 1024: 768, 834: 1112, 390: 844 };

const misses = [];
let checked = 0;
await withServer(async (base) => {
  const b = await browser();
  for (const w of widths) {
    const touch = w < 768;
    for (const route of routes) {
      const ctx = await b.newContext({ viewport: { width: w, height: HEIGHT[w] ?? 900 }, hasTouch: touch, isMobile: touch });
      const pg = await ctx.newPage();
      await pg.goto(base + route, { waitUntil: 'load' });
      await pg.evaluate(() => document.fonts.ready);
      if (route === '/' && w >= 1024) await pg.evaluate(() => document.querySelector('#index')?.scrollIntoView());
      const buttons = await pg.$$('[data-mc] button, .mc button, [data-vp-enlarge], [data-vp-pause]');
      for (const btn of buttons) {
        if (!(await btn.evaluate((e) => !!e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden'))) continue;
        await btn.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await pg.waitForTimeout(40);
        const r = await btn.evaluate((e) => {
          const bb = e.getBoundingClientRect();
          const hit = document.elementFromPoint(bb.x + bb.width / 2, bb.y + bb.height / 2);
          const name = (x) => (x ? `${x.tagName.toLowerCase()}.${[...x.classList].join('.')}${x.getAttribute('aria-label') ? `[${x.getAttribute('aria-label')}]` : ''}` : 'nothing');
          return { ok: !!hit && (hit === e || e.contains(hit)), me: name(e), hit: name(hit) };
        });
        checked++;
        if (!r.ok) misses.push(`${route} @${w}: ${r.me} is covered by ${r.hit}`);
      }
      await ctx.close();
    }
  }
});
await closeBrowser();
console.log(`hit-check: ${checked} controls checked, ${misses.length} covered`);
for (const m of misses) console.log('  ✗', m);
process.exit(misses.length ? 1 : 0);
