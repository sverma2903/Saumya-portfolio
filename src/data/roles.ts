/**
 * roles.ts · polish r1. What she did on each team project, surfaced in the case title block (TitleBlock.astro):
 * keyed by her own heading ("My Contribution",
 * "My Role"), valued by her own clauses from the paragraph under it (verbatim substrings, test-enforced), linked to
 * that heading. Chosen by hand, like the Key plan's overrides; PFF has no first-person role statement (owner item).
 */

export const ROLE_ROWS: Record<string, { heading: string; parts: string[] }> = {
  orbit: {
    heading: 'My Contribution',
    parts: [
      'I led three interviews and 2 participatory design sessions',
      'led the information architecture design',
      'independently led the creation of the user flow of the tool and an interactive prototype using Figma Make.',
    ],
  },
  'u-up': { heading: 'My Role', parts: ['I led the full design process, from research to final prototype'] },
};
