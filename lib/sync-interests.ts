import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchOrcidWorks } from "./orcid-works";
import { extractInterestsFromWorks } from "./interests";

/**
 * Sync user interests from their ORCID works
 * Returns the number of interests saved
 */
export async function syncUserInterests(orcidId: string): Promise<number> {
  // Skip for non-ORCID users (e.g., google_xxx)
  if (orcidId.startsWith("google_") || orcidId.startsWith("bot_")) {
    return 0;
  }

  const supabase = createServiceRoleClient();

  try {
    // Fetch works from ORCID
    console.log(`Fetching ORCID works for ${orcidId}...`);
    const works = await fetchOrcidWorks(orcidId);
    console.log(`Found ${works.length} works for ${orcidId}`);

    if (works.length === 0) {
      return 0;
    }

    // Extract interests
    console.log(`Extracting interests from works...`);
    const interests = await extractInterestsFromWorks(works);
    console.log(`Extracted ${interests.length} interests for ${orcidId}`);

    if (interests.length === 0) {
      return 0;
    }

    // Delete existing interests
    await supabase
      .from("user_interests")
      .delete()
      .eq("user_orcid", orcidId);

    // Insert new interests
    const { error: insertError } = await supabase
      .from("user_interests")
      .insert(
        interests.map((interest) => ({
          user_orcid: orcidId,
          interest: interest.interest,
          weight: interest.weight,
          source: interest.source,
        }))
      );

    if (insertError) {
      console.error(`Error inserting interests for ${orcidId}:`, insertError);
      throw insertError;
    }

    // Update user's interests_updated_at
    await supabase
      .from("users")
      .update({ interests_updated_at: new Date().toISOString() })
      .eq("orcid_id", orcidId);

    return interests.length;
  } catch (error) {
    console.error(`Error syncing interests for ${orcidId}:`, error);
    throw error;
  }
}

/**
 * Check if user interests need to be synced (null or older than 7 days)
 */
export async function shouldSyncInterests(orcidId: string): Promise<boolean> {
  // Skip for non-ORCID users
  if (orcidId.startsWith("google_") || orcidId.startsWith("bot_")) {
    return false;
  }

  const supabase = createServiceRoleClient();

  const { data: user } = await supabase
    .from("users")
    .select("interests_updated_at")
    .eq("orcid_id", orcidId)
    .single();

  if (!user?.interests_updated_at) {
    return true;
  }

  const lastUpdated = new Date(user.interests_updated_at);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  return lastUpdated < sevenDaysAgo;
}
