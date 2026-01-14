import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const postId = params.id;
  const supabase = createServiceRoleClient();

  const { data: comments, error } = await supabase
    .from("comments")
    .select(`
      *,
      author:users!comments_author_orcid_fkey(*)
    `)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { message: "Failed to fetch comments" },
      { status: 500 }
    );
  }

  return NextResponse.json(comments);
}

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
    const { content } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json(
        { message: "Content is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Create the comment
    const { data: comment, error: commentError } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        author_orcid: user.orcid_id,
        content: content.trim(),
      })
      .select(`
        *,
        author:users!comments_author_orcid_fkey(*)
      `)
      .single();

    if (commentError) {
      console.error("Error creating comment:", commentError);
      return NextResponse.json(
        { message: "Failed to create comment" },
        { status: 500 }
      );
    }

    return NextResponse.json(comment);
  } catch (error) {
    console.error("Error in POST /api/posts/[id]/comments:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
