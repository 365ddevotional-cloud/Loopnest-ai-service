CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"church_id" integer,
	"department_id" integer,
	"action" text NOT NULL,
	"previous_value" text,
	"new_value" text,
	"actor_uid" text NOT NULL,
	"actor_role" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "auto_reply_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_type" text NOT NULL,
	"encouragement" text NOT NULL,
	"scripture_reference" text NOT NULL,
	"scripture_text" text NOT NULL,
	"prayer" text NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "auto_reply_templates_template_type_unique" UNIQUE("template_type")
);
--> statement-breakpoint
CREATE TABLE "bible_passages" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"translation" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "bible_passages_reference_translation_unique" UNIQUE("reference","translation")
);
--> statement-breakpoint
CREATE TABLE "church_activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"church_id" integer NOT NULL,
	"firebase_uid" text NOT NULL,
	"display_name" text,
	"activity_type" text NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "church_announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"church_id" integer NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp,
	"image_url" text,
	"pdf_url" text,
	"external_link" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "church_conversation_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"church_id" integer NOT NULL,
	"firebase_uid" text NOT NULL,
	"display_name" text,
	"role" text DEFAULT 'member' NOT NULL,
	"added_by" text,
	"added_at" timestamp DEFAULT now(),
	CONSTRAINT "church_conversation_participants_conversation_id_firebase_uid_unique" UNIQUE("conversation_id","firebase_uid")
);
--> statement-breakpoint
CREATE TABLE "church_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"church_id" integer NOT NULL,
	"subject" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_by" text NOT NULL,
	"assigned_to" text,
	"is_urgent" boolean DEFAULT false NOT NULL,
	"target_type" text DEFAULT 'direct' NOT NULL,
	"target_group_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "church_deletion_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"church_id" integer NOT NULL,
	"owner_uid" text NOT NULL,
	"owner_email" text NOT NULL,
	"owner_name" text,
	"reason" text NOT NULL,
	"explanation" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"admin_note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "church_department_attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"department_id" integer NOT NULL,
	"session_date" timestamp NOT NULL,
	"session_title" text,
	"attendee_ids" integer[] NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "church_department_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"department_id" integer NOT NULL,
	"created_by" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"location" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"is_all_day" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "church_department_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"department_id" integer NOT NULL,
	"church_member_id" integer NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "church_department_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"department_id" integer NOT NULL,
	"author_member_id" integer NOT NULL,
	"type" text DEFAULT 'message' NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"file_url" text,
	"file_name" text,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "church_department_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"department_id" integer NOT NULL,
	"created_by" integer NOT NULL,
	"assigned_to" integer,
	"title" text NOT NULL,
	"description" text,
	"due_date" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "church_departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"church_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"type" text DEFAULT 'Custom' NOT NULL,
	"description" text,
	"logo_url" text,
	"banner_url" text,
	"invite_code" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "church_giving_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"church_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "church_giving_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"church_id" integer NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"platform_fee_accepted" boolean DEFAULT false NOT NULL,
	"giving_statement" text,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "church_giving_settings_church_id_unique" UNIQUE("church_id")
);
--> statement-breakpoint
CREATE TABLE "church_group_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"firebase_uid" text NOT NULL,
	"display_name" text,
	"email" text NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	CONSTRAINT "church_group_members_group_id_firebase_uid_unique" UNIQUE("group_id","firebase_uid")
);
--> statement-breakpoint
CREATE TABLE "church_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"church_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"leader_id" text,
	"leader_name" text,
	"meeting_schedule" text,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "church_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"church_id" integer NOT NULL,
	"invite_code" text NOT NULL,
	"created_by" text NOT NULL,
	"expires_at" timestamp,
	"max_uses" integer,
	"approved_uses" integer DEFAULT 0 NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"label" text,
	"invitation_type" text DEFAULT 'membership' NOT NULL,
	"target_group_id" integer,
	"target_group_name" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "church_invitations_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "church_member_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"church_id" integer NOT NULL,
	"firebase_uid" text NOT NULL,
	"full_name" text,
	"phone" text,
	"country" text,
	"city" text,
	"address" text,
	"bio" text,
	"photo_url" text,
	"show_in_directory" boolean DEFAULT true NOT NULL,
	"allow_member_messages" boolean DEFAULT true NOT NULL,
	"allow_leader_contact" boolean DEFAULT true NOT NULL,
	"show_phone_to_leaders_only" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "church_member_profiles_church_id_firebase_uid_unique" UNIQUE("church_id","firebase_uid")
);
--> statement-breakpoint
CREATE TABLE "church_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"church_id" integer NOT NULL,
	"firebase_uid" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"invited_group_id" integer,
	"invite_code_used" text,
	"joined_at" timestamp DEFAULT now(),
	CONSTRAINT "church_members_church_id_firebase_uid_unique" UNIQUE("church_id","firebase_uid")
);
--> statement-breakpoint
CREATE TABLE "church_message_reads" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"firebase_uid" text NOT NULL,
	"read_at" timestamp DEFAULT now(),
	CONSTRAINT "church_message_reads_message_id_firebase_uid_unique" UNIQUE("message_id","firebase_uid")
);
--> statement-breakpoint
CREATE TABLE "church_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"church_id" integer NOT NULL,
	"sender_uid" text NOT NULL,
	"sender_name" text,
	"sender_role" text,
	"body" text NOT NULL,
	"is_system_message" boolean DEFAULT false NOT NULL,
	"deleted_by_sender" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "church_payout_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"church_id" integer NOT NULL,
	"country" text,
	"currency" text,
	"legal_name" text,
	"public_name" text,
	"account_holder_name" text,
	"bank_name" text,
	"account_number" text,
	"routing_number" text,
	"swift_bic" text,
	"mobile_money_provider" text,
	"mobile_money_number" text,
	"contact_email" text,
	"contact_phone" text,
	"verification_status" text DEFAULT 'unverified' NOT NULL,
	"is_authorized_to_receive" boolean DEFAULT false NOT NULL,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "church_payout_configs_church_id_unique" UNIQUE("church_id")
);
--> statement-breakpoint
CREATE TABLE "church_prayer_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"church_id" integer NOT NULL,
	"firebase_uid" text NOT NULL,
	"display_name" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"is_confidential" boolean DEFAULT false NOT NULL,
	"prayer_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "church_sermon_bookmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"sermon_id" integer NOT NULL,
	"church_id" integer NOT NULL,
	"firebase_uid" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "church_sermon_bookmarks_sermon_id_firebase_uid_unique" UNIQUE("sermon_id","firebase_uid")
);
--> statement-breakpoint
CREATE TABLE "church_sermon_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"sermon_id" integer NOT NULL,
	"church_id" integer NOT NULL,
	"firebase_uid" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "church_sermon_notes_sermon_id_firebase_uid_unique" UNIQUE("sermon_id","firebase_uid")
);
--> statement-breakpoint
CREATE TABLE "church_sermons" (
	"id" serial PRIMARY KEY NOT NULL,
	"church_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"speaker_name" text,
	"video_url" text,
	"audio_url" text,
	"pdf_notes_url" text,
	"outline_url" text,
	"image_url" text,
	"bible_reference" text,
	"sermon_date" timestamp,
	"scheduled_date" timestamp,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "church_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"church_id" integer NOT NULL,
	"category_id" integer,
	"category_name" text NOT NULL,
	"donor_firebase_uid" text,
	"donor_name" text,
	"donor_email" text,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"note" text,
	"currency" text DEFAULT 'USD' NOT NULL,
	"gross_amount" integer NOT NULL,
	"platform_fee_amount" integer DEFAULT 0 NOT NULL,
	"provider_fee_amount" integer DEFAULT 0 NOT NULL,
	"church_net_amount" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payout_status" text DEFAULT 'pending' NOT NULL,
	"stripe_session_id" text,
	"stripe_payment_intent_id" text,
	"reference" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "church_transactions_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "churches" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"logo_url" text,
	"website_url" text,
	"address" text,
	"denomination" text,
	"owner_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"approval_mode" text DEFAULT 'require_approval' NOT NULL,
	"member_directory_enabled" boolean DEFAULT false NOT NULL,
	"banner_url" text,
	"theme_color" text,
	"created_at" timestamp DEFAULT now(),
	"pastor_name" text,
	"phone" text,
	"email" text,
	"service_times" jsonb,
	"mission_statement" text,
	"vision" text,
	"welcome_message" text,
	"social_links" jsonb,
	"public_photos" text[],
	"public_website_enabled" boolean DEFAULT true NOT NULL,
	"map_embed_url" text,
	"visitor_info" text,
	"website_hero_image" text,
	"homepage_sections" jsonb,
	"country" text,
	"platform_status" text DEFAULT 'approved' NOT NULL,
	"platform_review_note" text,
	"platform_reviewed_at" timestamp,
	"platform_reviewed_by" text,
	"submitted_for_review_at" timestamp,
	CONSTRAINT "churches_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "compliance_appeals" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer,
	"church_id" integer NOT NULL,
	"owner_uid" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"admin_note" text,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "compliance_case_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"sender_type" text NOT NULL,
	"sender_uid" text NOT NULL,
	"message" text NOT NULL,
	"attachment_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "compliance_cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"church_id" integer NOT NULL,
	"case_number" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"description" text NOT NULL,
	"internal_notes" text,
	"enforcement_action" text,
	"enforcement_reason" text,
	"enforcement_at" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "compliance_cases_case_number_unique" UNIQUE("case_number")
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"is_urgent" boolean DEFAULT false,
	"is_prayer_related" boolean DEFAULT false,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "devotional_translations" (
	"id" serial PRIMARY KEY NOT NULL,
	"devotional_id" integer NOT NULL,
	"language_code" text NOT NULL,
	"devotional_message" text NOT NULL,
	"prayer_points" text[] NOT NULL,
	"faith_declarations" text[] NOT NULL,
	"christian_quotes" text,
	"prophetic_declaration" text,
	"scripture_text_translated" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "devotional_translations_devotional_id_language_code_unique" UNIQUE("devotional_id","language_code")
);
--> statement-breakpoint
CREATE TABLE "devotionals" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"title" text NOT NULL,
	"scripture_reference" text NOT NULL,
	"scripture_text" text NOT NULL,
	"content" text NOT NULL,
	"prayer_points" text[] NOT NULL,
	"faith_declarations" text[] NOT NULL,
	"author" text DEFAULT 'Moses Afolabi',
	"created_at" timestamp DEFAULT now(),
	"is_deleted" boolean DEFAULT false,
	"deleted_at" timestamp,
	"red_letter_enabled" boolean DEFAULT true,
	"seasonal_override" boolean DEFAULT false,
	"christian_quotes" text,
	"prophetic_declaration" text,
	CONSTRAINT "devotionals_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "donation_confirmations" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"email" text,
	"phone_whatsapp" text,
	"country" text,
	"amount" text NOT NULL,
	"currency" text NOT NULL,
	"payment_method" text NOT NULL,
	"giving_type" text NOT NULL,
	"payment_reference" text,
	"message" text,
	"wants_thank_you" boolean DEFAULT false,
	"thank_you_status" text DEFAULT 'not_sent' NOT NULL,
	"thank_you_sent_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feedback_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"feedback_type" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"theme_config" jsonb,
	"music_file" text,
	"settings" jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "games_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "general_inquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"topic" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "giving_methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'other' NOT NULL,
	"url" text,
	"handle" text,
	"instructions" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "global_giving_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"setting_key" text NOT NULL,
	"setting_value" text NOT NULL,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "global_giving_settings_setting_key_unique" UNIQUE("setting_key")
);
--> statement-breakpoint
CREATE TABLE "inbox_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" integer NOT NULL,
	"sender_type" text NOT NULL,
	"message" text NOT NULL,
	"deleted_by_user" boolean DEFAULT false,
	"deleted_by_admin" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inbox_threads" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_email" text NOT NULL,
	"user_name" text NOT NULL,
	"subject" text NOT NULL,
	"category" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"has_unread_admin" boolean DEFAULT false,
	"has_unread_user" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "partnership_inquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"organization" text,
	"email" text NOT NULL,
	"partnership_type" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "platform_admin_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" integer NOT NULL,
	"sender_type" text NOT NULL,
	"sender_uid" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "platform_admin_threads" (
	"id" serial PRIMARY KEY NOT NULL,
	"church_id" integer NOT NULL,
	"owner_uid" text NOT NULL,
	"subject" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"has_unread_admin" boolean DEFAULT false NOT NULL,
	"has_unread_owner" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "platform_announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"target_type" text DEFAULT 'everyone' NOT NULL,
	"target_filter" text,
	"delivery_channels" text[] DEFAULT '{"in_app"}' NOT NULL,
	"created_by" text NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prayer_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"content_type" text NOT NULL,
	"object_path" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prayer_follow_ups" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"day_number" integer NOT NULL,
	"message" text NOT NULL,
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prayer_replies" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"reply_message" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prayer_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" text,
	"email" text,
	"phone_number" text,
	"sms_enabled" boolean DEFAULT false,
	"subject" text,
	"message" text NOT NULL,
	"is_anonymous" boolean DEFAULT false,
	"priority" text DEFAULT 'prayer_normal' NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"firebase_uid" text,
	"answered_at" timestamp,
	"answer_note" text,
	"privacy" text DEFAULT 'private'
);
--> statement-breakpoint
CREATE TABLE "promise_amens" (
	"id" serial PRIMARY KEY NOT NULL,
	"promise_id" integer NOT NULL,
	"session_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "promise_delivery_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"last_index" integer DEFAULT 0 NOT NULL,
	"last_sent_time" timestamp DEFAULT now(),
	"is_enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "song_testimonies" (
	"id" serial PRIMARY KEY NOT NULL,
	"song_id" integer NOT NULL,
	"name" text NOT NULL,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"email" text,
	"testimony" text NOT NULL,
	"consent_to_publish" boolean DEFAULT false NOT NULL,
	"is_approved" boolean DEFAULT false,
	"is_featured" boolean DEFAULT false,
	"song_title" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "songs" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"artist" text,
	"featured_artist" text,
	"label_name" text DEFAULT 'SpiritTone Records' NOT NULL,
	"label_logo_url" text,
	"producer" text DEFAULT 'Moses Afolabi' NOT NULL,
	"composer" text,
	"lyricist" text,
	"choir" text,
	"instrumentalist" text,
	"genre" text,
	"language" text DEFAULT 'English',
	"scripture_reference" text NOT NULL,
	"scripture_text" text,
	"lyrics" text,
	"audio_url" text,
	"cover_image_url" text,
	"short_description" text,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"featured_week_start" date,
	"featured_week_end" date,
	"release_year" integer,
	"copyright_notice" text,
	"download_status" text DEFAULT 'free' NOT NULL,
	"video_url" text,
	"video_download_status" text DEFAULT 'disabled' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "songs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sunday_school_lessons" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"date" date NOT NULL,
	"scripture_references" text NOT NULL,
	"scripture_text" text NOT NULL,
	"lesson_content" text NOT NULL,
	"discussion_questions" text[] NOT NULL,
	"prayer_focus" text NOT NULL,
	"weekly_assignment" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "sunday_school_lessons_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"issue_description" text NOT NULL,
	"device_browser" text,
	"email" text,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "testimonies" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer,
	"name" text,
	"country" text,
	"message" text NOT NULL,
	"photo_url" text,
	"is_approved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"firebase_uid" text,
	"is_draft" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "thread_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"message" text NOT NULL,
	"sender_type" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_activity_days" (
	"id" serial PRIMARY KEY NOT NULL,
	"firebase_uid" text NOT NULL,
	"activity_date" date NOT NULL,
	CONSTRAINT "user_activity_days_firebase_uid_activity_date_unique" UNIQUE("firebase_uid","activity_date")
);
--> statement-breakpoint
CREATE TABLE "user_devotional_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"firebase_uid" text NOT NULL,
	"devotional_id" integer NOT NULL,
	"first_opened_at" timestamp DEFAULT now(),
	"last_opened_at" timestamp DEFAULT now(),
	CONSTRAINT "user_devotional_history_firebase_uid_devotional_id_unique" UNIQUE("firebase_uid","devotional_id")
);
--> statement-breakpoint
CREATE TABLE "user_devotional_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"firebase_uid" text NOT NULL,
	"devotional_id" integer NOT NULL,
	"note_text" text NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_devotional_notes_firebase_uid_devotional_id_unique" UNIQUE("firebase_uid","devotional_id")
);
--> statement-breakpoint
CREATE TABLE "user_devotional_streak" (
	"id" serial PRIMARY KEY NOT NULL,
	"firebase_uid" text NOT NULL,
	"current_streak" integer DEFAULT 0,
	"longest_streak" integer DEFAULT 0,
	"last_read_date" text,
	CONSTRAINT "user_devotional_streak_firebase_uid_unique" UNIQUE("firebase_uid")
);
--> statement-breakpoint
CREATE TABLE "user_download_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"firebase_uid" text NOT NULL,
	"song_id" integer NOT NULL,
	"downloaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_favorite_songs" (
	"id" serial PRIMARY KEY NOT NULL,
	"firebase_uid" text NOT NULL,
	"song_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_favorite_songs_firebase_uid_song_id_unique" UNIQUE("firebase_uid","song_id")
);
--> statement-breakpoint
CREATE TABLE "user_music_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"firebase_uid" text NOT NULL,
	"autoplay_next" boolean DEFAULT false,
	"remember_position" boolean DEFAULT true,
	"default_speed" real DEFAULT 1,
	"repeat_mode" text DEFAULT 'none',
	"shuffle" boolean DEFAULT false,
	CONSTRAINT "user_music_settings_firebase_uid_unique" UNIQUE("firebase_uid")
);
--> statement-breakpoint
CREATE TABLE "user_playback_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"firebase_uid" text NOT NULL,
	"song_id" integer NOT NULL,
	"last_position" integer DEFAULT 0,
	"duration_secs" integer DEFAULT 0,
	"progress_percent" integer DEFAULT 0,
	"last_played_at" timestamp DEFAULT now(),
	CONSTRAINT "user_playback_history_firebase_uid_song_id_unique" UNIQUE("firebase_uid","song_id")
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"firebase_uid" text PRIMARY KEY NOT NULL,
	"display_name" text,
	"email" text NOT NULL,
	"country" text,
	"profile_picture_url" text,
	"created_at" timestamp DEFAULT now(),
	"last_active_at" timestamp DEFAULT now(),
	"email_consent_ministry" boolean DEFAULT false NOT NULL,
	"email_consent_notifications" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_saved_devotionals" (
	"id" serial PRIMARY KEY NOT NULL,
	"firebase_uid" text NOT NULL,
	"devotional_id" integer NOT NULL,
	"saved_at" timestamp DEFAULT now(),
	CONSTRAINT "user_saved_devotionals_firebase_uid_devotional_id_unique" UNIQUE("firebase_uid","devotional_id")
);
--> statement-breakpoint
CREATE TABLE "user_saved_songs" (
	"id" serial PRIMARY KEY NOT NULL,
	"firebase_uid" text NOT NULL,
	"song_id" integer NOT NULL,
	"saved_at" timestamp DEFAULT now(),
	CONSTRAINT "user_saved_songs_firebase_uid_song_id_unique" UNIQUE("firebase_uid","song_id")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_activity_log" ADD CONSTRAINT "church_activity_log_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_announcements" ADD CONSTRAINT "church_announcements_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_conversation_participants" ADD CONSTRAINT "church_conversation_participants_conversation_id_church_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."church_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_conversations" ADD CONSTRAINT "church_conversations_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_deletion_requests" ADD CONSTRAINT "church_deletion_requests_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_department_attendance" ADD CONSTRAINT "church_department_attendance_department_id_church_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."church_departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_department_attendance" ADD CONSTRAINT "church_department_attendance_created_by_church_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."church_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_department_events" ADD CONSTRAINT "church_department_events_department_id_church_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."church_departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_department_events" ADD CONSTRAINT "church_department_events_created_by_church_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."church_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_department_members" ADD CONSTRAINT "church_department_members_department_id_church_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."church_departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_department_members" ADD CONSTRAINT "church_department_members_church_member_id_church_members_id_fk" FOREIGN KEY ("church_member_id") REFERENCES "public"."church_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_department_posts" ADD CONSTRAINT "church_department_posts_department_id_church_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."church_departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_department_posts" ADD CONSTRAINT "church_department_posts_author_member_id_church_members_id_fk" FOREIGN KEY ("author_member_id") REFERENCES "public"."church_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_department_tasks" ADD CONSTRAINT "church_department_tasks_department_id_church_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."church_departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_department_tasks" ADD CONSTRAINT "church_department_tasks_created_by_church_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."church_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_department_tasks" ADD CONSTRAINT "church_department_tasks_assigned_to_church_members_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."church_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_departments" ADD CONSTRAINT "church_departments_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_giving_categories" ADD CONSTRAINT "church_giving_categories_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_giving_settings" ADD CONSTRAINT "church_giving_settings_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_group_members" ADD CONSTRAINT "church_group_members_group_id_church_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."church_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_groups" ADD CONSTRAINT "church_groups_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_invitations" ADD CONSTRAINT "church_invitations_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_member_profiles" ADD CONSTRAINT "church_member_profiles_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_members" ADD CONSTRAINT "church_members_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_message_reads" ADD CONSTRAINT "church_message_reads_message_id_church_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."church_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_messages" ADD CONSTRAINT "church_messages_conversation_id_church_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."church_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_payout_configs" ADD CONSTRAINT "church_payout_configs_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_prayer_requests" ADD CONSTRAINT "church_prayer_requests_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_sermon_bookmarks" ADD CONSTRAINT "church_sermon_bookmarks_sermon_id_church_sermons_id_fk" FOREIGN KEY ("sermon_id") REFERENCES "public"."church_sermons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_sermon_notes" ADD CONSTRAINT "church_sermon_notes_sermon_id_church_sermons_id_fk" FOREIGN KEY ("sermon_id") REFERENCES "public"."church_sermons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_sermons" ADD CONSTRAINT "church_sermons_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_transactions" ADD CONSTRAINT "church_transactions_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_transactions" ADD CONSTRAINT "church_transactions_category_id_church_giving_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."church_giving_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_appeals" ADD CONSTRAINT "compliance_appeals_case_id_compliance_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."compliance_cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_appeals" ADD CONSTRAINT "compliance_appeals_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_case_responses" ADD CONSTRAINT "compliance_case_responses_case_id_compliance_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."compliance_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_cases" ADD CONSTRAINT "compliance_cases_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devotional_translations" ADD CONSTRAINT "devotional_translations_devotional_id_devotionals_id_fk" FOREIGN KEY ("devotional_id") REFERENCES "public"."devotionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_admin_messages" ADD CONSTRAINT "platform_admin_messages_thread_id_platform_admin_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."platform_admin_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_admin_threads" ADD CONSTRAINT "platform_admin_threads_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_testimonies" ADD CONSTRAINT "song_testimonies_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_devotional_history" ADD CONSTRAINT "user_devotional_history_devotional_id_devotionals_id_fk" FOREIGN KEY ("devotional_id") REFERENCES "public"."devotionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_devotional_notes" ADD CONSTRAINT "user_devotional_notes_devotional_id_devotionals_id_fk" FOREIGN KEY ("devotional_id") REFERENCES "public"."devotionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_download_history" ADD CONSTRAINT "user_download_history_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorite_songs" ADD CONSTRAINT "user_favorite_songs_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_playback_history" ADD CONSTRAINT "user_playback_history_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_saved_devotionals" ADD CONSTRAINT "user_saved_devotionals_devotional_id_devotionals_id_fk" FOREIGN KEY ("devotional_id") REFERENCES "public"."devotionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_saved_songs" ADD CONSTRAINT "user_saved_songs_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;