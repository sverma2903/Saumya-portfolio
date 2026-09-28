/**
 * alt.ts · P0 stub → WP7 fills. Factual alt-text DRAFTS keyed by media file name, written from the media audit's
 * "what it is" column (tools/alt-draft.mjs, WP7) and flagged for owner sign-off (SPEC §7.1, §8.9).
 *
 * `alt(file)` returns the draft, or '' until one exists. '' is also the correct value for decorative duplicates
 * (e.g. Viewport plates, which repeat a figure that is described elsewhere).
 */
export const altDrafts: Record<string, string> = {
  // 'iaZFTmw1LjJ6sFQCiaDCjYl5wOU.jpg': 'Wireframe of a detailed analytics view …',   ← WP7 fills
};

export function alt(file: string): string {
  return altDrafts[file] ?? '';
}
