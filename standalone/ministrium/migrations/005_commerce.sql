CREATE TABLE ministrium.sellers (
 organization_id uuid PRIMARY KEY REFERENCES ministrium.organizations(id),
 stripe_account text UNIQUE,
 accepted_by text NOT NULL REFERENCES ministrium.identities(uid),
 fee_bps integer NOT NULL CHECK (fee_bps BETWEEN 1 AND 3000),
 terms_version text NOT NULL,
 accepted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sellers_accepted_by_idx ON ministrium.sellers(accepted_by);
CREATE TABLE ministrium.products (
 id uuid PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES ministrium.organizations(id),
 title text NOT NULL CHECK (length(title) BETWEEN 2 AND 120),
 description text NOT NULL DEFAULT '' CHECK (length(description)<=2000),
 price_cents integer NOT NULL CHECK (price_cents BETWEEN 100 AND 100000),
 currency text NOT NULL DEFAULT 'usd' CHECK (currency='usd'),
 content text NOT NULL CHECK (length(content) BETWEEN 1 AND 100000),
 published boolean NOT NULL DEFAULT false,
 archived boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1,
 created_by text NOT NULL REFERENCES ministrium.identities(uid),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (organization_id,id)
);
CREATE INDEX products_org_idx ON ministrium.products(organization_id,archived,published,created_at DESC,id);
CREATE INDEX products_creator_idx ON ministrium.products(created_by);
CREATE TABLE ministrium.orders (
 id uuid PRIMARY KEY,
 organization_id uuid NOT NULL,
 product_id uuid NOT NULL,
 buyer_uid text NOT NULL REFERENCES ministrium.identities(uid),
 request_key uuid NOT NULL,
 title text NOT NULL,
 content text NOT NULL,
 gross_cents integer NOT NULL CHECK (gross_cents>0),
 fee_bps integer NOT NULL CHECK (fee_bps BETWEEN 1 AND 3000),
 commission_cents integer NOT NULL CHECK (commission_cents>=0 AND commission_cents<=gross_cents),
 currency text NOT NULL CHECK (currency='usd'),
 stripe_account text NOT NULL,
 stripe_session text,
 stripe_payment_intent text,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','partially_refunded','refunded','disputed','failed','expired')),
 refunded_cents integer NOT NULL DEFAULT 0 CHECK (refunded_cents>=0 AND refunded_cents<=gross_cents),
 commission_refunded_cents integer NOT NULL DEFAULT 0 CHECK (commission_refunded_cents>=0 AND commission_refunded_cents<=commission_cents),
 processor_fee_cents integer,
 balance_net_cents integer,
 dispute_status text,
 reconciled_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (organization_id,product_id) REFERENCES ministrium.products(organization_id,id),
 UNIQUE (buyer_uid,request_key),
 UNIQUE (stripe_account,stripe_session),
 UNIQUE (stripe_account,stripe_payment_intent)
);
CREATE INDEX orders_org_idx ON ministrium.orders(organization_id,created_at DESC,id);
CREATE INDEX orders_buyer_idx ON ministrium.orders(buyer_uid,created_at DESC,id);
CREATE INDEX orders_product_idx ON ministrium.orders(organization_id,product_id);
CREATE UNIQUE INDEX orders_pending_purchase_idx ON ministrium.orders(buyer_uid,product_id) WHERE status='pending';
CREATE TABLE ministrium.commerce_events (
 stripe_account text NOT NULL,
 event_id text NOT NULL,
 event_type text NOT NULL,
 processed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (stripe_account,event_id)
);
