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
      const parsed = parsePaperQuery(query);
      const paperMap = new Map<string, unknown>();

      const paperSelect = `
        *,
        post:posts!paper_mentions_post_id_fkey(
          id,
          author_orcid,
          created_at,
          author:users!posts_author_orcid_fkey(name, orcid_id)
        )
      `;

      if (parsed.type === "doi") {
        // Search by DOI - check doi column, identifier, or url
        const { data: papersByDoi, error: doiError } = await supabase
          .from("paper_mentions")
          .select(paperSelect)
          .or(`doi.eq.${parsed.value},identifier.eq.${parsed.value},url.eq.https://doi.org/${parsed.value}`)
          .order("fetched_at", { ascending: false })
          .limit(30);

        if (doiError) {
          console.error("Error searching papers by DOI:", doiError);
        }
        papersByDoi?.forEach((p) => paperMap.set(p.id, p));

        // Also search by source_url if we have the original URL
        if (parsed.normalizedUrl) {
          const { data: papersBySourceUrl } = await supabase
            .from("paper_mentions")
            .select(paperSelect)
            .or(`url.eq.${parsed.normalizedUrl},source_url.eq.${parsed.normalizedUrl}`)
            .limit(30);
          papersBySourceUrl?.forEach((p) => paperMap.set(p.id, p));
        }
      } else if (parsed.type === "arxiv") {
        // Search by arXiv ID - check arxiv_id column, identifier, or url
        const { data: papersByArxiv, error: arxivError } = await supabase
          .from("paper_mentions")
          .select(paperSelect)
          .or(`arxiv_id.eq.${parsed.value},identifier.eq.${parsed.value},url.eq.https://arxiv.org/abs/${parsed.value}`)
          .order("fetched_at", { ascending: false })
          .limit(30);

        if (arxivError) {
          console.error("Error searching papers by arXiv:", arxivError);
        }
        papersByArxiv?.forEach((p) => paperMap.set(p.id, p));

        // Also search by source_url if we have the original URL
        if (parsed.normalizedUrl) {
          const { data: papersBySourceUrl } = await supabase
            .from("paper_mentions")
            .select(paperSelect)
            .or(`url.eq.${parsed.normalizedUrl},source_url.eq.${parsed.normalizedUrl}`)
            .limit(30);
          papersBySourceUrl?.forEach((p) => paperMap.set(p.id, p));
        }
      } else if (parsed.type === "url") {
        // Search by URL directly (journal links, etc.)
        // Normalize URL by removing trailing slashes and query params for matching
        const normalizedUrl = parsed.value.split("?")[0].replace(/\/+$/, "");

        const { data: papersByUrl, error: urlError } = await supabase
          .from("paper_mentions")
          .select(paperSelect)
          .or(`url.eq.${parsed.value},source_url.eq.${parsed.value},url.eq.${normalizedUrl},source_url.eq.${normalizedUrl}`)
          .order("fetched_at", { ascending: false })
          .limit(30);

        if (urlError) {
          console.error("Error searching papers by URL:", urlError);
        }
        papersByUrl?.forEach((p) => paperMap.set(p.id, p));
      } else {
        // Regular text search by title, authors, or abstract
        const { data: papers, error: papersError } = await supabase
          .from("paper_mentions")
          .select(paperSelect)
          .or(`title.ilike.%${query}%,abstract.ilike.%${query}%`)
          .order("fetched_at", { ascending: false })
          .limit(30);

        if (papersError) {
          console.error("Error searching papers:", papersError);
        }
        papers?.forEach((p) => paperMap.set(p.id, p));

        // Also search by author name in the authors array
        const { data: papersByAuthor, error: authorError } = await supabase
          .from("paper_mentions")
          .select(paperSelect)
          .contains("authors", [query])
          .order("fetched_at", { ascending: false })
          .limit(20);

        if (authorError) {
          console.error("Error searching papers by author:", authorError);
        }
        papersByAuthor?.forEach((p) => paperMap.set(p.id, p));
      }

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
