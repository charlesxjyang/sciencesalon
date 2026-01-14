import { createServiceRoleClient } from "@/lib/supabase/server";
import type { User } from "./types";

export interface SuggestedUser extends User {
  match_score: number;
  shared_count: number;
  shared_interests: string[];
}

/**
 * Get suggested users based on shared interests
 */
export async function getSuggestedUsers(
  orcidId: string,
  limit = 10
): Promise<SuggestedUser[]> {
  const supabase = createServiceRoleClient();

  // Find users with overlapping interests, weighted by interest weight
  const { data, error } = await supabase.rpc("get_suggested_users", {
    user_orcid: orcidId,
    result_limit: limit,
  });

  if (error) {
    // If RPC doesn't exist, fall back to manual query
    console.log("RPC not available, using fallback query");
    return getSuggestedUsersFallback(orcidId, limit);
  }

  return data || [];
}

/**
 * Fallback implementation without RPC
 */
async function getSuggestedUsersFallback(
  orcidId: string,
  limit: number
): Promise<SuggestedUser[]> {
  const supabase = createServiceRoleClient();

  // Get current user's interests
  const { data: myInterests } = await supabase
    .from("user_interests")
    .select("interest, weight")
    .eq("user_orcid", orcidId);

  if (!myInterests || myInterests.length === 0) {
    return [];
  }

  const myInterestSet = new Set(myInterests.map((i) => i.interest));
  const myInterestWeights = new Map(
    myInterests.map((i) => [i.interest, i.weight])
  );

  // Get users I'm already following
  const { data: following } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", orcidId);

  const followingSet = new Set(following?.map((f) => f.following_id) || []);

  // Get all other users' interests
  const { data: otherInterests } = await supabase
    .from("user_interests")
    .select("user_orcid, interest, weight")
    .neq("user_orcid", orcidId);

  if (!otherInterests) {
    return [];
  }

  // Calculate match scores
  const userScores = new Map<
    string,
    { score: number; shared: string[]; count: number }
  >();

  for (const interest of otherInterests) {
    // Skip if I'm already following them
    if (followingSet.has(interest.user_orcid)) continue;

    // Check if we share this interest
    if (!myInterestSet.has(interest.interest)) continue;

    const myWeight = myInterestWeights.get(interest.interest) || 0;
    const theirWeight = interest.weight;
    const matchScore = myWeight * theirWeight;

    const existing = userScores.get(interest.user_orcid) || {
      score: 0,
      shared: [],
      count: 0,
    };

    existing.score += matchScore;
    existing.shared.push(interest.interest);
    existing.count++;

    userScores.set(interest.user_orcid, existing);
  }

  // Sort by score and get top users
  const sortedUsers = Array.from(userScores.entries())
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, limit);

  if (sortedUsers.length === 0) {
    return [];
  }

  // Fetch user details
  const userOrcids = sortedUsers.map(([orcid]) => orcid);
  const { data: users } = await supabase
    .from("users")
    .select("*")
    .in("orcid_id", userOrcids);

  if (!users) {
    return [];
  }

  // Combine with scores
  const userMap = new Map(users.map((u) => [u.orcid_id, u]));

  return sortedUsers
    .map(([orcid, { score, shared, count }]) => {
      const user = userMap.get(orcid);
      if (!user) return null;

      return {
        ...user,
        match_score: score,
        shared_count: count,
        shared_interests: shared.slice(0, 5), // Top 5 shared interests
      } as SuggestedUser;
    })
    .filter(Boolean) as SuggestedUser[];
}
