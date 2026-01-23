import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { extractDoiFromUrl, ARXIV_PATTERN, DOI_PATTERN } from "@/lib/papers";

export const dynamic = "force-dynamic";

// Helper to detect if query is a paper link/identifier
function parsePaperQuery(query: string): {
  type: "doi" | "arxiv" | "url" | "text";
  value: string;
  normalizedUrl?: string;
} {
  const trimmed = query.trim();

  // Check if it's a URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    // Try to extract arXiv ID from URL
    const arxivMatch = trimmed.match(/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5}(?:v\d+)?)/i);
    if (arxivMatch) {
      return { type: "arxiv", value: arxivMatch[1], normalizedUrl: trimmed };
    }

    // Try to extract DOI from URL
    const doiFromUrl = extractDoiFromUrl(trimmed);
    if (doiFromUrl) {
      return { type: "doi", value: doiFromUrl, normalizedUrl: trimmed };
    }

    // It's a URL but we couldn't extract DOI/arXiv - search by URL directly
    return { type: "url", value: trimmed };
  }

  // Check for raw DOI (10.xxxx/...)
  const doiMatch = trimmed.match(/^(10\.\d{4,}\/[^\s]+)$/i);
  if (doiMatch) {
    return { type: "doi", value: doiMatch[1] };
  }

  // Check for doi: prefix
  const doiPrefixMatch = trimmed.match(/^doi:\s*(10\.\d{4,}\/[^\s]+)$/i);
  if (doiPrefixMatch) {
    return { type: "doi", value: doiPrefixMatch[1] };
  }

  // Check for raw arXiv ID (YYYY.NNNNN)
  const arxivMatch = trimmed.match(/^(\d{4}\.\d{4,5}(?:v\d+)?)$/i);
  if (arxivMatch) {
    return { type: "arxiv", value: arxivMatch[1] };
  }

  // Check for arxiv: prefix
  const arxivPrefixMatch = trimmed.match(/^arxiv:\s*(\d{4}\.\d{4,5}(?:v\d+)?)$/i);
  if (arxivPrefixMatch) {
    return { type: "arxiv", value: arxivPrefixMatch[1] };
  }

  // Regular text search
  return { type: "text", value: trimmed };
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get("q")?.trim();
  const type = searchParams.get("type") || "posts"; // posts, users, papers

  if (!query || query.length < 2) {
    return NextResponse.json({
      posts: [],
      users: [],
      papers: [],
      error: "Query must be at least 2 characters",
    });
  }

  const supabase = createServiceRoleClient();

  // Get current user for follow status and likes
  const cookieStore = cookies();
  const userCookie = cookieStore.get("salon_user");
  const currentUser = userCookie ? JSON.parse(userCookie.value) : null;

  const results: {
    posts: unknown[];
    users: unknown[];
    papers: unknown[];
  } = {
    posts: [],
    users: [],
    papers: [],
  };

  try {
    // Helper to enrich posts with likes data
    async function enrichPostsWithLikes(posts: any[]) {
      if (!posts.length) return posts;

      const postIds = posts.map((p) => p.id);

      // Get likes counts
      const { data: likesData } = await supabase
        .from("likes")
        .select("post_id")
        .in("post_id", postIds);

      const likesCountMap = new Map<string, number>();
      likesData?.forEach((l) => {
        likesCountMap.set(l.post_id, (likesCountMap.get(l.post_id) || 0) + 1);
      });

      // Get comments counts
      const { data: commentsData } = await supabase
        .from("comments")
        .select("post_id")
        .in("post_id", postIds);

      const commentsCountMap = new Map<string, number>();
      commentsData?.forEach((c) => {
        commentsCountMap.set(c.post_id, (commentsCountMap.get(c.post_id) || 0) + 1);
      });

      // Check which posts the current user liked
      let userLikedPosts = new Set<string>();
      if (currentUser) {
        const { data: userLikes } = await supabase
          .from("likes")
          .select("post_id")
          .eq("user_orcid", currentUser.orcid_id)
          .in("post_id", postIds);
        userLikedPosts = new Set(userLikes?.map((l) => l.post_id) || []);
      }

      return posts.map((post) => ({
        ...post,
        likes_count: likesCountMap.get(post.id) || 0,
        comments_count: commentsCountMap.get(post.id) || 0,
        user_liked: userLikedPosts.has(post.id),
      }));
    }

    // Search users
    if (type === "users") {
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

    // Search posts (by content text AND paper titles)
    if (type === "posts") {
      const postSelect = `
        *,
        author:users!posts_author_orcid_fkey(*),
        paper_mentions(*),
        link_previews
      `;

      const postIdsSet = new Set<string>();

      // Search by post content
      const { data: postsByContent, error: contentError } = await supabase
        .from("posts")
        .select("id")
        .ilike("content", `%${query}%`)
        .limit(30);

      if (contentError) {
        console.error("Error searching posts by content:", contentError);
      }
      postsByContent?.forEach((p) => postIdsSet.add(p.id));

      // Also search by paper title/abstract (to include ORCID imports with empty content)
      const { data: paperMatches } = await supabase
        .from("paper_mentions")
        .select("post_id")
        .or(`title.ilike.%${query}%,abstract.ilike.%${query}%`)
        .limit(30);
      paperMatches?.forEach((p) => postIdsSet.add(p.post_id));

      // Fetch full posts for matching IDs
      const postIds = Array.from(postIdsSet).slice(0, 30);
      if (postIds.length > 0) {
        const { data: posts, error: postsError } = await supabase
          .from("posts")
          .select(postSelect)
          .in("id", postIds)
          .order("created_at", { ascending: false });

        if (postsError) {
          console.error("Error searching posts:", postsError);
        }

        if (posts && posts.length > 0) {
          results.posts = await enrichPostsWithLikes(posts);
        }
      }
    }

    // Search papers (returns full posts that contain matching papers)
    if (type === "papers") {
      const parsed = parsePaperQuery(query);
      const postIdsSet = new Set<string>();

      // First, find matching paper mentions and collect their post IDs
      if (parsed.type === "doi") {
        const { data: papersByDoi } = await supabase
          .from("paper_mentions")
          .select("post_id")
          .or(`doi.eq.${parsed.value},identifier.eq.${parsed.value},url.eq.https://doi.org/${parsed.value}`)
          .limit(50);
        papersByDoi?.forEach((p) => postIdsSet.add(p.post_id));

        if (parsed.normalizedUrl) {
          const { data: papersBySourceUrl } = await supabase
            .from("paper_mentions")
            .select("post_id")
            .or(`url.eq.${parsed.normalizedUrl},source_url.eq.${parsed.normalizedUrl}`)
            .limit(50);
          papersBySourceUrl?.forEach((p) => postIdsSet.add(p.post_id));
        }
      } else if (parsed.type === "arxiv") {
        const { data: papersByArxiv } = await supabase
          .from("paper_mentions")
          .select("post_id")
          .or(`arxiv_id.eq.${parsed.value},identifier.eq.${parsed.value},url.eq.https://arxiv.org/abs/${parsed.value}`)
          .limit(50);
        papersByArxiv?.forEach((p) => postIdsSet.add(p.post_id));

        if (parsed.normalizedUrl) {
          const { data: papersBySourceUrl } = await supabase
            .from("paper_mentions")
            .select("post_id")
            .or(`url.eq.${parsed.normalizedUrl},source_url.eq.${parsed.normalizedUrl}`)
            .limit(50);
          papersBySourceUrl?.forEach((p) => postIdsSet.add(p.post_id));
        }
      } else if (parsed.type === "url") {
        const normalizedUrl = parsed.value.split("?")[0].replace(/\/+$/, "");
        const { data: papersByUrl } = await supabase
          .from("paper_mentions")
          .select("post_id")
          .or(`url.eq.${parsed.value},source_url.eq.${parsed.value},url.eq.${normalizedUrl},source_url.eq.${normalizedUrl}`)
          .limit(50);
        papersByUrl?.forEach((p) => postIdsSet.add(p.post_id));
      } else {
        // Text search by title, authors, or abstract
        const { data: papers } = await supabase
          .from("paper_mentions")
          .select("post_id")
          .or(`title.ilike.%${query}%,abstract.ilike.%${query}%`)
          .limit(50);
        papers?.forEach((p) => postIdsSet.add(p.post_id));

        const { data: papersByAuthor } = await supabase
          .from("paper_mentions")
          .select("post_id")
          .contains("authors", [query])
          .limit(30);
        papersByAuthor?.forEach((p) => postIdsSet.add(p.post_id));
      }

      // Now fetch full posts for the matching post IDs
      const postIds = Array.from(postIdsSet).slice(0, 30);
      if (postIds.length > 0) {
        const postSelect = `
          *,
          author:users!posts_author_orcid_fkey(*),
          paper_mentions(*),
          link_previews
        `;

        const { data: posts, error: postsError } = await supabase
          .from("posts")
          .select(postSelect)
          .in("id", postIds)
          .order("created_at", { ascending: false });

        if (postsError) {
          console.error("Error fetching posts for papers:", postsError);
        }

        if (posts && posts.length > 0) {
          results.papers = await enrichPostsWithLikes(posts);
        }
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { posts: [], users: [], papers: [], error: "Search failed" },
      { status: 500 }
    );
  }
}
