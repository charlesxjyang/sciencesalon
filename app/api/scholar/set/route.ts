import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { extractScholarId, getScholarWorks } from "@/lib/google-scholar";

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  // Check onboarding cookie first (during onboarding), then regular user cookie
  const onboardingCookie = cookieStore.get("salon_onboarding");
  const userCookie = cookieStore.get("salon_user");
  const authCookie = onboardingCookie || userCookie;

  if (!authCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = JSON.parse(authCookie.value);
  const { url } = await request.json();

  // Allow empty/null to skip
  if (!url) {
    return NextResponse.json({ success: true, scholarId: null });
  }

  const scholarId = extractScholarId(url);

  if (!scholarId) {
    return NextResponse.json({ error: "Could not extract Scholar ID from URL" }, { status: 400 });
  }

  // Validate Scholar ID format
  if (!/^[a-zA-Z0-9_-]{8,20}$/.test(scholarId)) {
    return NextResponse.json({ error: "Invalid Google Scholar ID format" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // Check if this Scholar ID is already linked to another user
  const { data: existingUser } = await supabase
    .from("users")
    .select("orcid_id")
    .eq("google_scholar_id", scholarId)
    .single();

  if (existingUser && existingUser.orcid_id !== user.orcid_id) {
    return NextResponse.json({ error: "This Google Scholar profile is already linked to another account" }, { status: 400 });
  }

  // Set the Google Scholar ID
  const { error: updateError } = await supabase
    .from("users")
    .update({ google_scholar_id: scholarId })
    .eq("orcid_id", user.orcid_id);

  if (updateError) {
    console.error("Error setting Google Scholar ID:", updateError);
    return NextResponse.json({ error: "Failed to set Google Scholar ID" }, { status: 500 });
  }

  // Sync papers immediately (one-time during onboarding)
  let syncedCount = 0;
  try {
    const works = await getScholarWorks(scholarId);

    for (const work of works) {
      const normalizedTitle = work.title.toLowerCase().trim();

      // Create post for this paper
      let createdAt: string;
      if (work.year) {
        createdAt = `${work.year}-01-01T12:00:00Z`;
      } else {
        createdAt = new Date().toISOString();
      }

      const { data: post, error: postError } = await supabase
        .from("posts")
        .insert({
          author_orcid: user.orcid_id,
          content: "",
          is_orcid_import: true,
          created_at: createdAt,
        })
        .select()
        .single();

      if (postError || !post) {
        console.error("Error creating post for Scholar paper:", postError);
        continue;
      }

      // Create paper mention
      const { error: mentionError } = await supabase
        .from("paper_mentions")
        .insert({
          post_id: post.id,
          identifier: normalizedTitle,
          identifier_type: "doi",
          title: work.title,
          authors: work.authors,
          published_date: work.year ? `${work.year}-01-01` : null,
          url: work.url || `https://scholar.google.com/scholar?q=${encodeURIComponent(work.title)}`,
        });

      if (mentionError) {
        console.error("Error creating paper mention:", mentionError);
        await supabase.from("posts").delete().eq("id", post.id);
        continue;
      }

      syncedCount++;
    }

    // Update sync timestamp
    await supabase
      .from("users")
      .update({ google_scholar_synced_at: new Date().toISOString() })
      .eq("orcid_id", user.orcid_id);

  } catch (error) {
    console.error("Error syncing Scholar papers:", error);
    // Don't fail the whole request if sync fails - Scholar ID is still set
  }

  return NextResponse.json({ success: true, scholarId, syncedPapers: syncedCount });
}
