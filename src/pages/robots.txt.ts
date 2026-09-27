import type { APIRoute } from 'astro';
import { SITE_ENV } from 'astro:env/server';

const getRobotsTxt = (sitemapURL: URL) => `User-agent: *
Allow: /

Sitemap: ${sitemapURL.href}
`;

// Preview deploys (preview.holmdahl.io) should stay out of search results
const previewRobotsTxt = `User-agent: *
Disallow: /
`;

export const GET: APIRoute = ({ site }) => {
  const body = SITE_ENV === 'production' ? getRobotsTxt(new URL('sitemap-index.xml', site)) : previewRobotsTxt;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
