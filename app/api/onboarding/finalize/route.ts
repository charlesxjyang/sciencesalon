import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const onboardingCookie = cookieStore.get("salon_onboarding");

  if (!onboardingCookie) {
    return NextResponse.json({ error: "No onboarding session" }, { status: 401 });
  }

  let userData;
  try {
    userData = JSON.parse(onboardingCookie.value);
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  // Mark onboarding as complete
  const { error: updateError } = await supabase
    .from("users")
    .update({ onboarding_completed: true })
    .eq("orcid_id", userData.orcid_id);

  if (updateError) {
    console.error("Error completing onboarding:", updateError);
    return NextResponse.json({ error: "Failed to complete onboarding" }, { status: 500 });
  }

  // Get updated user data (with username)
  const { data: user } = await supabase
    .from("users")
    .select("orcid_id, name, username, google_scholar_id")
    .eq("orcid_id", userData.orcid_id)
    .single();

  const cookieOptions = {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
    ...(process.env.NODE_ENV === "production" && { domain: "salon.science" }),
  };

  // Set the real user cookie with updated data
  cookieStore.set("salon_user", JSON.stringify({
    ...userData,
    username: user?.username,
  }), cookieOptions);

  // Delete the onboarding cookie
  cookieStore.delete("salon_onboarding");

  return NextResponse.json({ success: true });
}
