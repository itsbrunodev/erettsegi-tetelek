import type { CollectionEntry } from "astro:content";

export type ThesisType = "tortenelem" | "magyar" | "matematika";

export type Thesis = CollectionEntry<ThesisType>;
