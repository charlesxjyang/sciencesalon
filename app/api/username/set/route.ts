import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { validateUsername } from "@/lib/username";

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
  const { username } = await request.json();

  const normalizedUsername = username?.trim().toLowerCase();

  // Validate format
  const validation = validateUsername(normalizedUsername);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // Check if username is taken by someone else
  const { data: existingUser } = await supabase
    .from("users")
    .select("orcid_id")
    .eq("username", normalizedUsername)
    .single();

  if (existingUser && existingUser.orcid_id !== user.orcid_id) {
    return NextResponse.json({ error: "Username is already taken" }, { status: 400 });
  }

  // Set the username
  const { error: updateError } = await supabase
    .from("users")
    .update({ username: normalizedUsername })
    .eq("orcid_id", user.orcid_id);

  if (updateError) {
    console.error("Error setting username:", updateError);
    return NextResponse.json({ error: "Failed to set username" }, { status: 500 });
  }

  // Update the cookie with the username
  const updatedUser = { ...user, username: normalizedUsername };
  cookieStore.set("salon_user", JSON.stringify(updatedUser), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  return NextResponse.json({ success: true, username: normalizedUsername });
}
