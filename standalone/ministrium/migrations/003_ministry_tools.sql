CREATE TABLE ministrium.resources (
 id uuid PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES ministrium.organizations(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('sermon','announcement','event','department')),
 title text NOT NULL CHECK(length(title) BETWEEN 2 AND 120),
 body text NOT NULL DEFAULT '' CHECK(length(body)<=10000),
 speaker text NOT NULL DEFAULT '' CHECK(length(speaker)<=100),
 scripture text NOT NULL DEFAULT '' CHECK(length(scripture)<=200),
 link text,
 starts_at timestamptz,
 location text NOT NULL DEFAULT '' CHECK(length(location)<=200),
 pinned boolean NOT NULL DEFAULT false,
 published boolean NOT NULL DEFAULT true,
 archived boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1,
 created_by text NOT NULL REFERENCES ministrium.identities(uid),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,id)
);
CREATE INDEX resources_workspace_idx ON ministrium.resources(organization_id,kind,archived,published,created_at DESC);
CREATE INDEX resources_author_idx ON ministrium.resources(created_by);
CREATE TABLE ministrium.sermon_study (
 organization_id uuid NOT NULL,
 resource_id uuid NOT NULL,
 uid text NOT NULL,
 notes text NOT NULL DEFAULT '' CHECK(length(notes)<=10000),
 bookmarked boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organization_id,resource_id,uid),
 FOREIGN KEY(organization_id,resource_id) REFERENCES ministrium.resources(organization_id,id) ON DELETE CASCADE,
 FOREIGN KEY(organization_id,uid) REFERENCES ministrium.memberships(organization_id,uid) ON DELETE CASCADE
);
CREATE INDEX sermon_study_member_idx ON ministrium.sermon_study(organization_id,uid);
CREATE TABLE ministrium.department_members (
 organization_id uuid NOT NULL,
 resource_id uuid NOT NULL,
 uid text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organization_id,resource_id,uid),
 FOREIGN KEY(organization_id,resource_id) REFERENCES ministrium.resources(organization_id,id) ON DELETE CASCADE,
 FOREIGN KEY(organization_id,uid) REFERENCES ministrium.memberships(organization_id,uid) ON DELETE CASCADE
);
CREATE INDEX department_members_member_idx ON ministrium.department_members(organization_id,uid);
CREATE TABLE ministrium.leadership_audit (
 id uuid PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES ministrium.organizations(id) ON DELETE CASCADE,
 actor_uid text NOT NULL REFERENCES ministrium.identities(uid),
 target_uid text NOT NULL REFERENCES ministrium.identities(uid),
 action text NOT NULL CHECK(action IN ('admin','member','removed')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX leadership_audit_org_idx ON ministrium.leadership_audit(organization_id,created_at DESC);
CREATE INDEX leadership_audit_actor_idx ON ministrium.leadership_audit(actor_uid);
CREATE INDEX leadership_audit_target_idx ON ministrium.leadership_audit(target_uid);
