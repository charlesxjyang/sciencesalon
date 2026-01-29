/**
 * Migrate database columns from bot_* to feed_*
 * Run with: npx tsx scripts/migrate-bot-to-feed.ts
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(url, key);

async function migrate() {
  console.log("Migrating bot columns to feed columns...\n");

  // Run raw SQL to rename columns
  // Note: Supabase JS client doesn't support ALTER TABLE directly,
  // so we output the SQL and you can run it in the SQL editor

  const sql = `
-- Rename columns from bot_* to feed_*
ALTER TABLE users RENAME COLUMN is_bot TO is_feed;
ALTER TABLE users RENAME COLUMN bot_category TO feed_category;
ALTER TABLE users RENAME COLUMN bot_last_fetched_at TO feed_last_fetched_at;
  `.trim();

  console.log("Run this SQL in Supabase SQL Editor:\n");
  console.log(sql);
  console.log("\n");

  // Check current column names
  const { data: users, error } = await supabase
    .from("users")
    .select("*")
    .limit(1);

  if (error) {
    console.log("Note: If you get column errors, the migration may already be done.");
  } else if (users && users.length > 0) {
    const columns = Object.keys(users[0]);
    console.log("Current columns:", columns.join(", "));

    if (columns.includes("is_bot")) {
      console.log("\n⚠️  Migration needed - run the SQL above");
    } else if (columns.includes("is_feed")) {
      console.log("\n✓ Migration already complete");
    }
  }
}

migrate();
