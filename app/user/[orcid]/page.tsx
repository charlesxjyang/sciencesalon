import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PostCard } from "@/components/PostCard";
import type { Post } from "@/lib/types";

export const dynamic = "force-dynamic";

interface UserPageProps {
  params: { orcid: string };
}

export default async function UserPage({ params }: UserPageProps) {
  const supabase = createServerSupabaseClient();

  // Fetch user
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("orcid_id", params.orcid)
    .single();

  if (userError || !user) {
    notFound();
  }

  // Fetch user's posts
  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select(`
      *,
      author:users!posts_author_orcid_fkey(*),
      paper_mentions(*)
    `)
    .eq("author_orcid", params.orcid)
    .order("created_at", { ascending: false })
    .limit(50);

  // Get current user for header
  const cookieStore = cookies();
  const userCookie = cookieStore.get("salon_user");
  const currentUser = userCookie ? JSON.parse(userCookie.value) : null;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-ink/10 sticky top-0 bg-cream/95 backdrop-blur-sm z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/feed" className="text-xl font-serif">
            <span className="text-sage">◆</span> Salon
          </Link>
          {currentUser && (
            <div className="flex items-center gap-4">
              <Link
                href={`/user/${currentUser.orcid_id}`}
                className="text-sm text-ink/60 hover:text-ink transition-colors"
              >
                {currentUser.name}
              </Link>
              <Link
                href="/auth/logout"
                className="text-sm text-ink/40 hover:text-ink/60 transition-colors"
              >
                Sign out
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Profile */}
      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="paper-card mb-8">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-sage/20 flex items-center justify-center text-sage font-sans text-xl">
              {user.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-serif mb-1">{user.name}</h1>
              <a
                href={`https://orcid.org/${user.orcid_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-sage hover:text-sage/80 transition-colors"
              >
                ORCID: {user.orcid_id}
              </a>
              {user.bio && (
                <p className="mt-3 text-ink/70">{user.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* User's posts */}
        <h2 className="font-sans text-sm uppercase tracking-wide text-ink/40 mb-4">
          Posts
        </h2>
        <div className="space-y-6">
          {posts && posts.length > 0 ? (
            posts.map((post) => (
              <PostCard key={post.id} post={post as Post} />
            ))
          ) : (
            <p className="text-center py-12 text-ink/40">
              No posts yet.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
