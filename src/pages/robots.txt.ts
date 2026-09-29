/**
 * /robots.txt · WP7 (SPEC §7.3). Everything may be crawled; the sitemap lists the nine pages. (The 404 sheet carries
 * its own `noindex`.)
 */
import type { APIRoute } from 'astro';
import { ORIGIN } from '../lib/seo';

export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
