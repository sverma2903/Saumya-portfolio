/**
 * palette/palette.ts · WP1 (lazy). The Sheet list's UI (SPEC §4.4): a combobox over a listbox of groups
 * Sheets · Levels · Details · Passages · Actions, plus the Keys view (`?`). Loaded by open.ts on intent / first open.
 *
 *  - Index: /search-index.json on first open (pages, levels, details, site passages), then the per-sheet passage
 *    shards when a query reaches 2 characters (the current sheet first). See lib/search-index.ts.
 *  - Keyboard: ↑ ↓ move (wrapping), ↵ opens, Esc closes (native). Nothing animates (law 1): selection scrolls instantly.
 *  - A passage on this sheet: close, bring the sentence into view (instantly when chosen by keyboard, smoothly
 *    otherwise), paint it with the CSS Custom Highlight API (::highlight(cite)) and bracket its block (.is-cited, 4 s).
 *    On another sheet: /<slug>?view=section&cite=<block>#:~:text=… (a native text fragment; Section view forced).
 *  - Passages are her sentences, cited to where they live. Nothing here is generated: every row text is verbatim
 *    from the index; the only additions are <mark class="q"> around the typed query and chrome labels.
 */
import { Corpus, markRanges, search, textDirective, tokens, type Hit } from './search';
import type { MainIndex, ShardIndex } from '../../lib/search-index';
import { get, set, toggle } from '../core/prefs';
import { copyText, toast } from '../core/copy';
import { focusNoScroll, motionOK } from '../core/dom';
import { goLevel, landOn, setViewAnchored } from '../core/shortcuts';
import { closePalette, type OpenOpts } from './open';

// ───────────────────────── index loading ─────────────────────────
let corpus: Corpus | null = null;
let mainReq: Promise<Corpus> | null = null;
const shardReq = new Map<string, Promise<void>>();

function loadMain(): Promise<Corpus> {
  mainReq ??= fetch('/search-index.json')
    .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<MainIndex>; })
    .then((m) => { corpus = new Corpus(m); shardsOf = m.shards; return corpus; })
    .catch((e) => { mainReq = null; throw e; });
  return mainReq;
}
let shardsOf: Record<string, number> = {};

function loadShard(slug: string): Promise<void> {
  let p = shardReq.get(slug);
  if (!p) {
    p = fetch(`/search-index/${slug}.json`)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<ShardIndex>; })
      .then((sh) => { corpus?.addShard(sh); })
      .catch(() => { shardReq.delete(slug); });
    shardReq.set(slug, p);
  }
  return p;
}

/** Every passage shard, the current sheet's first. Resolves when all have landed (or failed). */
function loadShards(): Promise<void> {
  const cur = currentSlug();
  const slugs = Object.keys(shardsOf).sort((a, b) => (a === cur ? -1 : b === cur ? 1 : 0));
  return Promise.all(slugs.map(loadShard)).then(() => undefined);
}

const currentSlug = () => location.pathname.replace(/^\/|\.html$|\/$/g, '');
function currentPage(c: Corpus): number {
  const path = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  return c.pages.findIndex((pg) => pg.kind !== 'external' && pg.href === path);
}

/** Fetch the index (and this sheet's passages) ahead of a query. */
export function warm(): void {
  loadMain().then(() => { const s = currentSlug(); if (s in shardsOf) loadShard(s); }).catch(() => {});
}

// ───────────────────────── DOM ─────────────────────────
interface Ui {
  dlg: HTMLDialogElement;
  input: HTMLInputElement;
  list: HTMLElement;
  home: HTMLElement;
  results: HTMLElement;
  keys: HTMLElement;
  empty: HTMLElement;
  chips: HTMLElement;
  status: HTMLElement;
  t: Record<string, string>;
}
let ui: Ui | null = null;

type Choice = (keyboard: boolean) => void;
let choices = new Map<string, Choice>();
let sel = -1;
let statusTimer = 0;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

/** Her text with the query marked (<mark class="q">); built as nodes, never as HTML. */
function marked(text: string, toks: string[]): DocumentFragment {
  const f = document.createDocumentFragment();
  let at = 0;
  for (const [a, b] of markRanges(text, toks)) {
    if (a > at) f.append(text.slice(at, a));
    f.append(el('mark', 'q', text.slice(a, b)));
    at = b;
  }
  if (at < text.length) f.append(text.slice(at));
  return f;
}

function mount(dlg: HTMLDialogElement): Ui {
  if (ui && ui.dlg === dlg) return ui;
  const q = <T extends HTMLElement>(s: string) => dlg.querySelector<T>(s)!;
  ui = {
    dlg,
    input: q<HTMLInputElement>('[data-pl-input]'),
    list: q('[data-pl-list]'),
    home: q('[data-pl-home]'),
    results: q('[data-pl-results]'),
    keys: q('[data-pl-keys]'),
    empty: q('[data-pl-empty]'),
    chips: q('[data-pl-chips]'),
    status: q('[data-pl-status]'),
    t: JSON.parse(dlg.dataset.t ?? '{}') as Record<string, string>,
  };
  const u = ui;

  u.input.addEventListener('input', () => {
    dlg.dataset.mode = u.input.value.trim() ? 'results' : 'home';
    render();
  });
  u.input.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      move(e.key === 'ArrowDown' ? 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(true);
    }
  });
  u.list.addEventListener('pointermove', (e) => {
    const opt = (e.target as Element).closest<HTMLElement>('[role="option"]');
    if (opt) select(options().indexOf(opt), false);
  });
  u.list.addEventListener('click', (e) => {
    const opt = (e.target as Element).closest<HTMLElement>('[role="option"]');
    if (!opt) return;
    select(options().indexOf(opt), false);
    choose(false);
  });
  u.chips.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-pl-chip]');
    if (!b) return;
    u.input.value = b.dataset.plChip ?? b.textContent ?? '';
    dlg.dataset.mode = 'results';
    u.input.focus();
    render();
  });
  // the backdrop: a click on the <dialog> box itself
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closePalette(); });
  dlg.addEventListener('close', () => {
    window.clearTimeout(statusTimer);
    u.status.textContent = '';
  });
  // the Keys view's own switch lives in the SSR markup (PrefSwitch); its key rows are a plain table
  return u;
}

/** Called by open.ts every time the dialog opens. */
export function opened(dlg: HTMLDialogElement, opts: OpenOpts): void {
  const u = mount(dlg);
  syncActions();
  dlg.dataset.mode = opts.mode === 'keys' ? 'keys' : u.input.value.trim() ? 'results' : 'home';
  render();
  loadMain().then(() => { if (dlg.open) render(); warm(); }).catch(() => {});
}

const options = (): HTMLElement[] => {
  if (!ui) return [];
  const box = ui.dlg.dataset.mode === 'home' ? ui.home : ui.dlg.dataset.mode === 'results' ? ui.results : null;
  return box ? Array.from(box.querySelectorAll<HTMLElement>('[role="option"]')) : [];
};

function select(i: number, scroll = true): void {
  if (!ui) return;
  const opts = options();
  if (!opts.length || i < 0) {
    sel = -1;
    ui.input.removeAttribute('aria-activedescendant');
    return;
  }
  sel = Math.max(0, Math.min(opts.length - 1, i));
  opts.forEach((o, j) => o.setAttribute('aria-selected', String(j === sel)));
  const cur = opts[sel];
  ui.input.setAttribute('aria-activedescendant', cur.id);
  if (scroll) cur.scrollIntoView({ block: 'nearest', behavior: 'instant' as ScrollBehavior });
}

function move(d: 1 | -1): void {
  const n = options().length;
  if (!n) return;
  select(sel < 0 ? (d === 1 ? 0 : n - 1) : (sel + d + n) % n);
}

function choose(keyboard: boolean): void {
  const opt = options()[sel];
  if (!opt) return;
  const fn = choices.get(opt.id) ?? homeChoice(opt);
  fn?.(keyboard);
}

// ───────────────────────── rendering ─────────────────────────
function render(): void {
  if (!ui) return;
  const u = ui;
  const mode = u.dlg.dataset.mode ?? 'home';
  u.home.hidden = mode !== 'home';
  setChips(mode === 'home', false);
  u.results.hidden = mode !== 'results';
  u.keys.hidden = mode !== 'keys';
  u.list.hidden = mode === 'keys';
  u.empty.hidden = true;
  u.input.setAttribute('aria-expanded', String(mode !== 'keys'));
  if (mode === 'results') renderResults(u.input.value);
  select(options().length ? 0 : -1);
}

function renderResults(q: string): void {
  if (!ui) return;
  const u = ui;
  if (!corpus) { // index not here yet: say so, the render reruns when it lands
    u.results.replaceChildren();
    showEmpty(u.t.searching, false);
    return;
  }
  // every pass starts clean: a message left by an earlier pass ("Searching the set") must not outlive it
  u.empty.hidden = true;
  u.list.hidden = false;
  u.input.setAttribute('aria-expanded', 'true');
  setChips(false, false);
  const c = corpus;
  const cur = currentPage(c);
  const toks = tokens(q);
  const wantPassages = q.trim().length >= 2;
  const pending = wantPassages && Object.values(shardsOf).some((p) => !c.hasPassages(p));
  if (pending) loadShards().then(() => { if (ui?.dlg.open && ui.input.value === q) { const keep = sel; renderResults(q); select(keep >= 0 ? keep : 0); } });
  const g = search(c, q, cur);
  const acts = matchActions(toks);
  choices = new Map();
  const frag = document.createDocumentFragment();
  let n = 0;
  const group = (key: string, title: string, meta?: string) => {
    const box = el('div', `pl-grp pl-grp--${key}`);
    box.setAttribute('role', 'group');
    const id = `pl-g-${key}`;
    box.setAttribute('aria-labelledby', id);
    const head = el('div', 'pl-g t-label');
    head.id = id;
    head.setAttribute('aria-hidden', 'true');
    head.append(el('span', undefined, title));
    if (meta) head.append(el('span', 'pl-g__meta', meta));
    box.append(head);
    frag.append(box);
    return box;
  };
  const row = (box: HTMLElement, kind: string, code: Node | string, main: Node[], side: string, fn: Choice) => {
    const o = el('div', `pl-opt pl-opt--${kind}`);
    o.id = `pl-r-${n++}`;
    o.setAttribute('role', 'option');
    o.setAttribute('aria-selected', 'false');
    const cc = el('span', 'pl-opt__code');
    cc.append(code);
    const mm = el('span', 'pl-opt__main');
    mm.append(...main);
    o.append(cc, mm, el('span', 'pl-opt__side t-label', side));
    box.append(o);
    choices.set(o.id, fn);
    return o;
  };
  const k = u.t;
  const pageOf = (p: number) => c.pages[p];

  if (g.sheets.length) {
    const box = group('sheets', k.sheets);
    for (const h of g.sheets) {
      const pg = pageOf(h.e.p);
      const main: Node[] = [spanMarked('pl-opt__t', h.e.t, toks, pg.kind !== 'home')];
      if (h.why) main.push(spanMarked('pl-opt__why', h.why, toks, true));
      row(box, pg.kind === 'external' ? 'external' : 'sheet', pg.kind === 'external' ? arrowIcon() : pg.sheet, main, pg.kind === 'external' ? k.external : k.sheet, (kb) => goSheet(h.e.p, kb));
    }
  }
  if (g.levels.length) {
    const box = group('levels', k.levels);
    for (const h of g.levels) {
      const pg = pageOf(h.e.p);
      const main: Node[] = [spanMarked('pl-opt__t', h.e.t, toks, true), el('span', 'pl-opt__elev', pg.el?.[h.e.c ?? 0] ?? '')];
      row(box, 'level', `${pg.sheet}.${(h.e.c ?? 0) + 1}`, main, k.level, (kb) => goAnchor(h.e.p, h.e.a!, kb, true));
    }
  }
  if (g.details.length) {
    const box = group('details', k.details);
    for (const h of g.details) {
      const pg = pageOf(h.e.p);
      row(box, 'detail', `${pg.sheet}.${(h.e.c ?? 0) + 1}`, [spanMarked('pl-opt__t', h.e.t, toks, true)], k.detail, (kb) => goAnchor(h.e.p, h.e.a!, kb, false));
    }
  }
  if (wantPassages && (g.passages.length || pending)) {
    const meta = g.passages.length ? fillN(k.found, g.passageTotal) : k.searching;
    const box = group('passages', k.passages, meta);
    g.passages.forEach((h, i) => {
      const pg = pageOf(h.e.p);
      const main: Node[] = [];
      if (h.e.lead) main.push(spanMarked('pl-opt__lead', h.e.lead, toks, true));
      main.push(spanMarked('pl-opt__t', h.e.t, toks, true));
      const where = `${pg.sheet} · ${pg.lv?.[h.e.c ?? 0] ?? pg.title}`;
      row(box, 'passage', '¶', main, where, (kb) => goPassage(g.passages, i, kb));
    });
  }
  if (acts.length) {
    const box = group('actions', k.actions);
    for (const a of acts) row(box, 'action', a.icon(), [spanMarked('pl-opt__t', a.label, toks, false)], k.action, a.run);
  }
  const found = n;
  if (found && !acts.length) {
    // no action matched: the six quick actions stand at the foot of the results on one line (§4.4 wireframe)
    const box = group('actions', k.actions);
    const line = el('div', 'pl-tray__in');
    const tray = el('div', 'pl-tray');
    tray.append(line);
    box.append(tray);
    for (const a of quickActions()) {
      const o = el('div', 'pl-opt pl-opt--chip');
      o.id = `pl-r-${n++}`;
      o.setAttribute('role', 'option');
      o.setAttribute('aria-selected', 'false');
      o.append(el('span', 'pl-opt__t', a.label));
      if (a.id === 'resume' || a.id === 'linkedin') o.append(arrowIcon());
      line.append(o);
      choices.set(o.id, a.run);
    }
  }
  u.results.replaceChildren(frag);
  if (!n) showEmpty(pending ? k.searching : k.none, !pending);
  // announce the count (of what was found, not the standing actions) once typing settles
  const count = found + acts.length;
  window.clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => { if (ui) ui.status.textContent = count ? fillN(k.count, count) : k.none; }, 450);
}

function spanMarked(cls: string, text: string, toks: string[], hers: boolean): HTMLElement {
  const s = el('span', cls);
  s.append(marked(text, toks));
  if (hers) s.dataset.v = '';
  return s;
}

function arrowIcon(): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'icon');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', 'M6 18 18 6M9 6h9v9');
  p.setAttribute('fill', 'none');
  p.setAttribute('stroke', 'currentColor');
  p.setAttribute('vector-effect', 'non-scaling-stroke');
  svg.append(p);
  return svg;
}

/** Nothing to list: the message sits right under the field (the empty list is taken out of the flow); after a
 *  finished search that found nothing, the suggestion chips follow it under "Try one of these". */
function showEmpty(msg: string, withHint: boolean): void {
  if (!ui) return;
  ui.empty.hidden = false;
  ui.list.hidden = true;
  ui.input.setAttribute('aria-expanded', 'false');
  const m = ui.empty.querySelector<HTMLElement>('[data-pl-empty-msg]');
  if (m) m.textContent = msg;
  ui.empty.dataset.hint = withHint ? 'on' : 'off';
  setChips(withHint, withHint);
}

/** Show or hide the suggestion chips; after a miss they are introduced as "Try one of these", otherwise "Try". */
function setChips(show: boolean, afterMiss: boolean): void {
  if (!ui) return;
  ui.chips.hidden = !show;
  const l = ui.chips.querySelector<HTMLElement>('[data-pl-chips-label]');
  const want = afterMiss ? ui.t.noneHint : ui.t.tryLabel;
  if (l && want && l.textContent !== want) l.textContent = want;
}

const fillN = (s: string, n: number) => s.replace('{n}', String(n));

function announce(msg: string): void {
  if (!ui) return;
  window.clearTimeout(statusTimer);
  ui.status.textContent = '';
  statusTimer = window.setTimeout(() => { if (ui) ui.status.textContent = msg; }, 60);
}

// ───────────────────────── actions ─────────────────────────
interface Action { id: string; label: string; run: Choice; icon: () => Node }

function actionList(): Action[] {
  if (!ui) return [];
  const t = ui.t;
  const isCase = document.documentElement.dataset.page === 'case';
  const icon = (name: string) => () => {
    const tpl = ui!.dlg.querySelector<HTMLTemplateElement>(`template[data-pl-icon="${name}"]`);
    return tpl ? tpl.content.cloneNode(true) : document.createTextNode('');
  };
  const out: Action[] = [
    { id: 'copy-email', label: t.copyEmail, icon: icon('copy'), run: () => { close(); copyText(t.email).then((ok) => { if (ok) toast(t.copied); }); } },
    { id: 'resume', label: t.resume, icon: icon('arrow-up-right'), run: () => { close(); window.open(t.resumeHref, '_blank', 'noopener'); } },
    { id: 'linkedin', label: t.linkedin, icon: icon('arrow-up-right'), run: () => { close(); window.open(t.linkedinHref, '_blank', 'noopener'); } },
  ];
  if (isCase) {
    out.push({
      id: 'view', label: get('view') === 'plan' ? t.sectionView : t.planView, icon: icon('fit'),
      run: () => { close(); setViewAnchored(); },
    });
  }
  // preferences flip in place (the list stays open); the status region says what just happened
  const flip = (key: 'motion' | 'theme' | 'keys', label: string) => () => { toggle(key); syncActions(); rerun(); announce(label); };
  out.push(
    { id: 'motion', label: get('motion') === 'full' ? t.motionOff : t.motionOn, icon: icon('pause'), run: flip('motion', get('motion') === 'full' ? t.motionOff : t.motionOn) },
    { id: 'theme', label: get('theme') === 'dusk' ? t.duskOff : t.duskOn, icon: icon('sun'), run: flip('theme', get('theme') === 'dusk' ? t.duskOff : t.duskOn) },
    { id: 'keys', label: get('keys') === 'on' ? t.keysOff : t.keysOn, icon: icon('keycap-cmd'), run: flip('keys', get('keys') === 'on' ? t.keysOff : t.keysOn) },
    { id: 'show-keys', label: t.showKeys, icon: icon('keycap-cmd'), run: () => { if (ui) { ui.dlg.dataset.mode = 'keys'; render(); } } },
  );
  return out;
}

/** The standing six (the §4.4 wireframe): Copy email · Open Resume ↗ · Plan view · Motion · Dusk · Shortcuts. */
function quickActions(): Action[] {
  const all = actionList();
  const ids = document.documentElement.dataset.page === 'case'
    ? ['copy-email', 'resume', 'view', 'motion', 'theme', 'keys']
    : ['copy-email', 'resume', 'linkedin', 'motion', 'theme', 'keys'];
  return ids.map((id) => all.find((a) => a.id === id)).filter((a): a is Action => !!a);
}

function matchActions(toks: string[]): Action[] {
  if (!toks.length) return [];
  return actionList().filter((a) => toks.every((t) => a.label.toLowerCase().includes(t))).slice(0, 6);
}

/** Keep the server-rendered Actions rows (empty state) in step with the current preferences. */
function syncActions(): void {
  if (!ui) return;
  const byId = new Map(actionList().map((a) => [a.id, a]));
  ui.home.querySelectorAll<HTMLElement>('[data-act]').forEach((o) => {
    const a = byId.get(o.dataset.act!);
    const t = o.querySelector('.pl-opt__t');
    if (a && t) t.textContent = a.label;
  });
}

function rerun(): void {
  if (!ui) return;
  const keep = sel;
  render();
  select(keep);
}

/** The server-rendered rows (empty state) carry data-go / data-jump / data-act instead of closures. */
function homeChoice(opt: HTMLElement): Choice | undefined {
  if (opt.dataset.act) return actionList().find((a) => a.id === opt.dataset.act)?.run;
  if (opt.dataset.jump) { const id = opt.dataset.jump; return (kb) => { close(); toLevel(id, kb); }; }
  if (opt.dataset.go) { const href = opt.dataset.go; const ext = opt.dataset.ext === ''; return () => { close(); if (ext) window.open(href, '_blank', 'noopener'); else navigate(href); }; }
  return undefined;
}

// ───────────────────────── going places ─────────────────────────
function close(): void {
  closePalette();
}

function navigate(href: string): void {
  if (href === location.pathname + location.search && !href.includes('#')) { scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); return; }
  location.href = href;
}

function goSheet(p: number, _kb: boolean): void {
  const pg = corpus!.pages[p];
  close();
  if (pg.kind === 'external') window.open(pg.href, '_blank', 'noopener');
  else navigate(pg.href);
}

function isHere(p: number): boolean {
  return !!corpus && currentPage(corpus) === p;
}

function goAnchor(p: number, id: string, keyboard: boolean, level: boolean): void {
  const pg = corpus!.pages[p];
  close();
  if (!isHere(p)) { location.href = `${pg.href}#${id}`; return; }
  const target = document.getElementById(id);
  if (!target) return;
  if (level) { toLevel(id, keyboard); return; }
  landOn(target, { block: 'start', smooth: !keyboard && motionOK() });
  focusNoScroll(target);
}

/** A level on this sheet: like J/K, its heading takes focus (keys → instant; pointer → smooth when Motion is on). */
function toLevel(id: string, keyboard: boolean): void {
  const target = document.getElementById(id);
  if (!target) return;
  if (keyboard) { goLevel(id); return; }
  landOn(target, { block: 'start', smooth: motionOK() });
  focusNoScroll(document.getElementById(`${id}-h`) ?? target);
}

function goPassage(list: Hit[], i: number, keyboard: boolean): void {
  const e = list[i].e;
  const pg = corpus!.pages[e.p];
  // neighbours inside the same element text (for a text-fragment prefix/suffix that is guaranteed adjacent)
  const all = corpus!.entries;
  const at = all.indexOf(e);
  const prev = e.j && at > 0 ? all[at - 1].t : undefined;
  const next = at >= 0 && all[at + 1]?.j && all[at + 1].p === e.p ? all[at + 1].t : undefined;
  close();
  if (!isHere(e.p)) {
    const params = pg.kind === 'case' ? `?view=section${e.a ? `&cite=${encodeURIComponent(e.a)}` : ''}` : '';
    location.href = `${pg.href}${params}#${textDirective(e.t, prev, next)}`;
    return;
  }
  cite(e.a ? document.getElementById(e.a) : findHost(e.t), e.t, keyboard);
}

/** A block that holds `sentence` on this page (site pages have no block ids). */
function findHost(sentence: string): HTMLElement | null {
  const key = sentence.slice(0, 48);
  for (const n of document.querySelectorAll<HTMLElement>('main [data-v]')) {
    if ((n.textContent ?? '').replace(/\s+/g, ' ').includes(key)) return n;
  }
  return null;
}

const rendered = (n: Element | null) => !!n && n.getClientRects().length > 0;

let citeTimer = 0;
function cite(block: HTMLElement | null, sentence: string, keyboard: boolean): void {
  if (!block) return;
  let range = findRange(block, sentence);
  // Plan view (or a closed omit run) may hide it: show Section view for this visit, without persisting it
  if (!rendered(range?.startContainer.parentElement ?? block)) {
    if (get('view') === 'plan') set('view', 'section', { persist: false });
    range = findRange(block, sentence);
  }
  landOn(block, {
    block: 'center',
    smooth: !keyboard && motionOK(),
    rect: () => (range && range.getClientRects().length ? range.getBoundingClientRect() : block.getBoundingClientRect()),
  });
  const H = (window as unknown as { Highlight?: new (...r: Range[]) => unknown }).Highlight;
  const reg = (CSS as unknown as { highlights?: Map<string, unknown> }).highlights;
  if (range && H && reg) reg.set('cite', new H(range));
  document.querySelectorAll('.is-cited').forEach((x) => x.classList.remove('is-cited'));
  block.classList.add('is-cited');
  window.clearTimeout(citeTimer);
  citeTimer = window.setTimeout(() => block.classList.remove('is-cited'), 4000);
  if (keyboard) focusNoScroll(block);
  // the painted sentence stays until the reader moves on
  const clear = () => { reg?.delete('cite'); removeEventListener('pointerdown', clear); };
  setTimeout(() => addEventListener('pointerdown', clear, { once: true }), 0);
}

/**
 * The Range of `sentence` inside `root`, over her visible text only (chrome, skims and screen-reader-only text are
 * skipped; <br> counts as a space, as in lib/text.ts stripHtml).
 */
function findRange(root: Element, sentence: string): Range | null {
  const skip = '[data-chrome], .skim, .sr-only, [aria-hidden="true"], script, style, noscript';
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode(n) {
      if (n.nodeType === 1) {
        const e = n as Element;
        if (e.matches(skip)) return NodeFilter.FILTER_REJECT;
        return e.tagName === 'BR' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let norm = '';
  const map: ([Text, number] | null)[] = [];
  let space = true;
  const pushSpace = (at: [Text, number] | null) => { if (!space) { norm += ' '; map.push(at); space = true; } };
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeType === 1) { pushSpace(null); continue; }
    const t = n as Text;
    const s = t.data;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (/[\s ​]/.test(ch)) { if (ch !== '​') pushSpace([t, i]); continue; }
      norm += ch;
      map.push([t, i]);
      space = false;
    }
  }
  let i = norm.indexOf(sentence);
  let len = sentence.length;
  if (i < 0) { // tolerate a chrome split we did not see: match its opening words
    const head = sentence.slice(0, 40);
    i = norm.indexOf(head);
    len = head.length;
  }
  if (i < 0) return null;
  const find = (from: number, dir: 1 | -1) => { for (let k = from; k >= 0 && k < map.length; k += dir) if (map[k]) return map[k]!; return null; };
  const a = find(i, 1);
  const b = find(i + len - 1, -1);
  if (!a || !b) return null;
  const r = document.createRange();
  r.setStart(a[0], a[1]);
  r.setEnd(b[0], b[1] + 1);
  return r;
}
