import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { extractPaperLinks, fetchPaperMetadata } from "@/lib/papers";

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
    const { arxivIds, dois } = extractPaperLinks(content);
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

    const papers = (await Promise.all(paperPromises)).filter(Boolean);

    // Insert paper mentions
    if (papers.length > 0) {
      const { error: papersError } = await supabase.from("paper_mentions").insert(
        papers.map((paper) => ({
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
  const supabase = createServiceRoleClient();

  const { data: posts, error } = await supabase
    .from("posts")
    .select(`
      *,
      author:users!posts_author_orcid_fkey(*),
      paper_mentions(*)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { message: "Failed to fetch posts" },
      { status: 500 }
    );
  }

  return NextResponse.json(posts);
}
