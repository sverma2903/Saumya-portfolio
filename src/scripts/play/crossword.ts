/**
 * crossword.ts · WP6 (SPEC §5.4). The DATA / DESIGN / NERDS legend on Play.
 *
 * The server renders her grid as one labelled image (role=img, readable without JS). This module upgrades it in place:
 *   · an ARIA grid: rows, gridcells; letter tiles are focusable cells named by their words, material tiles hold a
 *     <button> named by its material ("Material tile, rust hatch"); one roving tab stop
 *   · arrows move (no wrap), Home/End go to the row's ends, Ctrl+Home/End to the grid's; nothing animates on keys
 *   · Enter / Space / click on a material tile turns it to the next material of the key (announced politely)
 *   · "Re-lay tiles" shuffles the materials of the material tiles: each swatch flies from its old cell to its new one
 *     (FLIP: 240ms = --dur-2 + ½ --dur-1, an 18ms stagger, --ease-pen; §5.4), or lands at once under reduced motion
 *     (every duration token is 0.01ms there) or when the button is pressed from the keyboard (motion law 1)
 *   · the keys and the grid point at each other: hovering / focusing a tile lights its key rows (a letter's words, a
 *     material tile's material); hovering a key row lights the tiles it names
 * The key is the source of the material list (id, name, pattern, colour), so no copy or colour is bundled here.
 */
import { motionOK } from '../core/dom';

const root = document.querySelector<HTMLElement>('[data-xw-root]');
if (root) init(root);

interface Mat { id: string; name: string; p: string; c: string }

function init(root: HTMLElement): void {
  const grid = root.querySelector<HTMLElement>('[data-xw]');
  if (!grid) return;
  const status = root.querySelector<HTMLElement>('[data-xw-status]');
  const tpl = root.dataset.lMat ?? '{material}';
  const relaid = root.dataset.lRelaid ?? '';

  // ---------- the materials, read from the key ----------
  const keyRows = new Map<string, HTMLElement>();
  const mats: Mat[] = [];
  for (const li of root.querySelectorAll<HTMLElement>('[data-key-mat]')) {
    const id = li.dataset.keyMat ?? '';
    const sw = li.querySelector<HTMLElement>('.xw__m');
    keyRows.set(id, li);
    mats.push({ id, name: li.querySelector('[data-name]')?.textContent?.trim() ?? id, p: sw?.dataset.p ?? '', c: sw?.style.getPropertyValue('--_c') ?? '' });
  }
  const matOf = (id: string): Mat | undefined => mats.find((m) => m.id === id);
  const label = (id: string) => tpl.replace('{material}', matOf(id)?.name ?? id);

  // ---------- upgrade: role=img → role=grid ----------
  grid.setAttribute('role', 'grid');
  // the keyboard hint is true only now that there are tiles to walk and materials to change
  if (root.querySelector('#legend-hint')) grid.setAttribute('aria-describedby', 'legend-hint');
  const rows = [...grid.querySelectorAll<HTMLElement>('[data-xw-row]')];
  const focusables: HTMLElement[][] = rows.map((row) => {
    row.setAttribute('role', 'row');
    return [...row.querySelectorAll<HTMLElement>('[data-xw-cell]')].map((cell) => {
      cell.setAttribute('role', 'gridcell');
      if (cell.dataset.mat) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'xw__btn';
        b.tabIndex = -1;
        b.setAttribute('aria-label', cell.dataset.label ?? '');
        const sw = cell.querySelector<HTMLElement>('.xw__m');
        if (sw) b.append(sw);
        cell.append(b);
        return b;
      }
      cell.tabIndex = -1;
      cell.setAttribute('aria-label', cell.dataset.label ?? '');
      return cell;
    });
  });
  const flat = focusables.flat();
  let current = flat[0];
  if (current) current.tabIndex = 0;
  const buttons = flat.filter((el): el is HTMLButtonElement => el instanceof HTMLButtonElement);

  const say = (text: string) => {
    if (!status) return;
    status.textContent = '';
    requestAnimationFrame(() => { status.textContent = text; });
  };

  // ---------- roving focus ----------
  const posOf = (el: Element): [number, number] => {
    for (let r = 0; r < focusables.length; r++) {
      const c = focusables[r].indexOf(el as HTMLElement);
      if (c >= 0) return [r, c];
    }
    return [0, 0];
  };
  const moveTo = (el: HTMLElement | undefined) => {
    if (!el) return;
    if (current !== el) { current.tabIndex = -1; el.tabIndex = 0; current = el; }
    el.focus();
  };
  grid.addEventListener('focusin', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-xw-cell], .xw__btn');
    const el = t && flat.includes(t) ? t : null;
    if (el && el !== current) { current.tabIndex = -1; el.tabIndex = 0; current = el; }
    point(el);
  });
  grid.addEventListener('focusout', (e) => {
    if (!grid.contains(e.relatedTarget as Node | null)) point(null);
  });
  grid.addEventListener('keydown', (e) => {
    const [r, c] = posOf(document.activeElement ?? current);
    const last = focusables.length - 1;
    let next: HTMLElement | undefined;
    switch (e.key) {
      case 'ArrowRight': next = focusables[r][c + 1]; break;
      case 'ArrowLeft': next = focusables[r][c - 1]; break;
      case 'ArrowDown': next = focusables[r + 1]?.[c]; break;
      case 'ArrowUp': next = focusables[r - 1]?.[c]; break;
      case 'Home': next = e.ctrlKey || e.metaKey ? focusables[0][0] : focusables[r][0]; break;
      case 'End': next = e.ctrlKey || e.metaKey ? focusables[last][focusables[last].length - 1] : focusables[r][focusables[r].length - 1]; break;
      case ' ':
      case 'Enter':
        // a letter tile does nothing when pressed, and Space must not scroll the page out from under it; a material
        // tile is a <button> and keeps its native activation
        if (!(e.target as Element).closest('.xw__btn')) e.preventDefault();
        return;
      default: return;
    }
    e.preventDefault();
    moveTo(next);
  });

  // ---------- materials: cycle one tile ----------
  const swatchOf = (b: HTMLElement) => b.querySelector<HTMLElement>('.xw__m');
  const setMat = (b: HTMLElement, sw: HTMLElement, id: string) => {
    const m = matOf(id);
    if (!m) return;
    sw.dataset.mat = id;
    sw.dataset.p = m.p;
    sw.style.setProperty('--_c', m.c);
    b.setAttribute('aria-label', label(id));
    const cell = b.parentElement;
    if (cell) cell.dataset.mat = id;
  };
  for (const b of buttons) {
    b.addEventListener('click', (e) => {
      const sw = swatchOf(b);
      if (!sw) return;
      const i = mats.findIndex((m) => m.id === sw.dataset.mat);
      const next = mats[(i + 1) % mats.length];
      setMat(b, sw, next.id);
      point(b);
      say(label(next.id));
      // a pointer press gets a small settle; a key press lands at once (law 1)
      if (e.detail > 0 && motionOK()) {
        sw.animate([{ scale: 0.82 }, { scale: 1 }], { duration: ms('--dur-2'), easing: token('--ease-pen') });
      }
    });
  }

  // ---------- Re-lay tiles ----------
  const relay = root.querySelector<HTMLButtonElement>('[data-xw-relay]');
  relay?.addEventListener('click', (e) => {
    const sws = buttons.map(swatchOf).filter((s): s is HTMLElement => !!s);
    if (sws.length !== buttons.length) return;
    for (const s of sws) for (const a of s.getAnimations()) a.finish();
    const animate = e.detail > 0 && motionOK();
    const first = animate ? sws.map((s) => s.getBoundingClientRect()) : [];
    const perm = shuffle(sws.map((_, i) => i));
    // cell k receives the swatch that stood in cell perm[k]
    const moved = perm.map((from) => sws[from]);
    buttons.forEach((b, k) => {
      const sw = moved[k];
      b.append(sw);
      b.setAttribute('aria-label', label(sw.dataset.mat ?? ''));
      if (b.parentElement) b.parentElement.dataset.mat = sw.dataset.mat ?? '';
    });
    if (animate) {
      const dur = ms('--dur-2') + ms('--dur-1') / 2; // 240ms
      const stagger = dur * 0.075; // 18ms
      const ease = token('--ease-pen');
      moved.forEach((sw, k) => {
        const f = first[perm[k]];
        const l = sw.getBoundingClientRect();
        const dx = f.left - l.left;
        const dy = f.top - l.top;
        if (!dx && !dy) return;
        sw.classList.add('is-flying');
        const a = sw.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0 0' }], { duration: dur, delay: k * stagger, easing: ease, fill: 'backwards' });
        a.finished.then(() => sw.classList.remove('is-flying'), () => sw.classList.remove('is-flying'));
      });
    }
    say(relaid);
  });

  // ---------- the keys ↔ the tiles ----------
  // words: each key row lists the cells it runs through ("0.0 0.1 0.2 0.3"); letter cells carry their own (data-at)
  const wordRows = [...root.querySelectorAll<HTMLElement>('[data-key-word]')].map((li) => ({ li, at: new Set((li.dataset.keyWord ?? '').split(' ')) }));
  const letters = new Map<string, HTMLElement>();
  for (const cell of grid.querySelectorAll<HTMLElement>('[data-at]')) letters.set(cell.dataset.at ?? '', cell);
  function matAt(el: Element | null): string | null {
    if (!el) return null;
    const b = el.closest('.xw__btn');
    return b ? (swatchOf(b as HTMLElement)?.dataset.mat ?? null) : null;
  }
  /** light the key rows for the tile under the pointer / focus (null: none) */
  function point(el: Element | null): void {
    const mat = matAt(el);
    for (const [k, li] of keyRows) li.classList.toggle('is-lit', k === mat);
    const at = el?.closest<HTMLElement>('[data-at]')?.dataset.at;
    for (const w of wordRows) w.li.classList.toggle('is-lit', !!at && w.at.has(at));
  }
  grid.addEventListener('pointerover', (e) => point(e.target as Element));
  grid.addEventListener('pointerleave', () => {
    const a = document.activeElement;
    point(a && grid.contains(a) ? a : null);
  });
  // a key row points at its tiles: they are lit (their cells too, so the grid can step every other tile back)
  const cellOf = (el: HTMLElement) => el.closest<HTMLElement>('[data-xw-cell]');
  const unpoint = () => {
    delete grid.dataset.pointing;
    for (const el of grid.querySelectorAll('.is-lit')) el.classList.remove('is-lit');
  };
  for (const [id, li] of keyRows) {
    li.addEventListener('pointerenter', () => {
      grid.dataset.pointing = '';
      for (const b of buttons) {
        const on = swatchOf(b)?.dataset.mat === id;
        b.classList.toggle('is-lit', on);
        cellOf(b)?.classList.toggle('is-lit', on);
      }
    });
    li.addEventListener('pointerleave', unpoint);
  }
  for (const w of wordRows) {
    w.li.addEventListener('pointerenter', () => {
      grid.dataset.pointing = '';
      for (const a of w.at) letters.get(a)?.classList.add('is-lit');
    });
    w.li.addEventListener('pointerleave', unpoint);
  }
}

/** Fisher–Yates; never returns the identity (a re-lay always moves something). */
function shuffle(a: number[]): number[] {
  const out = [...a];
  do {
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
  } while (out.length > 1 && out.every((v, i) => v === i));
  return out;
}

/** A duration token in ms (0.01ms under reduced motion, so the FLIP collapses to nothing). */
function ms(name: string): number {
  const v = token(name);
  const n = parseFloat(v);
  return v.endsWith('ms') ? n : n * 1000;
}
function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
