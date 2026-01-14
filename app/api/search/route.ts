import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get("q")?.trim();
  const type = searchParams.get("type") || "all"; // all, users, papers

  if (!query || query.length < 2) {
    return NextResponse.json({
      users: [],
      papers: [],
      error: "Query must be at least 2 characters",
    });
  }

  const supabase = createServerSupabaseClient();

  // Get current user for follow status
  const cookieStore = cookies();
  const userCookie = cookieStore.get("salon_user");
  const currentUser = userCookie ? JSON.parse(userCookie.value) : null;

  const results: {
    users: unknown[];
    papers: unknown[];
  } = {
    users: [],
    papers: [],
  };

  // Search users
  if (type === "all" || type === "users") {
    const { data: users } = await supabase
      .from("users")
      .select("*")
      .ilike("name", `%${query}%`)
      .limit(20);

    if (users && users.length > 0) {
      // Get bot info for matching users
      const userOrcids = users.map((u) => u.orcid_id);
      const { data: bots } = await supabase
        .from("bots")
        .select("user_orcid, category")
        .in("user_orcid", userOrcids);

      const botMap = new Map(bots?.map((b) => [b.user_orcid, b]) || []);

      // Get follower counts
      const { data: followerCounts } = await supabase
        .from("follows")
        .select("following_id")
        .in("following_id", userOrcids);

      const followersCountMap = new Map<string, number>();
      followerCounts?.forEach((f) => {
        followersCountMap.set(
          f.following_id,
          (followersCountMap.get(f.following_id) || 0) + 1
        );
      });

      // Check which users the current user follows
      let currentUserFollowing: Set<string> = new Set();
      if (currentUser) {
        const { data: followingData } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", currentUser.orcid_id)
          .in("following_id", userOrcids);
        currentUserFollowing = new Set(
          followingData?.map((f) => f.following_id) || []
        );
      }

      results.users = users.map((user) => ({
        ...user,
        is_bot: botMap.has(user.orcid_id),
        bot: botMap.get(user.orcid_id) || null,
        followers_count: followersCountMap.get(user.orcid_id) || 0,
        is_followed: currentUserFollowing.has(user.orcid_id),
      }));
    }
  }

  // Search papers
  if (type === "all" || type === "papers") {
    // Search by title, authors, or abstract
    const { data: papers } = await supabase
      .from("paper_mentions")
      .select(`
        *,
        post:posts!paper_mentions_post_id_fkey(
          id,
          author_orcid,
          created_at,
          author:users!posts_author_orcid_fkey(name, orcid_id)
        )
      `)
      .or(`title.ilike.%${query}%,abstract.ilike.%${query}%`)
      .order("fetched_at", { ascending: false })
      .limit(30);

    // Also search by author name in the authors array
    const { data: papersByAuthor } = await supabase
      .from("paper_mentions")
      .select(`
        *,
        post:posts!paper_mentions_post_id_fkey(
          id,
          author_orcid,
          created_at,
          author:users!posts_author_orcid_fkey(name, orcid_id)
        )
      `)
      .contains("authors", [query])
      .order("fetched_at", { ascending: false })
      .limit(20);

    // Combine and deduplicate
    const paperMap = new Map<string, unknown>();
    [...(papers || []), ...(papersByAuthor || [])].forEach((paper) => {
      if (!paperMap.has(paper.id)) {
        paperMap.set(paper.id, paper);
      }
    });

    results.papers = Array.from(paperMap.values()).slice(0, 30);
  }

  return NextResponse.json(results);
}
