CREATE SCHEMA IF NOT EXISTS ministrium;

CREATE TABLE ministrium.identities (
  uid text PRIMARY KEY CHECK (length(uid) BETWEEN 1 AND 128),
  email text NOT NULL CHECK (email = lower(email)),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ministrium.organizations (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 100),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind text NOT NULL CHECK (kind IN ('church', 'ministry', 'both', 'group')),
  group_type text CHECK ((kind = 'group' AND group_type IS NOT NULL AND group_type IN ('family','prayer','discipleship')) OR (kind <> 'group' AND group_type IS NULL)),
  country text NOT NULL CHECK (country ~ '^[A-Z]{2}$'),
  city text NOT NULL DEFAULT '' CHECK (length(city) <= 100),
  created_by text NOT NULL REFERENCES ministrium.identities(uid),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX organizations_created_by_idx ON ministrium.organizations(created_by);

CREATE TABLE ministrium.memberships (
  organization_id uuid NOT NULL REFERENCES ministrium.organizations(id) ON DELETE CASCADE,
  uid text NOT NULL REFERENCES ministrium.identities(uid),
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, uid)
);
CREATE INDEX memberships_uid_idx ON ministrium.memberships(uid);
CREATE UNIQUE INDEX memberships_one_owner_idx ON ministrium.memberships(organization_id) WHERE role = 'owner';

CREATE TABLE ministrium.invitations (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES ministrium.organizations(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (email = lower(email)),
  token_hash text NOT NULL UNIQUE,
  created_by text NOT NULL REFERENCES ministrium.identities(uid),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  accepted_by text REFERENCES ministrium.identities(uid),
  accepted_at timestamptz,
  revoked_at timestamptz,
  CHECK (expires_at > created_at),
  CHECK ((accepted_by IS NULL) = (accepted_at IS NULL))
);
CREATE INDEX invitations_organization_idx ON ministrium.invitations(organization_id, created_at DESC);
CREATE INDEX invitations_created_by_idx ON ministrium.invitations(created_by);
CREATE INDEX invitations_accepted_by_idx ON ministrium.invitations(accepted_by);
