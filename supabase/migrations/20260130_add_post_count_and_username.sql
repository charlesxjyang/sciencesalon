-- Add post_count column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS post_count integer DEFAULT 0;

-- Add username column (Twitter-style handle)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Create index on username for fast lookups
CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);

-- Create function to increment post count
CREATE OR REPLACE FUNCTION increment_post_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET post_count = post_count + 1
  WHERE orcid_id = NEW.author_orcid;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to decrement post count
CREATE OR REPLACE FUNCTION decrement_post_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET post_count = GREATEST(0, post_count - 1)
  WHERE orcid_id = OLD.author_orcid;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to increment on post insert
DROP TRIGGER IF EXISTS posts_increment_count ON posts;
CREATE TRIGGER posts_increment_count
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION increment_post_count();

-- Create trigger to decrement on post delete
DROP TRIGGER IF EXISTS posts_decrement_count ON posts;
CREATE TRIGGER posts_decrement_count
  AFTER DELETE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION decrement_post_count();

-- Backfill existing post counts
UPDATE users u
SET post_count = (
  SELECT COUNT(*)
  FROM posts p
  WHERE p.author_orcid = u.orcid_id
);
