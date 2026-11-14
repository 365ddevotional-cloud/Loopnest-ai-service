-- SpiritTone catalog credit corrections confirmed by the publisher.
-- Scope explicitly to the 61 exported songs: IDs 1-60 and 62, and only
-- records with the SpiritTone label. Does not alter artist, featured_artist,
-- producer, existing customer purchases, or unrelated music catalogs.
ALTER TABLE songs ADD COLUMN IF NOT EXISTS sampler text;
ALTER TABLE song_upload_defaults ADD COLUMN IF NOT EXISTS sampler text;

UPDATE songs
SET composer = 'Moses Afolabi',
    lyricist = '365 Daily Devotional',
    sampler = 'Avia Afolabi',
    updated_at = now()
WHERE id IN (
  1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,
  21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,
  41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,62
) AND lower(btrim(label_name)) = 'spirittone records'
  AND (composer IS DISTINCT FROM 'Moses Afolabi'
    OR lyricist IS DISTINCT FROM '365 Daily Devotional'
    OR sampler IS DISTINCT FROM 'Avia Afolabi');
