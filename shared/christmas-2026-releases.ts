// Recording-specific links for the December SpiritTone release.
const releases = [
  {
    "id": "str02fec75c",
    "slug": "celebrate-emmanuel-02fec75c",
    "zipHash": "4e06f18e36d1e4d1648d8ee6ef2aafa95426a61b44fb63326d8c393c2dbe61c4"
  },
  {
    "id": "strfb6b9417",
    "slug": "glory-hallelujah-born-this-day-fb6b9417",
    "zipHash": "f2aed70652373df4543e15bba4ae93a8d15cf8d56cc7300355ed43b96f07bfae"
  },
  {
    "id": "str8b10f8f5",
    "slug": "navidad-don-land-8b10f8f5",
    "zipHash": "ce3362e1c95f854fff6cff2d15b2bf8208914cee20230ac0022f54f33ac2bfc1"
  },
  {
    "id": "stra124aabe",
    "slug": "bethlehem-sound-a124aabe",
    "zipHash": "52f90a138212cbdafa509b661b80790c6b6f6c6da417aea39753dbbd8e422874"
  }
];

export function christmasReleaseById(id: string) {
  return releases.find(release => release.id === id);
}

export function christmasPreview(slug: string) {
  const release = releases.find(item => item.slug === slug);
  return release ? `/music/previews/${release.id}.mp3` : undefined;
}
