CREATE TABLE IF NOT EXISTS ministry_shop_managed_products (
  id text PRIMARY KEY,
  payload jsonb NOT NULL,
  published boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ministry_shop_uploads (
  id uuid PRIMARY KEY,
  product_id text NOT NULL,
  slot text NOT NULL CHECK (slot IN ('download','cover')),
  object_key text NOT NULL,
  sha256 text NOT NULL,
  file_name text NOT NULL,
  content_type text NOT NULL,
  size_bytes bigint NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
