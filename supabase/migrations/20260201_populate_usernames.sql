-- Populate usernames for existing users

-- For feeds: use feed_category converted to valid username (dots and dashes to underscores)
UPDATE users
SET username = LOWER(REPLACE(REPLACE(feed_category, '.', '_'), '-', '_'))
WHERE is_feed = true AND username IS NULL AND feed_category IS NOT NULL;

-- For regular users: use name with spaces removed, lowercased, non-alphanumeric removed
UPDATE users
SET username = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g'))
WHERE is_feed = false AND username IS NULL AND name IS NOT NULL;

-- Handle any usernames that are too short (< 4 chars) by appending numbers
UPDATE users
SET username = username || '0001'
WHERE LENGTH(username) < 4 AND username IS NOT NULL;

-- Handle any usernames that are too long (> 15 chars) by truncating
UPDATE users
SET username = LEFT(username, 15)
WHERE LENGTH(username) > 15 AND username IS NOT NULL;
