import { SITE_ENV } from 'astro:env/server';

// Drafts are hidden in production but shown on preview deploys for review.
// Entries marked hidden are unwritten stubs and never show anywhere.
export const showDrafts = SITE_ENV !== 'production';

export const isPublished = (entry: { data: { draft?: boolean; hidden?: boolean } }) =>
  !entry.data.hidden && (showDrafts || !entry.data.draft);
