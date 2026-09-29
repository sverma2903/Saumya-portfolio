/**
 * /search-index.json · WP1. The Sheet list's index (SPEC §4.4), built once at build time from src/content through
 * lib/search-index.ts: pages (Sheets + Levels), every detail and the site-page passages, plus the shard map for the
 * case passages (/search-index/<slug>.json). Fetched by scripts/palette/* on first open; cached 1 h (public/_headers).
 */
import { mainIndex } from '../lib/search-index';

export function GET(): Response {
  return new Response(JSON.stringify(mainIndex()), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}
