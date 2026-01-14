import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { orcid: string } }
) {
  const cookieStore = cookies();
  const userCookie = cookieStore.get("salon_user");

  if (!userCookie) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const currentUser = JSON.parse(userCookie.value);
  const targetUserId = params.orcid;

  // Can't follow yourself
  if (currentUser.orcid_id === targetUserId) {
    return NextResponse.json(
      { message: "Cannot follow yourself" },
      { status: 400 }
    );
  }

  try {
    const supabase = createServiceRoleClient();

    // Check if already following
    const { data: existingFollow } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", currentUser.orcid_id)
      .eq("following_id", targetUserId)
      .single();

    if (existingFollow) {
      // Unfollow: delete the existing follow
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUser.orcid_id)
        .eq("following_id", targetUserId);
    } else {
      // Follow: insert new follow
      const { error: insertError } = await supabase.from("follows").insert({
        follower_id: currentUser.orcid_id,
        following_id: targetUserId,
      });

      if (insertError) {
        console.error("Error inserting follow:", insertError);
        return NextResponse.json(
          { message: "Failed to follow user" },
          { status: 500 }
        );
      }
    }

    // Get updated followers count
    const { count } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", targetUserId);

    return NextResponse.json({
      following: !existingFollow,
      followers_count: count || 0,
    });
  } catch (error) {
    console.error("Error in POST /api/users/[orcid]/follow:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
