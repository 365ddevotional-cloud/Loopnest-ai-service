-- Apply after backup, review, and staging validation. Does not alter existing content.
CREATE TABLE IF NOT EXISTS ministry_announcements (
 id serial PRIMARY KEY,
 title text NOT NULL,
 description text NOT NULL,
 category text NOT NULL DEFAULT 'whats_new',
 destination_url text NOT NULL,
 button_label text NOT NULL DEFAULT 'Learn More',
 is_published boolean NOT NULL DEFAULT false,
 starts_at timestamptz,
 ends_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ministry_announcements_active_idx ON ministry_announcements (is_published, starts_at, ends_at);
