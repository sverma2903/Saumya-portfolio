/**
 * /sitemap.xml · WP7 (SPEC §7.3). The nine canonical URLs, exactly as each page's <link rel=canonical> writes them
 * (no trailing slash; `/` for home). /og/* and the 404 are not listed. No <lastmod>: nothing here knows when she last
 * changed a page, and a guessed date is worse than none.
 */
import type { APIRoute } from 'astro';
import { cases } from '../content/site';
import { ORIGIN } from '../lib/seo';

export const SITEMAP_PATHS = ['/', ...cases.map((c) => `/${c.slug}`), '/about', '/fun'];

export const GET: APIRoute = () => {
  const urls = SITEMAP_PATHS.map((p) => `  <url><loc>${new URL(p, ORIGIN).href}</loc></url>`).join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
