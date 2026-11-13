-- Correct legacy SpiritTone performer credits. Moses Afolabi is the producer,
-- not the credited recording artist. Preserve any other real performers and
-- never change producer, composer, lyricist, or label information.
-- Safe/idempotent: after the first pass, no rows satisfy this predicate.
UPDATE songs
SET
  artist = CASE
    WHEN lower(btrim(coalesce(artist, ''))) IN
      ('moses afolabi', 'pastor moses afolabi', 'reverend moses afolabi', 'rev. moses afolabi', 'rev moses afolabi')
    THEN NULL ELSE artist END,
  featured_artist = CASE
    WHEN lower(btrim(coalesce(featured_artist, ''))) IN
      ('moses afolabi', 'pastor moses afolabi', 'reverend moses afolabi', 'rev. moses afolabi', 'rev moses afolabi')
    THEN NULL ELSE featured_artist END,
  updated_at = NOW()
WHERE
  lower(btrim(coalesce(artist, ''))) IN
    ('moses afolabi', 'pastor moses afolabi', 'reverend moses afolabi', 'rev. moses afolabi', 'rev moses afolabi')
  OR lower(btrim(coalesce(featured_artist, ''))) IN
    ('moses afolabi', 'pastor moses afolabi', 'reverend moses afolabi', 'rev. moses afolabi', 'rev moses afolabi');
