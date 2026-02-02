import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { TOPICS } from "@/lib/topics";

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
  const { topics } = await request.json();

  // Validate topics
  const validTopicIds = new Set(TOPICS.map((t) => t.id));
  const validTopics = (topics || []).filter((id: string) => validTopicIds.has(id));

  const supabase = createServiceRoleClient();

  try {
    // Delete existing interests
    await supabase
      .from("user_interests")
      .delete()
      .eq("user_orcid", user.orcid_id);

    // Insert new interests
    if (validTopics.length > 0) {
      const { error: insertError } = await supabase.from("user_interests").insert(
        validTopics.map((topicId: string) => ({
          user_orcid: user.orcid_id,
          topic_id: topicId,
        }))
      );

      if (insertError) {
        console.error("Error inserting interests:", insertError);
      }
    }

    // Note: onboarding_completed is now set in /api/onboarding/finalize

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error completing onboarding:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}
