ALTER TABLE ministry_shop_orders ADD COLUMN IF NOT EXISTS purchase_kind text NOT NULL DEFAULT 'ebook';
ALTER TABLE ministry_shop_orders ADD COLUMN IF NOT EXISTS reader_edition_id text;
ALTER TABLE ministry_shop_orders ADD COLUMN IF NOT EXISTS book_session_id text;
CREATE TABLE IF NOT EXISTS ministry_shop_reader_editions (
  id text PRIMARY KEY,
  product_id text NOT NULL,
  asset_sha256 text NOT NULL,
  title text NOT NULL,
  paragraphs jsonb NOT NULL,
  reviewed boolean NOT NULL DEFAULT false,
  audio_reviewed boolean NOT NULL DEFAULT false,
  sample_ready boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, asset_sha256, id)
);
CREATE INDEX IF NOT EXISTS ministry_shop_reader_product_idx ON ministry_shop_reader_editions(product_id, created_at DESC);
-- A reservation covers a whole edition, shared by every listener. It is never
-- recycled automatically, including after provider failures or abandoned carts.
CREATE TABLE IF NOT EXISTS ministry_shop_audio_budgets (
  cache_id text PRIMARY KEY,
  characters integer NOT NULL CHECK(characters > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ministry_shop_audio_segments (
  id text PRIMARY KEY,
  status text NOT NULL CHECK(status IN ('generating','ready','failed')),
  object_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ministry_shop_reader_positions (
  firebase_uid text NOT NULL,
  edition_id text NOT NULL,
  paragraph_id text NOT NULL,
  seconds double precision NOT NULL DEFAULT 0,
  speed double precision NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(firebase_uid, edition_id)
);
