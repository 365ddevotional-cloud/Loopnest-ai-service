-- A verified paid subscription invoice funds one billing period.
CREATE TABLE IF NOT EXISTS spirittone_gold_periods (
  invoice_id text PRIMARY KEY,
  subscription_id text NOT NULL,
  firebase_uid text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CHECK (ends_at > starts_at),
  UNIQUE (subscription_id, starts_at)
);

CREATE TABLE IF NOT EXISTS spirittone_gold_selections (
  invoice_id text NOT NULL REFERENCES spirittone_gold_periods(invoice_id),
  slot smallint NOT NULL CHECK (slot IN (1, 2)),
  request_id uuid NOT NULL,
  product_ids text[] NOT NULL CHECK (cardinality(product_ids) = 5),
  PRIMARY KEY (invoice_id, slot),
  UNIQUE (invoice_id, request_id)
);

-- The caller checks that each product has a published, deliverable music package.
CREATE OR REPLACE FUNCTION spirittone_gold_choose(
  buyer text, invoice text, request uuid, songs text[]
) RETURNS smallint LANGUAGE plpgsql AS $$
DECLARE
  period spirittone_gold_periods%ROWTYPE;
  previous spirittone_gold_selections%ROWTYPE;
  chosen_slot smallint;
BEGIN
  SELECT * INTO period FROM spirittone_gold_periods
    WHERE invoice_id = invoice AND firebase_uid = buyer FOR UPDATE;
  IF NOT FOUND OR period.revoked_at IS NOT NULL OR
     now() < period.starts_at OR now() >= period.ends_at THEN
    RAISE EXCEPTION 'A current paid membership period is required';
  END IF;
  IF cardinality(songs) IS DISTINCT FROM 5 OR
     (SELECT count(DISTINCT id) FROM unnest(songs) AS id WHERE trim(id) <> '') <> 5 THEN
    RAISE EXCEPTION 'Choose five different songs';
  END IF;
  SELECT * INTO previous FROM spirittone_gold_selections
    WHERE invoice_id = invoice AND request_id = request;
  IF FOUND THEN
    IF previous.product_ids <> songs THEN RAISE EXCEPTION 'Selection request has changed'; END IF;
    RETURN previous.slot;
  END IF;
  SELECT count(*) + 1 INTO chosen_slot FROM spirittone_gold_selections WHERE invoice_id = invoice;
  IF chosen_slot > 2 THEN RAISE EXCEPTION 'Both selections have been used'; END IF;
  INSERT INTO spirittone_gold_selections VALUES (invoice, chosen_slot, request, songs);
  RETURN chosen_slot;
END;
$$;
