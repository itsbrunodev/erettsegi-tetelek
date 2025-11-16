import { getImage } from "astro:assets";
import { getCollection } from "astro:content";
import rss from "@astrojs/rss";

import { CONFIG } from "../lib/constants";

export async function GET(context) {
  const [magyar, matematika, tortenelem] = await Promise.all([
    getCollection("magyar"),
    getCollection("matematika"),
    getCollection("tortenelem"),
  ]);

  const theses = [...magyar, ...matematika, ...tortenelem].map(
    (thesis) =>
      new Promise((resolve, reject) => {
        getImage({
          src: import(`../assets/${thesis.collection}/${thesis.id}/cover.jpg`),
        })
          .then((image) =>
            resolve({
              ...thesis,
              image: new URL(image.src, context.site).toString(),
            }),
          )
          .catch(reject);
      }),
  );

  const thesesWithImages = await Promise.all(theses);

  const { title, description } = CONFIG.site;

  return rss({
    title,
    description,
    site: context.site,
    items: thesesWithImages.map((thesis) => ({
      ...thesis.data,
      link: `/${thesis.collection}/${thesis.id}`,
      customData: `<enclosure url="${thesis.image}" type="image/webp" />`,
    })),
  });
}
