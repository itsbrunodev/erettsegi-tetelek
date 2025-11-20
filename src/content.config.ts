import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

import type { ThesisType } from "./lib/types";

const dateSchema = z
  .object({
    date: z.string(), // either YYYY-MM-DD, YYYY-MM, YYYY or  other information
    description: z.string(),
  })
  .optional();

function schema() {
  return z.object({
    title: z.string(),
    description: z.string(),
    startDate: dateSchema,
    endDate: dateSchema,
    coverImage: z.boolean().optional(),
  });
}

function globLoader(type: ThesisType) {
  return glob({
    base: `./src/content/${type}`,
    pattern: "**/*.{md,mdx}",
  });
}

const tortenelem = defineCollection({
  loader: globLoader("tortenelem"),
  schema,
});

const magyar = defineCollection({
  loader: globLoader("magyar"),
  schema,
});

const matematika = defineCollection({
  loader: globLoader("matematika"),
  schema,
});

export const collections = { tortenelem, magyar, matematika };
