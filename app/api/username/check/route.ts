import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { validateUsername } from "@/lib/username";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username")?.trim().toLowerCase();

  if (!username) {
    return NextResponse.json({ available: false, error: "Username is required" });
  }

  // Validate format first
  const validation = validateUsername(username);
  if (!validation.valid) {
    return NextResponse.json({ available: false, error: validation.error });
  }

  // Check if username is taken
  const supabase = createServiceRoleClient();
  const { data: existingUser } = await supabase
    .from("users")
    .select("orcid_id")
    .eq("username", username)
    .single();

  if (existingUser) {
    return NextResponse.json({ available: false, error: "Username is already taken" });
  }

  return NextResponse.json({ available: true });
}
