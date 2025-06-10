import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: ({image}) => z.object({
    title: z.string(),
    description: z.string().optional(),
    cover: z.object({
      image: image(),
      alt: z.string(),
      caption: z.string().optional(),
    }).optional(),
    pubDate: z.date(),
    updatedDate: z.date().optional(),
    minutesRead: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    showTitle: z.boolean().default(true),
    showDescription: z.boolean().default(true),
    showCover: z.boolean().default(true),
    showPubDate: z.boolean().default(true),
    showUpdatedDate: z.boolean().default(true),
    showReadingTime: z.boolean().default(true),
    showTags: z.boolean().default(true),
    showToc: z.boolean().default(false),
    tocOpen: z.boolean().default(false),
  }),
});

export const collections = { posts };