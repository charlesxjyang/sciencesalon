import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getScholarWorks } from "@/lib/google-scholar";

export async function POST(
  request: NextRequest,
  { params }: { params: { orcid: string } }
) {
  const orcidId = params.orcid;
  console.log("Syncing Google Scholar papers for user:", orcidId);

  // Only sync for Google users with Scholar ID
  if (!orcidId.startsWith("google_")) {
    return NextResponse.json({ synced: 0, message: "Not a Google user" });
  }

  const supabase = createServiceRoleClient();

  // Get user with Google Scholar ID
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("orcid_id, google_scholar_id, google_scholar_synced_at")
    .eq("orcid_id", orcidId)
    .single();

  if (userError || !user) {
    console.error("User not found:", orcidId);
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!user.google_scholar_id) {
    return NextResponse.json({ synced: 0, message: "No Google Scholar ID linked" });
  }

  // Only sync if not synced in the last hour
  const lastSynced = user.google_scholar_synced_at
    ? new Date(user.google_scholar_synced_at)
    : null;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  if (lastSynced && lastSynced > oneHourAgo) {
    return NextResponse.json({ synced: 0, message: "Recently synced" });
  }

  try {
    // Fetch works from Google Scholar
    const works = await getScholarWorks(user.google_scholar_id);

    // Get existing paper titles for this user to avoid duplicates
    // (Google Scholar doesn't have DOIs, so we use title matching)
    const { data: existingPapers } = await supabase
      .from("paper_mentions")
      .select("title, post_id, posts!inner(author_orcid, is_orcid_import)")
      .not("title", "is", null);

    const existingTitles = new Set(
      existingPapers
        ?.filter(
          (p) =>
            (p.posts as any)?.author_orcid === orcidId &&
            (p.posts as any)?.is_orcid_import === true
        )
        .map((p) => p.title?.toLowerCase().trim()) || []
    );

    let syncedCount = 0;

    for (const work of works) {
      // Skip if title already imported (fuzzy match)
      const normalizedTitle = work.title.toLowerCase().trim();
      if (existingTitles.has(normalizedTitle)) continue;

      // Create post for this paper
      let createdAt: string;
      if (work.year) {
        // Use January 1st of the publication year at noon UTC
        createdAt = `${work.year}-01-01T12:00:00Z`;
      } else {
        createdAt = new Date().toISOString();
      }

      const { data: post, error: postError } = await supabase
        .from("posts")
        .insert({
          author_orcid: orcidId,
          content: "",
          is_orcid_import: true, // Reusing this flag for Scholar imports too
          created_at: createdAt,
        })
        .select()
        .single();

      if (postError || !post) {
        console.error("Error creating post for Scholar paper:", postError);
        continue;
      }

      // Create paper mention
      // Google Scholar doesn't provide DOIs, so we use title as identifier
      const { error: mentionError } = await supabase
        .from("paper_mentions")
        .insert({
          post_id: post.id,
          identifier: normalizedTitle,
          identifier_type: "doi", // Using 'doi' type but with title as identifier
          title: work.title,
          authors: work.authors,
          published_date: work.year ? `${work.year}-01-01` : null,
          url: work.url || `https://scholar.google.com/scholar?q=${encodeURIComponent(work.title)}`,
        });

      if (mentionError) {
        console.error("Error creating paper mention:", mentionError);
        // Delete the orphaned post
        await supabase.from("posts").delete().eq("id", post.id);
        continue;
      }

      syncedCount++;
      existingTitles.add(normalizedTitle); // Prevent duplicates within this sync
    }

    // Update user's last synced timestamp
    await supabase
      .from("users")
      .update({ google_scholar_synced_at: new Date().toISOString() })
      .eq("orcid_id", orcidId);

    return NextResponse.json({ synced: syncedCount });
  } catch (error) {
    console.error("Error syncing Google Scholar papers:", error);
    return NextResponse.json(
      { error: "Failed to sync papers" },
      { status: 500 }
    );
  }
}
