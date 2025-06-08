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
    readingTime: z.number().optional(),
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

const profile = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    email: z.string().optional(),
    subtitle: z.string().optional(),
    imageUrl: z.string().optional(),
    imageTitle: z.string().optional(),
    imageWidth: z.number().optional(),
    imageHeight: z.number().optional(),
    socialIcons: z.array(z.object({
      name: z.string(),
      url: z.string(),
      title: z.string().optional(),
    })).optional(),
    buttons: z.array(z.object({
      name: z.string(),
      url: z.string(),
    })).optional(),
  }),
});

export const collections = { posts, profile };