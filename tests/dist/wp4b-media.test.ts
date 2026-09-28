/**
 * WP4b · the media system's markup contracts in the built pages (run after `astro build`).
 * Loading policy (§6.3/§7.2), no-JS twins, the section cut, the Highlights player, the phone walkthroughs, the
 * Enlarged detail's facts.
 */
import { beforeAll, describe, expect, test } from 'vitest';
import { distExists, load, PAGES } from './helpers';

beforeAll(() => {
  if (!distExists()) throw new Error('dist/ is missing — run `npm run build` first.');
});

describe.each(PAGES)('%s · media loading policy', (page) => {
  test('GIFs and videos carry no src in HTML (only the page LCP GIF), and each (but that one) has a <noscript> twin', () => {
    const { root } = load(page);
    const gifs = root.querySelectorAll('img[data-gif]');
    const eager = gifs.filter((g) => g.hasAttribute('src'));
    if (page === 'csbs') {
      // the CSBS cover GIF is the page's LCP: fetchpriority high, painted early (§7.2)
      expect(eager.map((g) => g.getAttribute('src'))).toEqual(['/media/hc5LSNViBiB98sAACx272BNZYw.gif']);
      expect(eager[0].getAttribute('fetchpriority')).toBe('high');
    } else {
      expect(eager).toHaveLength(0);
    }
    for (const g of gifs) {
      expect(g.getAttribute('data-src') ?? g.getAttribute('src'), 'a GIF without a source').toBeTruthy();
      expect(Number(g.getAttribute('width')) > 0 && Number(g.getAttribute('height')) > 0).toBe(true);
    }
    const vids = root.querySelectorAll('video[data-vid]');
    for (const v of vids) {
      expect(v.hasAttribute('src')).toBe(false);
      expect(v.getAttribute('preload')).toBe('none');
      expect(v.hasAttribute('playsinline')).toBe(true);
      expect(v.hasAttribute('autoplay')).toBe(false);
    }
    const twins = root.querySelectorAll('noscript').map((n) => n.innerHTML);
    // the LCP GIF has a real src, so it renders without JS by itself: a twin would paint it twice
    for (const m of [...gifs.filter((g) => !g.hasAttribute('src')), ...vids]) {
      const src = (m.getAttribute('data-src') ?? m.getAttribute('src') ?? '').replace(/#t=[\d.]+$/, '');
      expect(twins.some((t) => t.includes(`src="${src}"`)), `no <noscript> twin for ${src}`).toBe(true);
    }
  });

  test('an image without a name (alt "") is never described (presentation-role conflict); videos may be', () => {
    const { root } = load(page);
    for (const img of root.querySelectorAll('img[aria-describedby]')) {
      expect(img.getAttribute('alt'), img.getAttribute('src') ?? img.getAttribute('data-src') ?? '').not.toBe('');
    }
  });

  test('every numbered figure carries the Enlarged-detail facts (native px, real format, size)', () => {
    const { root } = load(page);
    for (const p of root.querySelectorAll('[data-plate][data-fig-no]')) {
      expect(p.getAttribute('data-native'), p.getAttribute('data-file') ?? '').toMatch(/^\d+×\d+$/);
      expect(p.getAttribute('data-fmt')).toMatch(/^(PNG|JPG|GIF|WEBP|MP4|SVG)$/);
      expect(p.getAttribute('data-size')).toMatch(/^[\d.]+ (B|KB|MB)$/);
    }
  });
});

describe('the section cut A–A (Cloudflare W4)', () => {
  test('one compare: a labelled native range at 42 %, a JS-only Loupe toggle, both files present', () => {
    const { root } = load('cloudflare');
    const cmp = root.querySelectorAll('[data-compare]');
    expect(cmp).toHaveLength(1);
    const range = cmp[0].querySelector('input[type=range]')!;
    expect(range.getAttribute('value')).toBe('42');
    expect(range.getAttribute('aria-label')).toBeTruthy();
    expect(range.getAttribute('oninput')).toContain('--x'); // works before (and without) the module
    const mode = cmp[0].querySelector('[data-compare-mode]')!;
    expect(mode.getAttribute('aria-pressed')).toBe('false');
    expect(mode.hasAttribute('data-js-only')).toBe(true);
    const imgs = cmp[0].querySelectorAll('img').map((i) => i.getAttribute('src'));
    expect(imgs).toContain('/media/lR8M0Y29rJGG4GIE3nmmHsmo08.jpg');
    expect(imgs).toContain('/media/iaZFTmw1LjJ6sFQCiaDCjYl5wOU.jpg');
  });
});

describe('the Highlights player (PFF)', () => {
  test('five steps, each with her lede and one panel; the GIF first, then four videos', () => {
    const { root } = load('pff');
    const player = root.querySelector('[data-player]')!;
    expect(player).toBeTruthy();
    const tabs = player.querySelectorAll('[data-player-tab]');
    const panels = player.querySelectorAll('[data-player-panel]');
    expect(tabs).toHaveLength(5);
    expect(panels).toHaveLength(5);
    for (const t of tabs) expect(t.querySelector('[data-v]')?.text.trim().length).toBeGreaterThan(20);
    expect(panels[0].querySelector('img[data-gif]')).toBeTruthy();
    for (const p of panels.slice(1)) expect(p.querySelector('video[data-vid]')).toBeTruthy();
    // the tabs pattern is applied by script at ≥ 1024 only: the HTML is a plain, readable list
    expect(player.querySelector('[role=tablist]')).toBeNull();
  });
});

describe('phone walkthroughs', () => {
  test.each([
    ['u-up', ['fvgOb7', 'sXzdMl', 'LDyuw9']],
    ['educademy', ['so2bh2', 'n8B6Uj', 'so2bh2']],
  ] as const)('%s: stacked steps with their phones; the sticky stage waits for script', (page, files) => {
    const { root } = load(page);
    const run = root.querySelector('[data-renderer="phone"]')!;
    expect(run).toBeTruthy();
    const steps = run.querySelectorAll('[data-walk-step]');
    expect(steps.map((s) => (s.querySelector('[data-plate]')?.getAttribute('data-file') ?? '').slice(0, 6))).toEqual([...files]);
    const stage = run.querySelector('[data-walk-stage]')!;
    expect(stage.hasAttribute('hidden')).toBe(true);
    expect(stage.querySelectorAll('img[src]')).toHaveLength(0);
  });
});

describe('the Enlarged detail dialog', () => {
  test('a labelled, described native dialog with facts, zoom and navigation', () => {
    const { root } = load('cloudflare');
    const d = root.querySelector('dialog.detail')!;
    expect(d.getAttribute('aria-labelledby')).toBe('dt-fig');
    expect(d.getAttribute('aria-describedby')).toBe('dt-cap');
    for (const act of ['fit', 'one', 'in', 'out', 'prev', 'next', 'close']) {
      expect(d.querySelector(`[data-dt-act="${act}"]`), act).toBeTruthy();
    }
    expect(d.querySelector('dl')).toBeTruthy();
  });
});

describe('mobile strips', () => {
  test('the PFF phone row scrolls inside a row strip (each phone keeps its own Enlarge; no strip-wide button)', () => {
    const { root } = load('pff');
    const strip = root.querySelector('[data-strip].strip--row')!;
    expect(strip).toBeTruthy();
    expect(strip.querySelectorAll('.gallery--phones [data-plate]')).toHaveLength(6);
    expect(strip.querySelector('[data-strip-enlarge]')).toBeNull();
    expect(strip.querySelector('[data-strip-win]')?.getAttribute('data-label')).toMatch(/^FIG\. \d+\.\d+, scrollable$/);
  });
  test('the Cloudflare configuration-flow diagram is an image strip with a labelled Enlarge button', () => {
    const { root } = load('cloudflare');
    const plate = root.querySelector('[data-plate][data-file="WgCbjKzHjiwauZbYEdrJmoKdl7Q.jpg"]')!;
    const strip = plate.closest('[data-strip]')!;
    expect(strip.classList.contains('strip--image')).toBe(true);
    expect(strip.querySelector('[data-strip-enlarge]')?.getAttribute('aria-label')).toMatch(/^Enlarge FIG\. \d+\.\d+/);
    expect(plate.getAttribute('data-fmt')).toBe('PNG'); // a .jpg name, PNG bytes: the detail reports the truth
  });
});
