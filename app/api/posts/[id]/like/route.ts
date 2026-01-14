import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies();
  const userCookie = cookieStore.get("salon_user");

  if (!userCookie) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const user = JSON.parse(userCookie.value);
  const postId = params.id;

  try {
    const supabase = createServiceRoleClient();

    // Check if user already liked this post
    const { data: existingLike } = await supabase
      .from("likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_orcid", user.orcid_id)
      .single();

    if (existingLike) {
      // Unlike: delete the existing like
      await supabase
        .from("likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_orcid", user.orcid_id);
    } else {
      // Like: insert new like
      const { error: insertError } = await supabase.from("likes").insert({
        post_id: postId,
        user_orcid: user.orcid_id,
      });

      if (insertError) {
        console.error("Error inserting like:", insertError);
        return NextResponse.json(
          { message: "Failed to like post" },
          { status: 500 }
        );
      }
    }

    // Get updated like count
    const { count } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    return NextResponse.json({
      likes_count: count || 0,
      user_liked: !existingLike,
    });
  } catch (error) {
    console.error("Error in POST /api/posts/[id]/like:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
