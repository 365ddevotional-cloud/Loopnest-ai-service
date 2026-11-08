-- Store confidential files with the existing prayer data. Existing metadata stays readable.
CREATE TABLE IF NOT EXISTS prayer_attachment_files (
  attachment_id integer PRIMARY KEY REFERENCES prayer_attachments(id) ON DELETE CASCADE,
  bytes bytea NOT NULL CHECK (octet_length(bytes) BETWEEN 1 AND 5242880)
);

CREATE INDEX IF NOT EXISTS prayer_attachments_object_path_idx ON prayer_attachments(object_path);
