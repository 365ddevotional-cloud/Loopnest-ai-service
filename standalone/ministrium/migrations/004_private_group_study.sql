CREATE TABLE ministrium.group_lessons (
 id uuid PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES ministrium.organizations(id) ON DELETE CASCADE,
 title text NOT NULL CHECK(length(title) BETWEEN 2 AND 120),
 position integer NOT NULL CHECK(position BETWEEN 1 AND 999),
 scripture text NOT NULL DEFAULT '' CHECK(length(scripture)<=500),
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 20000),
 reflection_prompt text NOT NULL DEFAULT '' CHECK(length(reflection_prompt)<=2000),
 resource_url text,
 published boolean NOT NULL DEFAULT true,
 archived boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1,
 created_by text NOT NULL REFERENCES ministrium.identities(uid),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,id)
);
CREATE INDEX group_lessons_workspace_idx ON ministrium.group_lessons(organization_id,archived,published,position,id);
CREATE INDEX group_lessons_author_idx ON ministrium.group_lessons(created_by);
CREATE TABLE ministrium.group_lesson_progress (
 organization_id uuid NOT NULL,
 lesson_id uuid NOT NULL,
 uid text NOT NULL,
 completed boolean NOT NULL DEFAULT false,
 reflection text NOT NULL DEFAULT '' CHECK(length(reflection)<=10000),
 version integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organization_id,lesson_id,uid),
 FOREIGN KEY(organization_id,lesson_id) REFERENCES ministrium.group_lessons(organization_id,id) ON DELETE CASCADE,
 FOREIGN KEY(organization_id,uid) REFERENCES ministrium.memberships(organization_id,uid) ON DELETE CASCADE
);
CREATE INDEX group_lesson_progress_member_idx ON ministrium.group_lesson_progress(organization_id,uid);
ALTER TABLE ministrium.gatherings ADD COLUMN version integer NOT NULL DEFAULT 1;
ALTER TABLE ministrium.gatherings ADD COLUMN cancelled_at timestamptz;
