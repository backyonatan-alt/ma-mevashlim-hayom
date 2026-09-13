import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Categories from SPEC.md section 2. Order matters: it is the chip order on the home page.
export const CATEGORIES = [
  'בשר',
  'עוף',
  'עוגות',
  'מאפים וארוחת בוקר',
  'מרקים ופשטידות',
  'לתמר',
] as const;

export type Category = (typeof CATEGORIES)[number];

const recipes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/recipes' }),
  schema: z
    .object({
      title: z.string().trim().min(1, 'title חובה'),
      category: z.enum(CATEGORIES),
      tags: z.array(z.string().trim().min(1)).default([]),
      prepTime: z.number().int().positive().optional(),
      totalTime: z.number().int().positive().optional(),
      servings: z.string().trim().min(1).optional(),
      family: z.boolean(),
      source: z.string().trim().min(1, 'source חובה'),
      sourceUrl: z.string().url().optional(),
      author: z.string().trim().min(1).optional(),
      // One emoji shown on the home-page card tile (fallback 🍽️).
      emoji: z.string().trim().min(1).max(8).optional(),
    })
    // Unknown keys (e.g. an accidental image field) fail the build.
    .strict(),
});

export const collections = { recipes };
