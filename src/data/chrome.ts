/**
 * chrome.ts · P0 (shared). EVERY UI word we add ("chrome") lives here for owner review (SPEC §0.1.5, App. B, §8.9).
 *
 *  - One exported object per work package (`chrome.wp1`, `chrome.wp3`, …). You may append to YOUR object
 *    without review; merge conflicts here are trivial.
 *  - Labels ship. NARRATIVE lines (marked (N) in Appendix B) are `Narrative` objects and render only when
 *    `approved: true` — always read them through `narrative()`, which returns null until approved.
 *  - Arrow glyphs → ← ↗ are NOT in the font subsets: render them with <Icon>. Keep them out of these strings
 *    (↓ ↑ exist in Plex, so "Go ↓" keeps its arrow). Her own labels live in site.ts `labels`, not here.
 *  - Placeholders use {name}; fill them with `fill()`.
 */

export interface Narrative {
  text: string;
  approved: boolean;
}
const N = (text: string): Narrative => ({ text, approved: false });

/** A narrative line, or null until the owner approves it. */
export function narrative(n: Narrative): string | null {
  return n.approved ? n.text : null;
}

/** Fill {placeholders}: fill('Open sheet {no}', { no: 'A-101' }). */
export function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export const chrome = {
  /** P0 · shared words used by Base.astro and the stubs */
  p0: {
    skip: 'Skip to content',
    opensInNewTab: 'opens in a new tab',
    brand: 'Saumya Verma',
    person: 'Saumya Verma',
    jobTitle: 'Product Designer',
  },

  /** WP1 · title bar, bottom bar, drawer, end sheet, sheet list, 404 */
  wp1: {
    titleBar: {
      primaryNav: 'Primary',
      index: 'Index',
      coverSheet: 'Cover sheet',
      drawingIndex: 'Drawing index',
      about: 'About',
      play: 'Play',
      notInSet: 'Sheet not in set',
      sheetList: 'Sheet list',
      keycapMac: '⌘K',
      keycapOther: 'Ctrl K',
    },
    bottomBar: {
      label: 'Sheet',
      sheets: 'Sheets',
      home: 'Cover sheet',
      openDrawer: 'Open the sheet drawer',
    },
    drawer: {
      title: 'Sheets',
      close: 'Close',
      search: 'Jump to a sheet, or search her words…',
      sheets: 'Sheets',
      levels: 'Levels',
      view: 'View',
      matchLine: 'Match line',
      settings: 'Settings',
    },
    endSheet: {
      drawnBy: 'Drawn by',
      drawnByValue: 'S. Verma',
      location: 'Location',
      locationValue: 'Washington, D.C.',
      localTime: 'Local time',
      set: 'Set',
      setValue: 'A-000 – C-100',
      setYears: '2018–2026',
      settings: 'Settings',
      motion: 'Motion',
      dusk: 'Dusk',
      shortcuts: 'Shortcuts',
      on: 'On',
      off: 'Off',
      copy: 'Copy',
      copied: 'Copied',
      endOfSet: 'End of set',
      linkedin: 'LinkedIn',
      toTop: 'A-000',
      colophon: N('Set in Newsreader and IBM Plex. Drawn once in WebGL on the cover sheet; everything else is HTML.'),
    },
    palette: {
      title: 'Sheet list',
      placeholder: 'Jump to a sheet, or search her words…',
      groups: { sheets: 'Sheets', levels: 'Levels', details: 'Details', passages: 'Passages', actions: 'Actions' },
      footer: 'Passages are her own sentences, cited to where they live. Nothing here is generated.',
      hints: { select: 'select', open: 'open', close: 'close', esc: 'esc' },
      found: '{n} found · verbatim',
      suggestions: ['interviews', 'constraint', 'AI', 'approval', 'journey map'],
      actions: {
        copyEmail: 'Copy email',
        resume: 'Open Resume',
        linkedin: 'LinkedIn',
        planView: 'Plan view',
        sectionView: 'Section view',
        motionOff: 'Motion off',
        motionOn: 'Motion on',
        duskOn: 'Dusk',
        duskOff: 'Vellum',
        keysOff: 'Keyboard shortcuts off',
        keysOn: 'Keyboard shortcuts on',
        showKeys: 'Show keys',
      },
      kinds: { sheet: 'sheet', level: 'level', detail: 'detail', passage: 'passage' },
    },
    notFound: {
      h1: 'Sheet not in set.',
      sheet: 'SHEET 404',
      sheetKey: 'Sheet',
      sheetValue: '404',
      titleKey: 'Title',
      titleValue: '—',
      revKey: 'Rev.',
      revValue: '—',
      drawnByKey: 'Drawn by',
      drawnByValue: 'S. V.',
      back: 'A-000 Drawing index',
      cloud: N('This sheet is not in the set.'),
      revFinal: N('REV. FINAL FINAL FINAL'),
    },
  },

  /** WP2 · the cover sheet (SM1) */
  wp2: {
    hero: {
      coverSheet: 'Cover sheet',
      planHintPointer: 'Site plan · move to cut A–A',
      planHintTouch: 'Site plan · scroll to cut A–A',
      section: 'Section A–A',
      scale: 'Scale 1:500',
      north: 'N',
      el: 'EL',
      planLabel: N('Site plan drawing of the triangle, circle and square mark. Arrow keys move the survey point.'),
    },
  },

  /** WP3 · drawing index + viewport (SM2) */
  wp3: {
    index: {
      coverSheet: 'Cover sheet',
      drawingIndex: 'Drawing index',
      further: 'Further projects',
      also: 'Also in the set',
      colSheet: 'Sheet',
      colTitle: 'Title',
      colRead: 'Read',
      minutes: '≈ {n} min',
      summary: '{n} sheets · 2023–2026 · ≈ {m} min in full',
      external: 'External',
      open: 'Open',
    },
    viewport: {
      viewport: 'Viewport',
      readout: 'Readout',
      citedFrom: 'Cited from',
      open: 'Open sheet {no}',
      external: 'External',
      homeCard: 'Home card',
      enlarge: 'Enlarge',
    },
  },

  /** WP4a · text and data blocks */
  wp4a: {
    permalink: 'Permalink',
    itemsOmitted: '+ {n} items omitted',
    rev: 'Rev.',
  },

  /** WP4b · media system + Enlarged detail */
  wp4b: {
    media: {
      fig: 'Fig.',
      loupe: 'Loupe',
      comparedIn: 'compared in',
      paused: 'Paused',
      play: 'Play',
      pause: 'Pause',
      restart: 'Restart',
      enlarge: 'Enlarge',
      drag: 'Drag',
      scrollable: '{fig}, scrollable',
      enlargeLabel: 'Enlarge {fig}',
    },
    detail: {
      file: 'File',
      native: 'Native',
      size: 'Size',
      original: 'Original file · unaltered',
      fit: 'Fit',
      oneToOne: '1:1',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
      prev: 'Prev',
      next: 'Next',
      close: 'Close',
    },
  },

  /** WP5 · case template + reading tools */
  wp5: {
    case: {
      back: 'A-000 Drawing index',
      cover: 'Cover',
      rev: 'Rev.',
      sheet: 'Sheet',
      levels: '{n} levels',
      sheetInfo: '{no} · {n} levels · ≈ {m} min',
      levelMeta: 'Level {nn} · {elev} · ≈ {m} min',
    },
    view: {
      label: 'View',
      section: 'Section · full text',
      plan: 'Plan · bold only',
      sectionShort: 'Section',
      planShort: 'Plan',
    },
    keyPlan: {
      title: 'Key plan',
      sub: 'One line per level, verbatim',
      go: 'Go ↓',
      goLabel: 'Go to {label}',
    },
    decisions: {
      title: 'Decision schedule',
      sub: 'Verbatim, linked to source',
      no: 'No.',
      considered: 'Considered',
      decided: 'Decided',
      level: 'Level',
      rowNo: 'D-{nn}',
    },
    levels: {
      title: 'Levels',
      level: 'Level {nn}',
      view: 'View',
      matchLine: 'Match line',
      seeSheet: 'See sheet {no}',
      nextSheet: 'Next sheet',
      open: 'Open sheet {no}',
      toIndex: 'A-000 Drawing index',
    },
    plan: {
      omitted: 'Omitted: {counts}',
      show: 'Show',
      hide: 'Hide',
      itemsOmitted: '+ {n} items omitted',
      nouns: {
        paragraph: ['paragraph', 'paragraphs'],
        list: ['list', 'lists'],
        figure: ['figure', 'figures'],
        story: ['user-story set', 'user-story sets'],
        other: ['other', 'other'],
      } as Record<'paragraph' | 'list' | 'figure' | 'story' | 'other', [string, string]>,
    },
  },

  /** WP6 · About + Play */
  wp6: {
    about: {
      sheet: 'B-100',
      title: 'About',
      clause: 'B-100.{n}',
      sketchCaption: N('The linework on the cover sheet is drawn in this hand.'),
      /** figure numbers keyed to the detail bubble they sit under: 'FIG. 1.2' (Historical Fiction, 2nd cover) */
      fig: 'Fig. {d}.{n}',
      /** the dimension string under her portrait (on hover): the file's native width */
      diameter: '{w} px',
      /** the detail bubble is a permalink, as on case pages */
      permalink: '{n}/{sheet}, permalink to {title}',
    },
    play: {
      sheet: 'C-100',
      title: 'Play',
      devpost: 'Devpost',
      openA105: 'Open sheet A-105',
      openA106: 'Open sheet A-106',
      teachablePlay: 'Play · 0:48 · sound',
      legend: 'Legend · DATA / DESIGN / NERDS',
      relay: 'Re-lay tiles',
      tileLetter: '{l} — letter tile, {words}',
      tileMaterial: 'Material tile, {material}',
      gridLabel: 'DATA, DESIGN, NERDS tiles',
      /** joins a letter tile's words: "DESIGN and DATA" */
      wordJoin: ' and ',
      /** the pinned plates' figure numbers (Enlarged detail) */
      fig: 'Fig. {n}',
      /** the legend's word key: the words her letters spell, read as a crossword's (→ across, ↓ down) */
      wordsTitle: 'Words',
      across: 'across',
      down: 'down',
      /** the legend's key: her five colours as drafting materials */
      materialsTitle: 'Materials',
      materials: {
        poche: 'oxblood poché',
        rust: 'rust hatch',
        rustx: 'rust cross-hatch',
        orange: 'orange hatch',
        courses: 'orange courses',
        clay: 'clay stipple',
        blush: 'blush',
        void: 'void',
      } as Record<'poche' | 'rust' | 'rustx' | 'orange' | 'courses' | 'clay' | 'blush' | 'void', string>,
      /** screen-reader help and status for the tiles (visually hidden) */
      gridHint: 'Arrow keys move between tiles. Enter changes a material tile.',
      relaid: 'Tiles re-laid.',
      /** the Teachable-AI player's controls (a fallback until the media system's own controls are present) */
      pause: 'Pause',
      resume: 'Play',
      mute: 'Mute',
      restart: 'Restart',
      playerLabel: 'Video controls',
    },
  },

  /** WP7 · QA / SEO */
  wp7: {
    ogAlt: '{title} — cover plate',
  },
};

/** Every Narrative object in chrome (for the review list and the "all off by default" test). */
export function allNarratives(): { path: string; n: Narrative }[] {
  const out: { path: string; n: Narrative }[] = [];
  const walk = (o: unknown, p: string) => {
    if (o && typeof o === 'object') {
      if ('text' in (o as object) && 'approved' in (o as object)) out.push({ path: p, n: o as Narrative });
      else for (const [k, v] of Object.entries(o as object)) walk(v, p ? `${p}.${k}` : k);
    }
  };
  walk(chrome, '');
  return out;
}
