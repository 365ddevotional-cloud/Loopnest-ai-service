CREATE TABLE IF NOT EXISTS ministry_shop_product_views (
  product_id text PRIMARY KEY,
  total bigint NOT NULL CHECK (total >= 0)
);

CREATE TABLE IF NOT EXISTS ministry_shop_daily_visits (
  day date NOT NULL,
  product_id text NOT NULL,
  visitor_hash text NOT NULL,
  PRIMARY KEY (day, product_id, visitor_hash)
);

CREATE TABLE IF NOT EXISTS ministry_shop_assets (
  product_id text NOT NULL,
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  object_key text NOT NULL UNIQUE,
  file_name text NOT NULL,
  content_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  PRIMARY KEY (product_id, sha256)
);
