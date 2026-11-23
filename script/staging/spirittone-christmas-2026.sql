-- Explicit private draft import. Run as one transaction in a provisioned staging database.
-- Link both newly inserted songs and matching existing recordings.
BEGIN;
WITH tracks AS (
  SELECT * FROM jsonb_to_recordset($christmas$
[
  {
    "title": "Bethlehem Sound",
    "slug": "bethlehem-sound-a124aabe",
    "year": 2025,
    "start": "2026-12-01",
    "end": "2026-12-02",
    "reference": "Luke 2:8–20",
    "language": "English / Nigerian Pidgin",
    "lyrics": "Verse 1\nHear the sound from Bethlehem\nNo be rumor no be scam\nNa the King wey come to save\nMake we rise from every grave\nChorus\nBethlehem sound\nSpread it around\nJesus is near\nWe no dey fear\nVerse 2\nNa the shout of joy we bring\nAs we dance for Heaven’s King\nFrom the stable came our crown\nSo we no go calm down\nChorus\nBethlehem sound\nSpread it around\nJesus is near\nWe no dey fear\nChorus\nBethlehem sound\nSpread it around\nJesus is near\nWe no dey fear\nVerse 3\nClap your hands and stomp your feet\nSing the song for every street\nTell the world that Christ don reign\nJoy go full our lane\nChorus\nBethlehem sound\nSpread it around\nJesus is near\nWe no dey fear\nChorus\nBethlehem sound\nSpread it around\nJesus is near\nWe no dey fear\nVerse 4\nEven shepherds start to praise\nWise men dey with golden case\nNow we join to lift the Lamb\nSinging loud as we dey jam\nChorus\nBethlehem sound\nSpread it around\nJesus is near\nWe no dey fear\nChorus\nBethlehem sound\nSpread it around\nJesus is near\nWe no dey fear",
    "description": "Afrobeat brass carries a Nigerian Pidgin invitation to celebrate the birth of Christ in Bethlehem."
  },
  {
    "title": "Navidad Don Land",
    "slug": "navidad-don-land-8b10f8f5",
    "year": 2026,
    "start": "2026-12-03",
    "end": "2026-12-04",
    "reference": "Luke 2:10–14",
    "language": "Spanish / Nigerian Pidgin / English",
    "lyrics": "[Verse 1: Male]\nNavidad don land again\nMake we sing am loud no shame\nEl Mesías don arrive\nWe go praise am with our life\n[Chorus: Male and Female]\nNavidad don land\nCelebrate across the land\nJesús be the reason\nWe go dance for every season\n[Chorus: Male and Female]\nNavidad don land\nCelebrate across the land\nJesús be the reason\nWe go dance for every season\n[Instrumental Interlude: whistle, rhythm guitar, conga]\n[Verse 2: Female]\nNa today we go shine bright\nNo be just decoration light\nNa el Rey wey come with peace\nNow our joy dey increase\n[Chorus: Male and Female]\nNavidad don land\nCelebrate across the land\nJesús be the reason\nWe go dance for every season\n[Instrumental Interlude: bass bounce, whistle echo, conga]\n[Verse 3: Male]\nTell your mama tell your crew\nJesús love dey fresh and true\nHe no dey choose rich or poor\nNa everybody He dey cure\n[Chorus: Male and Female]\nNavidad don land\nCelebrate across the land\nJesús be the reason\nWe go dance for every season\n[Instrumental Interlude: talking drum, praise shouts, conga]\n[Verse 4: Female]\nBells dey ring for every town\nChildren dey dance up and down\nCristo vive no be lie\nMake we praise am till we high\n[Final Chorus: Male and Female]\nNavidad don land\nCelebrate across the land\nJesús be the reason\nWe go dance for every season\n[Outro: Male and Female]\nNavidad don land!\nCelebrate across the land!",
    "description": "Spanish and Nigerian Pidgin meet in a Christmas dance song celebrating the arrival of the Messiah."
  },
  {
    "title": "Glory Hallelujah Born This Day",
    "slug": "glory-hallelujah-born-this-day-fb6b9417",
    "year": 2025,
    "start": "2026-12-05",
    "end": "2026-12-06",
    "reference": "Luke 2:11–14",
    "language": "English / Nigerian Pidgin",
    "lyrics": "Verse 1\nBorn this day in Bethlehem\nPrince of peace and mighty Lamb\nShepherds kneel and angels cheer\nChrist our joy is finally here\nChorus\nGlory hallelujah\nBorn this day\nLet the nations rise\nAnd praise His name\nGlory hallelujah\nBorn this day\nLet the nations rise\nAnd praise His name\nVerse 2\nCarol songs dey fill the air\nEvery heart receive His care\nHeaven's gift we can't ignore\nNow we shout forevermore\nChorus\nGlory hallelujah\nBorn this day\nLet the nations rise\nAnd praise His name\nGlory hallelujah\nBorn this day\nLet the nations rise\nAnd praise His name\nVerse 3\nNa the reason for the tree\nNa the star we all go see\nMake we kneel and lift our heart\nJesus dey where Christmas start\nChorus\nGlory hallelujah\nBorn this day\nLet the nations rise\nAnd praise His name\nChorus\nGlory hallelujah\nBorn this day\nLet the nations rise\nAnd praise His name\nVerse 4\nNo be Santa bring the joy\nNa the Christ we now enjoy\nLet the drums and trumpet play\nPraise the King born Christmas Day\nChorus\nGlory hallelujah\nBorn this day\nLet the nations rise\nAnd praise His name",
    "description": "Shepherds, angels and a chorus of hallelujahs welcome the Prince of Peace in Bethlehem."
  },
  {
    "title": "Celebrate Emmanuel",
    "slug": "celebrate-emmanuel-02fec75c",
    "year": 2025,
    "start": "2026-12-07",
    "end": "2026-12-08",
    "reference": "Matthew 1:23",
    "language": "English / Nigerian Pidgin",
    "lyrics": "Verse 1\nHe is born our God with us\nCelebrate Emmanuel\nJoy don land inside our house\nLight don shine make we tell\nChorus\nCelebrate Emmanuel\nSing and dance so well\nRing the bell for heaven’s gift\nPraise go rise and swell\nVerse 2\nFrom the cradle to the throne\nChrist alone dey make us known\nRaise your praise for heaven’s Son\nChristmas joy just dey run\nChorus\nCelebrate Emmanuel\nSing and dance so well\nRing the bell for heaven’s gift\nPraise go rise and swell\nVerse 3\nNo more sorrow no more shame\nJesus come to change our name\nEvery tongue and every race\nNow dey jump for His grace\nChorus\nCelebrate Emmanuel\nSing and dance so well\nRing the bell for heaven’s gift\nPraise go rise and swell\nVerse 4\nBring the children let them praise\nTell the story all your days\nFrom the manger to the sky\nWe go lift His name on high\nChorus\nCelebrate Emmanuel\nSing and dance so well\nRing the bell for heaven’s gift\nPraise go rise and swell",
    "description": "A Christmas celebration of God with us, inviting children and families to sing and dance together."
  }
]
$christmas$::jsonb) AS t(title text, slug text, year integer, start date, "end" date, reference text, language text, lyrics text, description text)
), added AS (
  INSERT INTO songs (title, slug, release_year, featured_week_start, featured_week_end,
    scripture_reference, language, lyrics, short_description, label_name, producer,
    composer, lyricist, sampler, is_active, download_status, video_download_status)
  SELECT title, slug, year, start, "end", reference, language, lyrics, description,
    'SpiritTone Records', 'Moses Afolabi', 'Moses Afolabi', '365 Daily Devotional',
    'Avia Afolabi', false, 'coming_soon', 'disabled'
  FROM tracks
  ON CONFLICT (slug) DO NOTHING
  RETURNING id, title, slug, lyrics, short_description, release_year
)
, linked AS (
  SELECT * FROM added
  UNION ALL
  SELECT s.id,s.title,s.slug,s.lyrics,s.short_description,s.release_year
  FROM songs s JOIN tracks t ON s.slug=t.slug AND s.title=t.title AND s.release_year=t.year
)
INSERT INTO ministry_shop_managed_products (id, payload, published)
SELECT shop_id, jsonb_build_object('id', shop_id, 'kind', 'Music', 'title', title,
  'description', short_description, 'lyrics', lyrics, 'releaseYear', release_year,
  'author', 'SpiritTone Records', 'spiritToneSongId', id, 'spiritToneSlug', slug,
  'sourcePrice', '$1.49', 'useBasePrice', false, 'packageFormat', 'zip', 'requiredFileCount', 1), false
FROM linked
CROSS JOIN LATERAL (SELECT 'str' || right(replace(slug, '-', ''), 8) AS shop_id) product
ON CONFLICT (id) DO NOTHING;
COMMIT;
