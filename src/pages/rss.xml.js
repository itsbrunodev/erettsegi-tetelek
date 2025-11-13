import { getCollection } from "astro:content";
import rss from "@astrojs/rss";

import { CONFIG } from "../lib/constants";

export async function GET(context) {
  const magyar = await getCollection("magyar");
  const matematika = await getCollection("matematika");
  const tortenelem = await getCollection("tortenelem");

  const theses = [...magyar, ...matematika, ...tortenelem];

  const { title, description } = CONFIG.site;

  return rss({
    title,
    description,
    site: context.site,
    items: theses.map((thesis) => ({
      ...thesis.data,
      link: `/${thesis.collection}/${thesis.id}`,
    })),
  });
}
