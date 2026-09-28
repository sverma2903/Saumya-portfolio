/**
 * logo-optics · OWNER: WP3. Her four home-card logos (sheet.card.logo) sit in a fixed-height logo cell (the card's
 * chip, the Viewport title block's logo cell). Each logo's height is a fraction of that cell's content height, so
 * the four read at one visual weight whatever their proportions. The cell height is a spacing token (CSS); these
 * are unitless ratios, applied as `block-size: calc(<cell> * var(--_k))` with object-fit: contain (a wide wordmark
 * that meets the cell's width shrinks rather than distorts).
 */
export const LOGO_OPTICS: Record<string, number> = {
  'CQBzyCCtXm6Sxa1H7rjdmW35A4.webp': 0.83, // Cloudflare: cloud + wordmark (3.03 : 1)
  'LLwKJhf5XlV3SWhOs3xldIRQFA.png': 1, // PFF LLC: an opaque white box with its own margin (2.18 : 1)
  'o8ini5inZ7izIUkXDxD6Ryd890E.png': 0.63, // CSBS: four tiles (3.98 : 1)
  'z9qKmfXnKpQ01CHNuHDM1KgY6aE.png': 0.5, // Carnegie Mellon wordmark (9.58 : 1)
};
export const logoK = (file: string): number => LOGO_OPTICS[file] ?? 0.75;
