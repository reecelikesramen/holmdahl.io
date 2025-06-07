import { defineCollection, z } from 'astro:content';

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

export const collections = { profile }; 