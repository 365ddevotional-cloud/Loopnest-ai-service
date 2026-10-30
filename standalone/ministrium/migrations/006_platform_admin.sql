ALTER TABLE ministrium.organizations ADD COLUMN suspended_at timestamptz;
ALTER TABLE ministrium.organizations ADD COLUMN moderation_version integer NOT NULL DEFAULT 1 CHECK (moderation_version>0);
CREATE TABLE ministrium.platform_owner (
 singleton integer PRIMARY KEY CHECK (singleton=1),
 uid text NOT NULL UNIQUE REFERENCES ministrium.identities(uid),
 bound_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE ministrium.moderation_reports (
 id uuid PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES ministrium.organizations(id),
 reporter_uid text NOT NULL REFERENCES ministrium.identities(uid),
 target_type text NOT NULL CHECK (target_type IN ('message','prayer','resource','lesson','product')),
 target_id uuid NOT NULL,
 excerpt text NOT NULL CHECK (length(excerpt)<=4500),
 reason text NOT NULL CHECK (length(reason) BETWEEN 10 AND 1000),
 status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
 resolution text NOT NULL DEFAULT '' CHECK (length(resolution)<=1000),
 version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz
);
CREATE UNIQUE INDEX moderation_reports_open_idx ON ministrium.moderation_reports(reporter_uid,target_type,target_id) WHERE status='open';
CREATE INDEX moderation_reports_org_idx ON ministrium.moderation_reports(organization_id,id);
CREATE INDEX moderation_reports_queue_idx ON ministrium.moderation_reports(status,id);
CREATE INDEX moderation_reports_reporter_idx ON ministrium.moderation_reports(reporter_uid,created_at DESC);
CREATE TABLE ministrium.platform_audit (
 id uuid PRIMARY KEY,
 actor_uid text NOT NULL REFERENCES ministrium.identities(uid),
 action text NOT NULL CHECK (action IN ('owner_bound','workspace_suspended','workspace_restored','report_resolved','report_dismissed')),
 organization_id uuid REFERENCES ministrium.organizations(id),
 report_id uuid REFERENCES ministrium.moderation_reports(id),
 reason text NOT NULL CHECK (length(reason)<=1000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX platform_audit_actor_idx ON ministrium.platform_audit(actor_uid);
CREATE INDEX platform_audit_org_idx ON ministrium.platform_audit(organization_id);
CREATE INDEX platform_audit_report_idx ON ministrium.platform_audit(report_id);
CREATE INDEX platform_audit_created_idx ON ministrium.platform_audit(created_at DESC,id);
