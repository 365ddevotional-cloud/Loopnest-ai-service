CREATE TABLE IF NOT EXISTS ministry_shop_orders (
  session_id text PRIMARY KEY,
  firebase_uid text NOT NULL,
  product_id text NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  currency text NOT NULL,
  assets jsonb NOT NULL CHECK (jsonb_typeof(assets) = 'array'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','expired','revoked')),
  payment_intent_id text,
  download_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ministry_shop_orders_uid_idx ON ministry_shop_orders(firebase_uid, created_at DESC);
CREATE INDEX IF NOT EXISTS ministry_shop_orders_intent_idx ON ministry_shop_orders(payment_intent_id);
