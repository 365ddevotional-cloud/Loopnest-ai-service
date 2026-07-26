-- =============================================================================
-- Migration: 0001_governance_schema
-- Purpose:   Add platform governance layer to existing production database.
--            Safe to run on any database that already has the pre-governance
--            schema (churches, church_members, etc.).
--            All statements use IF NOT EXISTS / DO NOTHING guards.
-- =============================================================================

-- 1. New columns on churches ---------------------------------------------------
ALTER TABLE "churches"
  ADD COLUMN IF NOT EXISTS "platform_status"      text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS "platform_review_note" text,
  ADD COLUMN IF NOT EXISTS "platform_reviewed_at" timestamp,
  ADD COLUMN IF NOT EXISTS "platform_reviewed_by" text,
  ADD COLUMN IF NOT EXISTS "submitted_for_review_at" timestamp;

-- Backfill: all existing orgs are considered approved (they pre-date governance)
UPDATE "churches"
  SET "platform_status" = 'approved'
  WHERE "platform_status" IS NULL OR "platform_status" = '';

-- 2. Governance tables ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS "compliance_cases" (
  "id"                serial PRIMARY KEY NOT NULL,
  "church_id"         integer NOT NULL,
  "case_number"       text NOT NULL,
  "status"            text NOT NULL DEFAULT 'open',
  "category"          text NOT NULL DEFAULT 'other',
  "severity"          text NOT NULL DEFAULT 'medium',
  "description"       text NOT NULL,
  "internal_notes"    text,
  "enforcement_action" text,
  "enforcement_reason" text,
  "enforcement_at"    timestamp,
  "created_by"        text NOT NULL,
  "created_at"        timestamp DEFAULT now(),
  "updated_at"        timestamp DEFAULT now(),
  CONSTRAINT "compliance_cases_case_number_unique" UNIQUE("case_number")
);

CREATE TABLE IF NOT EXISTS "compliance_case_responses" (
  "id"             serial PRIMARY KEY NOT NULL,
  "case_id"        integer NOT NULL,
  "sender_type"    text NOT NULL,
  "sender_uid"     text NOT NULL,
  "message"        text NOT NULL,
  "attachment_url" text,
  "created_at"     timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "compliance_appeals" (
  "id"          serial PRIMARY KEY NOT NULL,
  "case_id"     integer,
  "church_id"   integer NOT NULL,
  "owner_uid"   text NOT NULL,
  "message"     text NOT NULL,
  "status"      text NOT NULL DEFAULT 'pending',
  "admin_note"  text,
  "reviewed_by" text,
  "reviewed_at" timestamp,
  "created_at"  timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "church_deletion_requests" (
  "id"          serial PRIMARY KEY NOT NULL,
  "church_id"   integer NOT NULL,
  "owner_uid"   text NOT NULL,
  "owner_email" text NOT NULL,
  "owner_name"  text,
  "reason"      text NOT NULL,
  "explanation" text,
  "status"      text NOT NULL DEFAULT 'pending',
  "reviewed_by" text,
  "reviewed_at" timestamp,
  "admin_note"  text,
  "created_at"  timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "platform_announcements" (
  "id"               serial PRIMARY KEY NOT NULL,
  "title"            text NOT NULL,
  "body"             text NOT NULL,
  "target_type"      text NOT NULL DEFAULT 'everyone',
  "target_filter"    text,
  "delivery_channels" text[] NOT NULL DEFAULT '{"in_app"}',
  "created_by"       text NOT NULL,
  "sent_at"          timestamp,
  "created_at"       timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "platform_admin_threads" (
  "id"               serial PRIMARY KEY NOT NULL,
  "church_id"        integer NOT NULL,
  "owner_uid"        text NOT NULL,
  "subject"          text NOT NULL,
  "status"           text NOT NULL DEFAULT 'open',
  "has_unread_admin" boolean NOT NULL DEFAULT false,
  "has_unread_owner" boolean NOT NULL DEFAULT false,
  "created_at"       timestamp DEFAULT now(),
  "updated_at"       timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "platform_admin_messages" (
  "id"          serial PRIMARY KEY NOT NULL,
  "thread_id"   integer NOT NULL,
  "sender_type" text NOT NULL,
  "sender_uid"  text NOT NULL,
  "message"     text NOT NULL,
  "created_at"  timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "platform_audit_logs" (
  "id"         serial PRIMARY KEY NOT NULL,
  "church_id"  integer,
  "action"     text NOT NULL,
  "actor_uid"  text NOT NULL,
  "old_value"  text,
  "new_value"  text,
  "created_at" timestamp DEFAULT now()
);

-- 3. Announcement read tracking -----------------------------------------------

CREATE TABLE IF NOT EXISTS "platform_announcement_reads" (
  "id"              serial PRIMARY KEY NOT NULL,
  "announcement_id" integer NOT NULL,
  "firebase_uid"    text NOT NULL,
  "read_at"         timestamp DEFAULT now(),
  CONSTRAINT "platform_announcement_reads_ann_uid_unique" UNIQUE("announcement_id", "firebase_uid")
);

DO $$ BEGIN
  ALTER TABLE "platform_announcement_reads"
    ADD CONSTRAINT "platform_announcement_reads_announcement_id_fk"
    FOREIGN KEY ("announcement_id") REFERENCES "platform_announcements"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Foreign key constraints (skip if already exist) --------------------------
DO $$ BEGIN
  ALTER TABLE "compliance_cases"
    ADD CONSTRAINT "compliance_cases_church_id_churches_id_fk"
    FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "compliance_case_responses"
    ADD CONSTRAINT "compliance_case_responses_case_id_fk"
    FOREIGN KEY ("case_id") REFERENCES "compliance_cases"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "compliance_appeals"
    ADD CONSTRAINT "compliance_appeals_church_id_fk"
    FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "compliance_appeals"
    ADD CONSTRAINT "compliance_appeals_case_id_fk"
    FOREIGN KEY ("case_id") REFERENCES "compliance_cases"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "church_deletion_requests"
    ADD CONSTRAINT "church_deletion_requests_church_id_fk"
    FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "platform_admin_threads"
    ADD CONSTRAINT "platform_admin_threads_church_id_fk"
    FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "platform_admin_messages"
    ADD CONSTRAINT "platform_admin_messages_thread_id_fk"
    FOREIGN KEY ("thread_id") REFERENCES "platform_admin_threads"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add preferred_language to user_profiles (idempotent)
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "preferred_language" text;

-- Add response_deadline to compliance_cases (idempotent)
ALTER TABLE "compliance_cases" ADD COLUMN IF NOT EXISTS "response_deadline" timestamp;
