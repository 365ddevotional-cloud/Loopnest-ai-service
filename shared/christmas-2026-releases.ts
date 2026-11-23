// Recording-specific links for the December SpiritTone release.
import multilingual from "./multilingual-releases.json";

const releases = [
  {
    "id": "str02fec75c",
    "slug": "celebrate-emmanuel-02fec75c",
    "zipHash": "cf42627076f9a289ae3b3a4108687362d96244d27282b6f04e37d2789f9e7fa1"
  },
  {
    "id": "strfb6b9417",
    "slug": "glory-hallelujah-born-this-day-fb6b9417",
    "zipHash": "5fdfe039da9ba3cad67dc7127751814dfe6d02a9b27a315d9caefa731f03934e"
  },
  {
    "id": "str8b10f8f5",
    "slug": "navidad-don-land-8b10f8f5",
    "zipHash": "4a381acdcb249cb0ac424693aaae318f7727c4d0e875171d6f14c8e9bbab5dfc"
  },
  {
    "id": "stra124aabe",
    "slug": "bethlehem-sound-a124aabe",
    "zipHash": "3de17df3868500e0087cebf7606ca56be2691b68c17ae0269f995d5079d5b01e"
  }
];

export function christmasReleaseById(id: string) {
  return releases.find(release => release.id === id);
}

export function christmasPreview(slug: string) {
  const recording = multilingual.find(item => item.slug === slug);
  if (recording) return `/api/ministry-shop/preview/${recording.id}`;
  const release = releases.find(item => item.slug === slug);
  return release ? `/music/previews/${release.id}.mp3` : undefined;
}

export const christmasReleaseSlugs = [...releases, ...multilingual].map(release => release.slug);

// Approved private customer packages, keyed by the existing shop product.
export function verifiedReleaseById(id: string) {
  if (id === "st001") return { zipHash: "2f30519c940d70f15552345cb877fea9af8aaf29418caa6a2131d7a5f57f210c" };
  return christmasReleaseById(id) ?? multilingual.find(item => item.id === id);
}

