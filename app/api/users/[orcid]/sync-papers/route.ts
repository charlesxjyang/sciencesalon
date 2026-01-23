import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getOrcidWorks } from "@/lib/orcid";

export async function POST(
  request: NextRequest,
  { params }: { params: { orcid: string } }
) {
  const orcidId = params.orcid;
  console.log("Syncing papers for ORCID:", orcidId);

  // Don't sync for Google users or bots
  if (orcidId.startsWith("google_") || orcidId.startsWith("bot_")) {
    return NextResponse.json({ synced: 0 });
  }

  const supabase = createServiceRoleClient();

  // Check if user exists (don't select orcid_papers_synced_at in case column doesn't exist yet)
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("orcid_id, orcid_papers_synced_at")
    .eq("orcid_id", orcidId)
    .single();

  if (userError) {
    console.error("Error fetching user:", userError);
    // If column doesn't exist, try without it
    const { data: userBasic, error: basicError } = await supabase
      .from("users")
      .select("orcid_id")
      .eq("orcid_id", orcidId)
      .single();

    if (basicError || !userBasic) {
      console.error("User not found:", orcidId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
  }

  if (!user && !userError) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Only sync if not synced in the last hour
  const lastSynced = user?.orcid_papers_synced_at
    ? new Date(user.orcid_papers_synced_at)
    : null;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  if (lastSynced && lastSynced > oneHourAgo) {
    return NextResponse.json({ synced: 0, message: "Recently synced" });
  }

  try {
    // Fetch works from ORCID
    const works = await getOrcidWorks(orcidId);

    // Get existing DOIs for this user to avoid duplicates
    const { data: existingPapers } = await supabase
      .from("paper_mentions")
      .select("doi, post_id, posts!inner(author_orcid, is_orcid_import)")
      .not("doi", "is", null);

    const existingDois = new Set(
      existingPapers
        ?.filter(
          (p) =>
            (p.posts as any)?.author_orcid === orcidId &&
            (p.posts as any)?.is_orcid_import === true
        )
        .map((p) => p.doi?.toLowerCase()) || []
    );

    let syncedCount = 0;

    for (const work of works) {
      // Skip works without DOI
      if (!work.doi) continue;

      // Skip if already imported
      if (existingDois.has(work.doi.toLowerCase())) continue;

      // Create post for this paper
      const { data: post, error: postError } = await supabase
        .from("posts")
        .insert({
          author_orcid: orcidId,
          content: "",
          is_orcid_import: true,
          created_at: work.publicationYear
            ? new Date(`${work.publicationYear}-01-01`).toISOString()
            : new Date().toISOString(),
        })
        .select()
        .single();

      if (postError || !post) {
        console.error("Error creating post for ORCID paper:", postError);
        continue;
      }

      // Create paper mention
      const { error: mentionError } = await supabase
        .from("paper_mentions")
        .insert({
          post_id: post.id,
          identifier: work.doi,
          identifier_type: "doi",
          doi: work.doi,
          title: work.title,
          authors: [], // ORCID works endpoint doesn't include authors in summary
          published_date: work.publicationYear?.toString() || null,
          url: work.url || `https://doi.org/${work.doi}`,
        });

      if (mentionError) {
        console.error("Error creating paper mention:", mentionError);
        // Delete the orphaned post
        await supabase.from("posts").delete().eq("id", post.id);
        continue;
      }

      syncedCount++;
    }

    // Update user's last synced timestamp
    await supabase
      .from("users")
      .update({ orcid_papers_synced_at: new Date().toISOString() })
      .eq("orcid_id", orcidId);

    return NextResponse.json({ synced: syncedCount });
  } catch (error) {
    console.error("Error syncing ORCID papers:", error);
    return NextResponse.json(
      { error: "Failed to sync papers" },
      { status: 500 }
    );
  }
}
