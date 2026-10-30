CREATE TABLE ministrium.messages (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES ministrium.organizations(id) ON DELETE CASCADE,
  author_uid text NOT NULL REFERENCES ministrium.identities(uid),
  author_name text NOT NULL CHECK (length(author_name) BETWEEN 1 AND 60),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_timeline_idx ON ministrium.messages(organization_id,created_at DESC,id);
CREATE INDEX messages_author_idx ON ministrium.messages(author_uid);

CREATE TABLE ministrium.prayer_requests (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES ministrium.organizations(id) ON DELETE CASCADE,
  author_uid text NOT NULL REFERENCES ministrium.identities(uid),
  author_name text NOT NULL CHECK (length(author_name) BETWEEN 1 AND 60),
  title text NOT NULL CHECK (length(title) BETWEEN 2 AND 120),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  answered boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX prayer_requests_timeline_idx ON ministrium.prayer_requests(organization_id,created_at DESC,id);
CREATE INDEX prayer_requests_author_idx ON ministrium.prayer_requests(author_uid);

CREATE TABLE ministrium.gatherings (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES ministrium.organizations(id) ON DELETE CASCADE,
  created_by text NOT NULL REFERENCES ministrium.identities(uid),
  title text NOT NULL CHECK (length(title) BETWEEN 2 AND 120),
  starts_at timestamptz NOT NULL,
  timezone text NOT NULL CHECK (length(timezone) BETWEEN 1 AND 100),
  meeting_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gatherings_calendar_idx ON ministrium.gatherings(organization_id,starts_at,id);
CREATE INDEX gatherings_creator_idx ON ministrium.gatherings(created_by);
