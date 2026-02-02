import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { extractScholarId } from "@/lib/google-scholar";

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const userCookie = cookieStore.get("salon_user");

  if (!userCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = JSON.parse(userCookie.value);
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

  return NextResponse.json({ success: true, scholarId });
}
