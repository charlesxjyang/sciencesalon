-- Add Google Scholar columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_scholar_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_scholar_synced_at TIMESTAMP WITH TIME ZONE;

-- Index for Google Scholar lookups
CREATE INDEX IF NOT EXISTS users_google_scholar_idx ON users(google_scholar_id) WHERE google_scholar_id IS NOT NULL;
