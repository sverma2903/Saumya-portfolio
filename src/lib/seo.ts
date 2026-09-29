/**
 * seo.ts · WP7 (SPEC §7.3). One source for the structured data and share images every page emits, so the Person the
 * case studies credit is the same node (by @id) as the one on / and /about.
 *
 *   ORIGIN            the canonical origin (astro.config `site`)
 *   ogImagePath(p)    /og/<page>.png — the 1200 × 630 share sheet tools/og.mjs renders (public/og)
 *   personLd()        Person: name, url, jobTitle (from her headline), worksFor Fulcrum GT, alumniOf (from About),
 *                     sameAs LinkedIn, image (her portrait)
 *   websiteLd()       WebSite: the site's name for search results (home only)
 *   caseLd(…)         CreativeWork (name, description, url, image, author → the Person by @id) + BreadcrumbList
 * Every value is either her own text, a URL, or a chrome label (chrome.ts) — nothing is written here as hers.
 */
import { about, links } from '../content/site';
import { chrome } from '../data/chrome';

export const ORIGIN = 'https://www.saumya-verma.com';
const PERSON_ID = `${ORIGIN}/#person`;

export type OgPage = 'index' | 'cloudflare' | 'pff' | 'csbs' | 'u-up' | 'orbit' | 'educademy' | 'about' | 'fun';
export const ogImagePath = (page: OgPage) => `/og/${page}.png`;
export const ogImageAlt = (page: OgPage) => chrome.wp7.og.alt[page];

export function personLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': PERSON_ID,
    name: chrome.p0.person,
    url: `${ORIGIN}/`,
    image: new URL(about.portrait.src, ORIGIN).href,
    jobTitle: chrome.p0.jobTitle,
    worksFor: { '@type': 'Organization', name: 'Fulcrum GT' },
    alumniOf: [
      { '@type': 'CollegeOrUniversity', name: 'University of Maryland, College Park' },
      { '@type': 'CollegeOrUniversity', name: 'NIT Bhopal' },
    ],
    sameAs: [links.linkedin],
  };
}

export function websiteLd(): Record<string, unknown> {
  return { '@context': 'https://schema.org', '@type': 'WebSite', name: chrome.p0.person, url: `${ORIGIN}/`, inLanguage: 'en' };
}

export function caseLd(o: { slug: OgPage; title: string; metaTitle: string; description: string }): Record<string, unknown>[] {
  const url = `${ORIGIN}/${o.slug}`;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: o.title,
      description: o.description,
      url,
      image: `${ORIGIN}${ogImagePath(o.slug)}`,
      inLanguage: 'en',
      author: { '@type': 'Person', '@id': PERSON_ID, name: chrome.p0.person, url: `${ORIGIN}/` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: chrome.p0.person, item: `${ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: o.metaTitle, item: url },
      ],
    },
  ];
}
