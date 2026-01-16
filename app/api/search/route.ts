import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";

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

  const supabase = createServiceRoleClient();

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

  try {
    // Search users
    if (type === "all" || type === "users") {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("*")
        .ilike("name", `%${query}%`)
        .limit(20);

      if (usersError) {
        console.error("Error searching users:", usersError);
      }

      if (users && users.length > 0) {
        const userOrcids = users.map((u) => u.orcid_id);

        // Get follower counts (gracefully handle if follows table doesn't exist)
        let followersCountMap = new Map<string, number>();
        try {
          const { data: followerCounts } = await supabase
            .from("follows")
            .select("following_id")
            .in("following_id", userOrcids);

          followerCounts?.forEach((f) => {
            followersCountMap.set(
              f.following_id,
              (followersCountMap.get(f.following_id) || 0) + 1
            );
          });
        } catch (e) {
          // follows table may not exist
        }

        // Check which users the current user follows
        let currentUserFollowing: Set<string> = new Set();
        if (currentUser) {
          try {
            const { data: followingData } = await supabase
              .from("follows")
              .select("following_id")
              .eq("follower_id", currentUser.orcid_id)
              .in("following_id", userOrcids);
            currentUserFollowing = new Set(
              followingData?.map((f) => f.following_id) || []
            );
          } catch (e) {
            // follows table may not exist
          }
        }

        results.users = users.map((user) => ({
          ...user,
          followers_count: followersCountMap.get(user.orcid_id) || 0,
          is_followed: currentUserFollowing.has(user.orcid_id),
        }));
      }
    }

    // Search papers
    if (type === "all" || type === "papers") {
      // Search by title, authors, or abstract
      const { data: papers, error: papersError } = await supabase
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

      if (papersError) {
        console.error("Error searching papers:", papersError);
      }

      // Also search by author name in the authors array
      const { data: papersByAuthor, error: authorError } = await supabase
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

      if (authorError) {
        console.error("Error searching papers by author:", authorError);
      }

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
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { users: [], papers: [], error: "Search failed" },
      { status: 500 }
    );
  }
}
