import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  loader: glob({ pattern: ['**/*.{md,mdx}', '!**/_*'], base: './src/content/posts' }),
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
    // Unwritten stubs: hidden everywhere, including preview deploys
    hidden: z.boolean().default(false),
    showTitle: z.boolean().default(true),
    showDescription: z.boolean().default(true),
    showCover: z.boolean().default(true),
    showPubDate: z.boolean().default(true),
    showUpdatedDate: z.boolean().default(true),
    showReadingTime: z.boolean().default(true),
    showTags: z.boolean().default(true),
    showToc: z.boolean().default(false),
    tocOpen: z.boolean().default(false),
    coverEffects: z.boolean().default(true),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: ['**/*.{md,mdx}', '!**/_*'], base: './src/content/projects' }),
  schema: ({image}) => z.object({
    title: z.string(),
    description: z.string().optional(),
    cover: z.object({
      image: image(),
      alt: z.string(),
      caption: z.string().optional(),
    }).optional(),
    minutesRead: z.string().optional(),
    draft: z.boolean().default(false),
    // Unwritten stubs: hidden everywhere, including preview deploys
    hidden: z.boolean().default(false),
    weight: z.number().default(0),
    showToc: z.boolean().default(false),
    coverEffects: z.boolean().default(false),
  }),
});

export const collections = { posts, projects };