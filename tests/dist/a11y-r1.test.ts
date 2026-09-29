/**
 * Polish r1 (mobile + a11y) · the static half of the fixes; tools/hit-check.mjs covers the hit-testing half.
 *  - every page's Enlarged detail carries a polite status line (steps between figures are said) and its copy
 *  - every page has the quiet announce region (V / U / palette state changes)
 *  - /fun: the narrated video has a visible text alternative under its title block
 *  - /: the live site plan's key hint ships (hidden until the plan is live) with the copy the script wires up
 *  - the viewport meta keeps viewport-fit=cover, and --m carries the safe-area insets (so the cover is safe)
 */
import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { alt } from '@/data/alt';
import { load, PAGES } from './helpers';

describe('a11y r1', () => {
  test.each(PAGES)('%s: detail live region + announce region', (pg) => {
    const { root } = load(pg);
    const dlg = root.querySelector('dialog.detail')!;
    expect(dlg.getAttribute('data-t-live')).toBe('{fig}, {i} of {n}');
    const live = dlg.querySelector('[data-dt-live]')!;
    expect(live.getAttribute('role')).toBe('status');
    expect(live.getAttribute('aria-live')).toBe('polite');
    const say = root.querySelector('[data-announce]')!;
    expect(say.getAttribute('role')).toBe('status');
    expect(say.classList.contains('sr-only')).toBe(true);
  });

  test('/fun: the narrated video has a visible description', () => {
    const { root } = load('fun');
    const d = root.querySelectorAll('details.pin__vt');
    expect(d).toHaveLength(1);
    expect(d[0].querySelector('summary')!.text.trim()).toBe('What the video shows');
    expect(d[0].querySelector('.pin__vt-p')!.text).toBe(alt('6GwunOSeX0YVHJspIvJG7W3Q.mp4'));
  });

  test('/: the site plan key hint and status line', () => {
    const { root } = load('index');
    const plan = root.querySelector('[data-plan]')!;
    expect(plan.getAttribute('role')).toBe('img');
    expect(plan.getAttribute('data-roledesc')).toBe('interactive drawing');
    expect(plan.hasAttribute('tabindex')).toBe(false); // the script makes it a stop only once live
    const hint = root.querySelector('#cover-plan-keys')!;
    expect(hint.hasAttribute('hidden')).toBe(true);
    expect(hint.text).toMatch(/^Arrow keys move the section cut/);
    expect(root.querySelector('[data-plan-status]')!.getAttribute('aria-live')).toBe('polite');
  });

  test('safe area: viewport-fit=cover, and the layout margin takes the side insets', () => {
    const { raw } = load('index');
    expect(raw).toMatch(/viewport-fit=cover/);
    const css = fs.readdirSync(path.resolve('dist/_astro')).filter((f) => f.endsWith('.css')).map((f) => fs.readFileSync(path.resolve('dist/_astro', f), 'utf8')).join('\n') + raw;
    expect(css).toMatch(/--m:\s*max\(var\(--m0\),\s*env\(safe-area-inset-left,\s*0px\),\s*env\(safe-area-inset-right,\s*0px\)\)/);
  });
});
