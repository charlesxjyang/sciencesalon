-- Rename columns from bot_* to feed_*
ALTER TABLE users RENAME COLUMN is_bot TO is_feed;
ALTER TABLE users RENAME COLUMN bot_category TO feed_category;
ALTER TABLE users RENAME COLUMN bot_last_fetched_at TO feed_last_fetched_at;
