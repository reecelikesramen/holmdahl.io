import { SITE_ENV } from 'astro:env/server';

// Drafts are hidden in production but shown on preview deploys for review.
export const showDrafts = SITE_ENV !== 'production';

export const isPublished = (entry: { data: { draft?: boolean } }) => showDrafts || !entry.data.draft;
