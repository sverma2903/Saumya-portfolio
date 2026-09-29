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
      index: 'Work',
      coverSheet: 'Cover sheet',
      drawingIndex: 'Drawing index',
      about: 'About',
      play: 'Play',
      notInSet: 'Sheet not in set',
      sheetList: 'Search',
      keycapMac: '⌘K',
      keycapOther: 'Ctrl K',
      level: 'level',
    },
    bottomBar: {
      label: 'Sheet',
      sheets: 'Menu',
      home: 'Cover sheet',
      openDrawer: 'Open the menu',
      level: 'Level',
    },
    drawer: {
      title: 'Menu',
      close: 'Close',
      search: 'Search projects and writing…',
      sheets: 'Pages',
      levels: 'Levels',
      view: 'View',
      matchLine: 'Next project',
      seeSheet: '{no}',
      settings: 'Settings',
      searchLabel: 'Search projects and writing',
      handle: 'Drag down to close',
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
      copyLabel: 'Copy email address',
      copied: 'Copied',
      emailLabel: 'Email',
      endOfSet: 'End of set',
      linkedin: 'LinkedIn',
      toTop: 'A-000',
      colophon: N('Set in Newsreader and IBM Plex. Drawn once in WebGL on the cover sheet; everything else is HTML.'),
      /** its visible text ("A-000") leads, so a voice user can say what they see (WCAG 2.5.3; integration axe run) */
      toTopHome: 'A-000, back to the top of the cover sheet',
      toTopOther: 'A-000 Cover sheet',
    },
    /** the running footer repeated on every printed page (§4.10) */
    print: {
      foot: '{sheet} · {title} · {person} · {url}',
      domain: 'saumya-verma.com',
    },
    palette: {
      title: 'Search',
      placeholder: 'Search projects and writing…',
      groups: { sheets: 'Pages', levels: 'Levels', details: 'Details', passages: 'Passages', actions: 'Actions' },
      footer: 'A passage opens where it sits in its case study.',
      hints: { select: 'select', open: 'open', close: 'close', esc: 'esc' },
      found: '{n} found',
      suggestions: ['interviews', 'constraint', 'AI', 'approval', 'journey map'],
      actions: {
        copyEmail: 'Copy email',
        resume: 'Open Resume',
        linkedin: 'LinkedIn',
        planView: 'Skim (bold only)',
        sectionView: 'Full story',
        motionOff: 'Motion off',
        motionOn: 'Motion on',
        duskOn: 'Dusk',
        duskOff: 'Vellum',
        keysOff: 'Keyboard shortcuts off',
        keysOn: 'Keyboard shortcuts on',
        showKeys: 'Show keys',
      },
      kinds: { sheet: 'page', level: 'section', detail: 'detail', passage: 'passage', action: 'action', external: 'external' },
      close: 'Close',
      results: 'Results',
      searching: 'Searching',
      none: 'Nothing matches',
      noneHint: 'Try one of these',
      tryLabel: 'Try',
      suggestLabel: 'Suggested searches',
      count: '{n} results',
      keys: {
        title: 'Keys',
        sub: 'Single keys can be switched off; {mod} always works',
        off: 'Single-key shortcuts are off',
        rows: [
          { keys: ['mod+k'], label: 'Search', where: 'Everywhere' },
          { keys: ['/'], label: 'Search', where: 'Everywhere' },
          { keys: ['J', 'K'], label: 'Next / previous project', where: 'Home' },
          { keys: ['J', 'K'], label: 'Next / previous section', where: 'Case studies' },
          { keys: ['V'], label: 'Full story / Skim', where: 'Case studies' },
          { keys: ['U'], label: 'Cut / Loupe', where: 'Section cut A–A' },
          { keys: ['I'], label: 'Enlarge the nearest figure', where: 'Cases, About, Play' },
          { keys: ['?'], label: 'These keys', where: 'Everywhere' },
          { keys: ['Esc'], label: 'Close', where: 'Dialogs, drawer' },
        ] as { keys: string[]; label: string; where: string }[],
      },
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
      back: 'All work',
      requested: 'Requested',
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
      /** the same line with the year span computed from her date tags (DrawingIndex) */
      summaryYears: '{n} sheets · {from}–{to} · ≈ {m} min in full',
      external: 'External',
      open: 'Read case study',
      /** the Viewport's way in for B-100 / C-100 (her title) */
      visit: 'Go to {title}',
    },
    viewport: {
      viewport: 'Viewport',
      readout: 'Readout',
      citedFrom: 'From',
      open: 'Read case study',
      openExternal: 'Open',
      external: 'External',
      homeCard: 'Home card',
      enlarge: 'Enlarge',
      pause: 'Pause',
      play: 'Play',
    },
  },

  /** WP4a · text and data blocks */
  wp4a: {
    permalink: 'Permalink',
    /** the detail bubble's accessible name. It starts with the bubble's visible text, written as the spec writes the
     *  bubble ("1/A-101": the two numbers are adjacent spans, so assistive tech and axe read them as one run), then
     *  says where the link goes (WCAG 2.5.3 label in name, 2.4.4 link purpose). */
    permalinkLabel: '{n}/{sheet}, permalink to {title}',
    itemsOmitted: '+ {n} items omitted',
    itemOmitted: '+ {n} item omitted',
    rev: 'Rev.',
    /** the revision cloud's delta, for assistive tech ("Rev. 1") */
    revNo: 'Rev. {n}',
    /** stats: the sidenote marker's accessible name */
    sidenote: 'Note {n}',
    /** CAD layout tabs (Educademy personas): the tablist's name */
    tabs: '{fig}, layout tabs',
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
      // WP4b additions (labels)
      playSound: 'Play · {t} · sound',
      mute: 'Mute',
      unmute: 'Unmute',
      walkthrough: 'Walkthrough',
      /** the loupe drift/peel cross-references: '← FIG. 4.7 · Ideate' / '→ compared in FIG. 5.4' */
      figRef: '{fig} · {level}',
    },
    compare: {
      section: 'Section A–A',
      peel: 'Peel the wireframe back from the final screen',
      peelValue: '{n}% wireframe',
    },
    detail: {
      file: 'File',
      native: 'Native',
      size: 'Size',
      /** polish r1: the file facts fold under one row; the figure, her heading and caption lead */
      fileInfo: 'File info',
      fit: 'Fit',
      oneToOne: '1:1',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
      prev: 'Prev',
      next: 'Next',
      close: 'Close',
      // WP4b additions (labels)
      esc: 'Esc',
      count: '{i} / {n}',
      px: '{w} × {h} px',
      back: 'Back to {where}',
      zoom: 'Zoom',
      speed: 'Speed',
      slow: '0.5×',
      normal: '1×',
      details: 'Details',
      seek: 'Position',
    },
  },

  /** WP5 · case template + reading tools */
  wp5: {
    case: {
      back: 'All work',
      cover: 'Cover',
      rev: 'Rev.',
      sheet: 'Sheet',
      levels: '{n} levels',
      sheetInfo: '{no} · {n} levels · ≈ {m} min',
      levelMeta: '≈ {m} min',
      /** the cover plate's figure label (Enlarged detail, "Enlarge {fig}") */
      coverFig: '{no} · Cover',
    },
    view: {
      label: 'View',
      section: 'Full story',
      plan: 'Skim · bold only',
      sectionShort: 'Full story',
      planShort: 'Skim',
      /** the single-key shortcut shown beside "View" in the Levels rail (hidden when shortcuts are off) */
      key: 'V',
    },
    keyPlan: {
      title: 'Key plan',
      sub: '',
      go: 'Go ↓',
      goLabel: 'Go to {label}',
    },
    decisions: {
      title: 'Decision schedule',
      sub: '',
      /** polish r1: the schedule is folded under one line by default (the Key plan is the 60-second layer) */
      summary: '{n} decisions · what was considered, what was decided',
      show: 'Show',
      hide: 'Hide',
      no: 'No.',
      considered: 'Considered',
      decided: 'Decided',
      level: 'Level',
      rowNo: 'D-{nn}',
      /** accessible name of the LEVEL link (her section label stays the visible text) */
      source: '{label}, source of {no}',
    },
    levels: {
      title: 'Levels',
      level: 'Level {nn}',
      view: 'View',
      matchLine: 'Next project',
      seeSheet: '{no}',
      nextSheet: 'Next project',
      open: 'Read case study',
      toIndex: 'All work',
      /** the base of the building section: the whole case read, as an elevation */
      end: 'End',
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
    },
  },

  /** WP7 · QA / SEO */
  wp7: {
    /**
     * The Open Graph sheets (src/pages/og/[page].astro → public/og/<page>.png, SPEC §7.3). Labels only; the titles and
     * decks on them are hers (site.ts / the case files). `alt` is og:image:alt / twitter:image:alt: OUR description of
     * the composite (owner review, §8.9 item 14).
     */
    og: {
      sheetKey: 'Sheet',
      cover: 'Cover',
      alt: {
        index: 'Sheet A-000 of Saumya Verma’s portfolio: her headline beside a drafted site plan of her triangle, circle and square mark.',
        cloudflare: 'Sheet A-101: the Cloudflare R2 Object Storage Redesign title and summary beside its cover, a laptop showing the redesigned R2 Analytics page.',
        pff: 'Sheet A-102: the PFF case title and summary beside its cover, a phone and a desktop screen from the mission assignment tool.',
        csbs: 'Sheet A-103: the NMLS Resource Center Redesign title and summary beside its cover, the redesigned CSBS Knowledge Center page on a blue ground.',
        'u-up': 'Sheet A-104: the U-Up case title and summary beside its cover, three phones with the app’s dark screens.',
        orbit: 'Sheet A-105: the Orbit case title and summary beside its cover, a laptop showing the Orbit workload dashboard.',
        educademy: 'Sheet A-106: the Educademy case title and summary beside its cover, four phones from the app.',
        about: 'Sheet B-100 of Saumya Verma’s portfolio: her About headline beside her portrait.',
        fun: 'Sheet C-100 of Saumya Verma’s portfolio: her Play headline beside the ExpressLanes laptop mockup.',
      } as Record<'index' | 'cloudflare' | 'pff' | 'csbs' | 'u-up' | 'orbit' | 'educademy' | 'about' | 'fun', string>,
    },
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
