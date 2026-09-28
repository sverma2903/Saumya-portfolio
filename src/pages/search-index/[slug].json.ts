/**
 * /search-index/<slug>.json · WP1. The passages of one case sheet (her sentences, anchored at their block ids), split
 * out of /search-index.json to keep it within its budget (see lib/search-index.ts). Fetched in parallel by the Sheet
 * list when a query reaches 2 characters, the point at which Passages appear (SPEC §4.4).
 */
import { cases } from '../../content/site';
import { shardIndex } from '../../lib/search-index';

export function getStaticPaths() {
  return cases.map((cs) => ({ params: { slug: cs.slug } }));
}

export function GET({ params }: { params: { slug: string } }): Response {
  return new Response(JSON.stringify(shardIndex(params.slug)), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}
