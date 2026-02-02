-- Populate usernames for existing users with collision handling

-- First, create a function to generate unique usernames
CREATE OR REPLACE FUNCTION generate_unique_username(base_username TEXT)
RETURNS TEXT AS $$
DECLARE
  candidate TEXT;
  counter INT := 0;
BEGIN
  -- Truncate to 15 chars max, ensure at least 4 chars
  candidate := LEFT(base_username, 15);
  IF LENGTH(candidate) < 4 THEN
    candidate := candidate || '0001';
  END IF;

  -- Check if username exists, if so append numbers
  WHILE EXISTS (SELECT 1 FROM users WHERE username = candidate) LOOP
    counter := counter + 1;
    -- Leave room for suffix (up to 999)
    candidate := LEFT(base_username, 12) || counter::TEXT;
  END LOOP;

  RETURN candidate;
END;
$$ LANGUAGE plpgsql;

-- Update feeds one by one to handle collisions
DO $$
DECLARE
  r RECORD;
  base_name TEXT;
BEGIN
  FOR r IN SELECT orcid_id, feed_category FROM users WHERE is_feed = true AND username IS NULL AND feed_category IS NOT NULL
  LOOP
    base_name := LOWER(REPLACE(REPLACE(r.feed_category, '.', '_'), '-', '_'));
    UPDATE users SET username = generate_unique_username(base_name) WHERE orcid_id = r.orcid_id;
  END LOOP;
END $$;

-- Update regular users one by one to handle collisions
DO $$
DECLARE
  r RECORD;
  base_name TEXT;
BEGIN
  FOR r IN SELECT orcid_id, name FROM users WHERE is_feed = false AND username IS NULL AND name IS NOT NULL
  LOOP
    base_name := LOWER(REGEXP_REPLACE(r.name, '[^a-zA-Z0-9]', '', 'g'));
    UPDATE users SET username = generate_unique_username(base_name) WHERE orcid_id = r.orcid_id;
  END LOOP;
END $$;

-- Clean up the function
DROP FUNCTION generate_unique_username(TEXT);
