/**
 * Script to create bot users for all arXiv categories
 * Run with: npx tsx scripts/create-arxiv-bots.ts
 *
 * Or generate SQL with: npx tsx scripts/create-arxiv-bots.ts --sql
 */

import { ARXIV_CATEGORIES, generateBotId, generateBotName } from "../lib/arxiv-categories";

const generateSQL = process.argv.includes("--sql");

if (generateSQL) {
  // Generate SQL INSERT statements
  console.log("-- SQL to create arXiv bot users");
  console.log("-- Run this in Supabase SQL Editor\n");

  console.log("INSERT INTO users (orcid_id, name, bio, is_bot, bot_category, onboarding_completed)");
  console.log("VALUES");

  const values = ARXIV_CATEGORIES.map((category, index) => {
    const botId = generateBotId(category.id);
    const botName = generateBotName(category);
    const bio = `Automatically shares new papers from arXiv ${category.id} (${category.name})`;
    const isLast = index === ARXIV_CATEGORIES.length - 1;

    return `  ('${botId}', '${botName.replace(/'/g, "''")}', '${bio.replace(/'/g, "''")}', true, '${category.id}', true)${isLast ? "" : ","}`;
  });

  console.log(values.join("\n"));
  console.log("ON CONFLICT (orcid_id) DO UPDATE SET");
  console.log("  name = EXCLUDED.name,");
  console.log("  bio = EXCLUDED.bio,");
  console.log("  bot_category = EXCLUDED.bot_category;");

  console.log(`\n-- Total: ${ARXIV_CATEGORIES.length} bot users`);
} else {
  // Run with Supabase client
  (async () => {
    const { createClient } = await import("@supabase/supabase-js");

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      console.log("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
      console.log("Run with --sql flag to generate SQL instead:");
      console.log("  npx tsx scripts/create-arxiv-bots.ts --sql");
      process.exit(1);
    }

    const supabase = createClient(url, key);

    console.log(`Creating ${ARXIV_CATEGORIES.length} arXiv bot users...`);

    const bots = ARXIV_CATEGORIES.map((category) => ({
      orcid_id: generateBotId(category.id),
      name: generateBotName(category),
      bio: `Automatically shares new papers from arXiv ${category.id} (${category.name})`,
      is_bot: true,
      bot_category: category.id,
      onboarding_completed: true,
    }));

    // Upsert in batches of 50
    const batchSize = 50;
    let created = 0;
    let errors = 0;

    for (let i = 0; i < bots.length; i += batchSize) {
      const batch = bots.slice(i, i + batchSize);

      const { error } = await supabase
        .from("users")
        .upsert(batch, { onConflict: "orcid_id" });

      if (error) {
        console.error(`Error upserting batch ${i / batchSize + 1}:`, error.message);
        errors += batch.length;
      } else {
        created += batch.length;
        console.log(`Created/updated batch ${Math.floor(i / batchSize) + 1}: ${batch.length} bots`);
      }
    }

    console.log(`\nDone! Created/updated: ${created}, Errors: ${errors}`);
  })();
}
