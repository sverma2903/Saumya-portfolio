/**
 * page.ts · P0. The page-level contract every page passes to layouts/Base.astro (`page` prop) and that the chrome
 * (TitleBar, BottomBar, Drawer, EndSheet — WP1) reads.
 */
export type PageKind = 'home' | 'case' | 'about' | 'play' | '404';

export interface PageLevel {
  id: string;        // her section id (anchor)
  label: string;     // her section label
  elev: string;      // '±00:00' | '+02:32'
  minutes: number;   // ≈ minutes for the level
}

export interface PageMeta {
  kind: PageKind;
  /** sheet number shown in the title/bottom bars: 'A-000' · 'A-101'… · 'B-100' · 'C-100' · '404' */
  sheet: string;
  /** running-head title: her case title on case pages; chrome elsewhere ('Cover sheet', 'About', 'Play', 'Sheet not in set') */
  sheetTitle: string;
  /** true when sheetTitle is her text (case title) → rendered with data-v */
  sheetTitleIsHers?: boolean;
  /** case pages only */
  slug?: string;
  levels?: PageLevel[];
  next?: { href: string; sheet: string; title: string };
}
