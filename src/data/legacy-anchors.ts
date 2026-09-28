/**
 * legacy-anchors.ts · P0 (shared). Framer-era section anchors, aliased with empty <span id> elements at the top
 * of the target chapter — no JS (SPEC §5.2.9). Rendered by case/LegacyAnchors.astro (WP5).
 */
export const legacyAnchors: Record<string, Record<string, string>> = {
  cloudflare: { research: 'empathize', ideation: 'ideate', reflect: 'reflection' },
  pff: { protoype: 'prototype', reflect: 'reflection' },
  csbs: { research: 'empathize', protoype: 'prototype', reflect: 'reflection' },
  educademy: { research: 'empathize', persona: 'define', ideation: 'ideate', design: 'prototype' },
};

/** The alias ids that must sit at the top of `sectionId` on `slug`. */
export function aliasesFor(slug: string, sectionId: string): string[] {
  const map = legacyAnchors[slug] ?? {};
  return Object.entries(map)
    .filter(([, target]) => target === sectionId)
    .map(([alias]) => alias);
}
