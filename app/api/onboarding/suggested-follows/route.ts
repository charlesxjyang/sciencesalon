import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getOrcidCoAuthors } from "@/lib/orcid";
import { TOPICS } from "@/lib/topics";
import type { User } from "@/lib/types";

export const dynamic = "force-dynamic";

export interface SuggestedFollow {
  user: User;
  reason: "coauthor" | "interests" | "popular";
  shared_interests?: string[];
  coauthor_papers?: number;
}

/**
 * GET: Get suggested users to follow during onboarding
 * Priority: 1. Co-authors from ORCID, 2. Users with shared interests, 3. Top followed users
 */
export async function GET() {
  const cookieStore = cookies();
  // Check onboarding cookie first (during onboarding), then regular user cookie
  const onboardingCookie = cookieStore.get("salon_onboarding");
  const userCookie = cookieStore.get("salon_user");
  const authCookie = onboardingCookie || userCookie;

  if (!authCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUser = JSON.parse(authCookie.value);
  const supabase = createServiceRoleClient();
  const suggestions: SuggestedFollow[] = [];
  const addedUserIds = new Set<string>();
  const targetCount = 10;

  // Helper to add a user if not already added
  const addUser = (user: User, reason: SuggestedFollow["reason"], extra: Partial<SuggestedFollow> = {}) => {
    if (addedUserIds.has(user.orcid_id) || user.orcid_id === currentUser.orcid_id) return false;
    addedUserIds.add(user.orcid_id);
    suggestions.push({ user, reason, ...extra });
    return true;
  };

  try {
    // 1. Find co-authors on the platform (only for ORCID users)
    if (!currentUser.orcid_id.startsWith("google_")) {
      const coAuthors = await getOrcidCoAuthors(currentUser.orcid_id);

      // Get ORCID IDs of co-authors who have them
      const coAuthorOrcidIds = coAuthors
        .filter(c => c.orcidId)
        .map(c => c.orcidId as string);

      if (coAuthorOrcidIds.length > 0) {
        // Find which co-authors are on the platform
        const { data: coAuthorUsers } = await supabase
          .from("users")
          .select("*")
          .in("orcid_id", coAuthorOrcidIds);

        if (coAuthorUsers) {
          for (const user of coAuthorUsers) {
            addUser(user, "coauthor");
            if (suggestions.length >= targetCount) break;
          }
        }
      }

      // Also try to match by name for co-authors without ORCID IDs
      if (suggestions.length < targetCount) {
        const coAuthorNames = coAuthors
          .filter(c => !c.orcidId)
          .map(c => c.name.toLowerCase().trim());

        if (coAuthorNames.length > 0) {
          const { data: nameMatchUsers } = await supabase
            .from("users")
            .select("*")
            .not("orcid_id", "eq", currentUser.orcid_id);

          if (nameMatchUsers) {
            for (const user of nameMatchUsers) {
              const userName = user.name.toLowerCase().trim();
              if (coAuthorNames.some(name =>
                name === userName ||
                name.includes(userName) ||
                userName.includes(name)
              )) {
                addUser(user, "coauthor");
                if (suggestions.length >= targetCount) break;
              }
            }
          }
        }
      }
    }

    // 2. Find users with shared interests
    if (suggestions.length < targetCount) {
      // Get current user's interests
      const { data: myInterests } = await supabase
        .from("user_interests")
        .select("topic_id")
        .eq("user_orcid", currentUser.orcid_id);

      if (myInterests && myInterests.length > 0) {
        const myTopicIds = myInterests.map(i => i.topic_id);
        const topicIdToName = new Map(TOPICS.map(t => [t.id, t.name]));

        // Get other users' interests
        const { data: otherInterests } = await supabase
          .from("user_interests")
          .select("user_orcid, topic_id")
          .neq("user_orcid", currentUser.orcid_id)
          .in("topic_id", myTopicIds);

        if (otherInterests && otherInterests.length > 0) {
          // Group by user and count shared interests
          const userSharedInterests = new Map<string, string[]>();
          for (const interest of otherInterests) {
            if (addedUserIds.has(interest.user_orcid)) continue;

            const shared = userSharedInterests.get(interest.user_orcid) || [];
            shared.push(interest.topic_id);
            userSharedInterests.set(interest.user_orcid, shared);
          }

          // Sort by number of shared interests
          const sortedUsers = Array.from(userSharedInterests.entries())
            .sort((a, b) => b[1].length - a[1].length)
            .slice(0, targetCount - suggestions.length);

          if (sortedUsers.length > 0) {
            const userOrcids = sortedUsers.map(([orcid]) => orcid);
            const { data: users } = await supabase
              .from("users")
              .select("*")
              .in("orcid_id", userOrcids);

            if (users) {
              for (const [orcid, topicIds] of sortedUsers) {
                const user = users.find(u => u.orcid_id === orcid);
                if (user) {
                  addUser(user, "interests", {
                    shared_interests: topicIds
                      .slice(0, 3)
                      .map(id => topicIdToName.get(id) || id),
                  });
                  if (suggestions.length >= targetCount) break;
                }
              }
            }
          }
        }
      }
    }

    // 3. Fall back to top followed users
    if (suggestions.length < targetCount) {
      // Get follower counts for all users
      const { data: followerCounts } = await supabase
        .from("follows")
        .select("following_id");

      if (followerCounts) {
        // Count followers per user
        const counts = new Map<string, number>();
        for (const row of followerCounts) {
          counts.set(row.following_id, (counts.get(row.following_id) || 0) + 1);
        }

        // Sort by follower count and exclude already added users
        const topUsers = Array.from(counts.entries())
          .filter(([orcid]) => !addedUserIds.has(orcid) && orcid !== currentUser.orcid_id)
          .sort((a, b) => b[1] - a[1])
          .slice(0, targetCount - suggestions.length);

        if (topUsers.length > 0) {
          const { data: users } = await supabase
            .from("users")
            .select("*")
            .in("orcid_id", topUsers.map(([orcid]) => orcid));

          if (users) {
            for (const [orcid] of topUsers) {
              const user = users.find(u => u.orcid_id === orcid);
              if (user) {
                addUser(user, "popular");
                if (suggestions.length >= targetCount) break;
              }
            }
          }
        }
      }

      // If still not enough, just get some active users
      if (suggestions.length < targetCount) {
        const { data: activeUsers } = await supabase
          .from("users")
          .select("*")
          .neq("orcid_id", currentUser.orcid_id)
          .order("created_at", { ascending: false })
          .limit(targetCount - suggestions.length);

        if (activeUsers) {
          for (const user of activeUsers) {
            addUser(user, "popular");
            if (suggestions.length >= targetCount) break;
          }
        }
      }
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Error getting follow suggestions:", error);
    return NextResponse.json(
      { error: "Failed to get suggestions" },
      { status: 500 }
    );
  }
}
