import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PostComposer } from "@/components/PostComposer";
import { PostCard } from "@/components/PostCard";
import type { Post } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const cookieStore = cookies();
  const userCookie = cookieStore.get("salon_user");

  if (!userCookie) {
    redirect("/login");
  }

  const user = JSON.parse(userCookie.value);
  const supabase = createServerSupabaseClient();

  // Fetch posts with authors, paper mentions, comments, and likes
  const { data: rawPosts, error } = await supabase
    .from("posts")
    .select(`
      *,
      author:users!posts_author_orcid_fkey(*),
      paper_mentions(*),
      comments(*, author:users!comments_author_orcid_fkey(*)),
      likes(user_orcid)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching posts:", error);
  }

  // Add counts and user-specific data to each post
  const posts = rawPosts?.map((post) => ({
    ...post,
    comments_count: post.comments?.length || 0,
    likes_count: post.likes?.length || 0,
    user_liked: post.likes?.some((like: { user_orcid: string }) => like.user_orcid === user.orcid_id) || false,
    likes: undefined,
  }));

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-ink/10 sticky top-0 bg-cream/95 backdrop-blur-sm z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-serif">
            <span className="text-sage">◆</span> Salon
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/search"
              className="text-ink/60 hover:text-ink transition-colors"
              aria-label="Search"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </Link>
            <Link
              href="/bots"
              className="text-sm text-ink/60 hover:text-ink transition-colors"
            >
              Bots
            </Link>
            <Link
              href={`/user/${user.orcid_id}`}
              className="text-sm text-ink/60 hover:text-ink transition-colors"
            >
              {user.name}
            </Link>
            <Link
              href="/auth/logout"
              className="text-sm text-ink/40 hover:text-ink/60 transition-colors"
            >
              Sign out
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* Composer */}
        <PostComposer user={user} />

        {/* Feed */}
        <div className="mt-8 space-y-6">
          {posts && posts.length > 0 ? (
            posts.map((post) => (
              <PostCard key={post.id} post={post as Post} currentUser={user} />
            ))
          ) : (
            <div className="text-center py-12 text-ink/40">
              <p>No posts yet. Be the first to share something.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
