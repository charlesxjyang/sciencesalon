import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { extractPaperLinks, fetchPaperMetadata, resolveUrlToPaper, fetchLinkPreview } from "@/lib/papers";

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const userCookie = cookieStore.get("salon_user");

  if (!userCookie) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const user = JSON.parse(userCookie.value);

  try {
    const { content } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json(
        { message: "Content is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Create the post
    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert({
        author_orcid: user.orcid_id,
        content: content.trim(),
      })
      .select()
      .single();

    if (postError) {
      console.error("Error creating post:", postError);
      return NextResponse.json(
        { message: "Failed to create post" },
        { status: 500 }
      );
    }

    // Extract and fetch paper metadata
    const { arxivIds, dois, urls } = extractPaperLinks(content);
    const paperPromises: Promise<any>[] = [];

    for (const arxivId of arxivIds) {
      paperPromises.push(
        fetchPaperMetadata(arxivId, "arxiv").then((metadata) =>
          metadata ? { ...metadata, postId: post.id } : null
        )
      );
    }

    for (const doi of dois) {
      paperPromises.push(
        fetchPaperMetadata(doi, "doi").then((metadata) =>
          metadata ? { ...metadata, postId: post.id } : null
        )
      );
    }

    // Process generic URLs - try as papers first, then as link previews
    const urlResults: { url: string; paper: any | null }[] = [];

    for (const url of urls) {
      paperPromises.push(
        resolveUrlToPaper(url)
          .then((metadata) => {
            urlResults.push({ url, paper: metadata ? { ...metadata, postId: post.id } : null });
            return metadata ? { ...metadata, postId: post.id } : null;
          })
          .catch((error) => {
            console.error(`Error resolving URL ${url}:`, error);
            urlResults.push({ url, paper: null });
            return null;
          })
      );
    }

    // Use allSettled to ensure slow URLs don't block post creation
    const results = await Promise.allSettled(paperPromises);
    const papers = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter(Boolean);

    // Deduplicate by identifier (in case URL resolved to same DOI as explicit DOI)
    const seenIdentifiers = new Set<string>();
    const uniquePapers = papers.filter((paper) => {
      if (seenIdentifiers.has(paper.identifier)) {
        return false;
      }
      seenIdentifiers.add(paper.identifier);
      return true;
    });

    // Insert paper mentions
    if (uniquePapers.length > 0) {
      const { error: papersError } = await supabase.from("paper_mentions").insert(
        uniquePapers.map((paper) => ({
          post_id: paper.postId,
          identifier: paper.identifier,
          identifier_type: paper.identifierType,
          title: paper.title,
          authors: paper.authors,
          abstract: paper.abstract,
          published_date: paper.publishedDate,
          url: paper.url,
        }))
      );

      if (papersError) {
        console.error("Error inserting paper mentions:", papersError);
        // Don't fail the whole request, just log it
      }
    }

    // Get URLs that didn't resolve to papers and fetch link previews
    const nonPaperUrls = urlResults
      .filter((r) => r.paper === null)
      .map((r) => r.url);

    if (nonPaperUrls.length > 0) {
      const linkPreviewPromises = nonPaperUrls.map((url) =>
        fetchLinkPreview(url).catch(() => null)
      );

      const linkPreviewResults = await Promise.allSettled(linkPreviewPromises);
      const linkPreviews = linkPreviewResults
        .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
        .map((r) => r.value)
        .filter(Boolean)
        .map((preview) => ({
          url: preview.url,
          title: preview.title,
          description: preview.description,
          image_url: preview.imageUrl,
          site_name: preview.siteName,
        }));

      if (linkPreviews.length > 0) {
        const { error: updateError } = await supabase
          .from("posts")
          .update({ link_previews: linkPreviews })
          .eq("id", post.id);

        if (updateError) {
          console.error("Error updating link previews:", updateError);
        }
      }
    }

    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error("Error in POST /api/posts:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const cookieStore = cookies();
  const userCookie = cookieStore.get("salon_user");
  const currentUserOrcid = userCookie ? JSON.parse(userCookie.value).orcid_id : null;

  const supabase = createServiceRoleClient();

  const { data: rawPosts, error } = await supabase
    .from("posts")
    .select(`
      *,
      author:users!posts_author_orcid_fkey(*),
      paper_mentions(*),
      comments(*, author:users!comments_author_orcid_fkey(*)),
      likes(user_orcid)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { message: "Failed to fetch posts" },
      { status: 500 }
    );
  }

  // Add counts and user-specific data to each post
  const posts = rawPosts?.map((post) => ({
    ...post,
    comments_count: post.comments?.length || 0,
    likes_count: post.likes?.length || 0,
    user_liked: currentUserOrcid
      ? post.likes?.some((like: { user_orcid: string }) => like.user_orcid === currentUserOrcid)
      : false,
    likes: undefined,
  }));

  return NextResponse.json(posts);
}
