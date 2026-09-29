/**
 * legacy-anchors.ts · P0 (shared). Framer-era section anchors, aliased with empty <span id> elements at the top
 * of the target chapter — no JS (SPEC §5.2.9). Rendered by case/LegacyAnchors.astro (WP5).
 * Polish r1: every NAMED id of her original case pages (not Framer's generated hashes) resolves, and a target may be
 * any heading, feature title or block id, not only a chapter (tests/dist/links.test.ts checks both ends).
 */
export const legacyAnchors: Record<string, Record<string, string>> = {
  cloudflare: {
    research: 'empathize', ideation: 'ideate', reflect: 'reflection',
    // polish r1: her named in-page ids (pages/cloudflare.html), each on the block that now holds the same heading
    ataglance: 'overview', 'overview-outcome': 'overview-design-solution', 'research-1': 'empathize',
    'research2-competitive': 'empathize-why-i-redesigned-r2', 'research2-competitive-1': 'empathize-competitive-analysis',
    method: 'ideate-internal-configuration',
  },
  pff: {
    protoype: 'prototype', reflect: 'reflection',
    // her "Outcome" CTA and her "Highlights" nav item both pointed at #highlight
    highlight: 'highlights', ataglance: 'overview-at-a-glance',
  },
  csbs: {
    research: 'empathize', protoype: 'prototype', reflect: 'reflection',
    timeline: 'overview-timeline-for-summer-internship', 'research-1': 'empathize-call-center-interviews',
    'research-2': 'empathize-user-interviews', 'research-3': 'empathize-servicenow-analytics',
    // her four numbered features (01–04), each id pair on its feature title
    method: 'prototype-3-t', 'method-1': 'prototype-3-t', 'method-2': 'prototype-4-t', 'method-3': 'prototype-4-t',
    'method-4': 'prototype-5-t', 'method-5': 'prototype-5-t', 'method-6': 'prototype-6-t', 'method-7': 'prototype-6-t',
  },
  'u-up': {
    'overview-outcome': 'overview-my-role', 'overview-outcome-1': 'overview-design-solution',
    'research-secondary': 'empathize-secondary-research', 'research-secondary-1': 'define-key-insights',
    'research2-survey': 'empathize-survey', 'research2-competitive': 'empathize-competitive-analysis',
    'design-principles': 'define-product-goals', 'ideate-concept': 'ideate-ideating-and-concepting',
    design: 'prototype', 'design-flows': 'prototype-wireframes', 'design-flows-1': 'prototype-user-flow',
    'design-features': 'prototype-main-features',
  },
  orbit: {
    research: 'empathize', 'research-1': 'empathize', ideation: 'ideate', reflect: 'reflection',
    'overview-outcome': 'overview-design-solution', method: 'ideate-ideation',
    // her five prototype screens (01–05), each id pair on its step title
    'method-1': 'prototype-0-t', 'method-2': 'prototype-0-t', 'method-3': 'prototype-1-t', 'method-4': 'prototype-1-t',
    'method-5': 'prototype-2-t', 'method-6': 'prototype-2-t', 'method-7': 'prototype-3-t', 'method-8': 'prototype-3-t',
    'method-9': 'prototype-4-t', 'method-10': 'prototype-4-t',
  },
  educademy: {
    research: 'empathize', persona: 'define', ideation: 'ideate', design: 'prototype',
    stats: 'overview-2', 'research-1': 'empathize-revisiting-competitor-analysis', solution: 'prototype-final-mockups',
  },
};

/** The alias ids that must sit at the top of `sectionId` on `slug`. */
export function aliasesFor(slug: string, sectionId: string): string[] {
  const map = legacyAnchors[slug] ?? {};
  return Object.entries(map)
    .filter(([, target]) => target === sectionId)
    .map(([alias]) => alias);
}
