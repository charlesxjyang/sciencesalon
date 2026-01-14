import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PostCard } from "@/components/PostCard";
import { FollowButton } from "@/components/FollowButton";
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

  // Check if user is a bot
  const { data: botData } = await supabase
    .from("bots")
    .select("*")
    .eq("user_orcid", params.orcid)
    .single();

  const isBot = !!botData;

  // Get current user for header
  const cookieStore = cookies();
  const userCookie = cookieStore.get("salon_user");
  const currentUser = userCookie ? JSON.parse(userCookie.value) : null;

  // Fetch followers count
  const { count: followersCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", params.orcid);

  // Fetch following count
  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", params.orcid);

  // Check if current user follows this profile
  let isFollowed = false;
  if (currentUser && currentUser.orcid_id !== params.orcid) {
    const { data: followData } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", currentUser.orcid_id)
      .eq("following_id", params.orcid)
      .single();
    isFollowed = !!followData;
  }

  // Fetch user's posts with comments and likes
  const { data: rawPosts, error: postsError } = await supabase
    .from("posts")
    .select(`
      *,
      author:users!posts_author_orcid_fkey(*),
      paper_mentions(*),
      comments(*, author:users!comments_author_orcid_fkey(*)),
      likes(user_orcid)
    `)
    .eq("author_orcid", params.orcid)
    .order("created_at", { ascending: false })
    .limit(50);

  // Add counts and user-specific data to each post
  const posts = rawPosts?.map((post) => ({
    ...post,
    author: post.author ? { ...post.author, is_bot: isBot } : null,
    comments_count: post.comments?.length || 0,
    likes_count: post.likes?.length || 0,
    user_liked: currentUser
      ? post.likes?.some((like: { user_orcid: string }) => like.user_orcid === currentUser.orcid_id)
      : false,
    likes: undefined,
  }));

  const isOwnProfile = currentUser?.orcid_id === params.orcid;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-ink/10 sticky top-0 bg-cream/95 backdrop-blur-sm z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/feed" className="text-xl font-serif">
            <span className="text-sage">&#9670;</span> Salon
          </Link>
          {currentUser && (
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
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-serif">{user.name}</h1>
                    {isBot && (
                      <span className="px-2 py-0.5 text-xs bg-sage/10 text-sage rounded font-sans">
                        Bot
                      </span>
                    )}
                  </div>
                  {isBot && botData ? (
                    <div className="text-sm text-ink/60">
                      <span className="font-mono bg-ink/5 px-1.5 py-0.5 rounded">
                        {botData.category}
                      </span>
                      {botData.last_fetched_at && (
                        <span className="ml-2">
                          Last updated: {new Date(botData.last_fetched_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ) : !user.orcid_id.startsWith("google_") ? (
                    <a
                      href={`https://orcid.org/${user.orcid_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-sage hover:text-sage/80 transition-colors"
                    >
                      ORCID: {user.orcid_id}
                    </a>
                  ) : (
                    <span className="text-sm text-ink/40">Google user</span>
                  )}
                </div>
                {currentUser && !isOwnProfile && (
                  <FollowButton
                    userId={params.orcid}
                    initialIsFollowing={isFollowed}
                    initialFollowersCount={followersCount || 0}
                  />
                )}
              </div>

              {/* Follower/Following counts */}
              <div className="flex gap-4 mt-3 text-sm">
                <Link
                  href={`/user/${params.orcid}/followers`}
                  className="hover:text-sage transition-colors"
                >
                  <span className="font-medium">{followersCount || 0}</span>{" "}
                  <span className="text-ink/60">followers</span>
                </Link>
                <Link
                  href={`/user/${params.orcid}/following`}
                  className="hover:text-sage transition-colors"
                >
                  <span className="font-medium">{followingCount || 0}</span>{" "}
                  <span className="text-ink/60">following</span>
                </Link>
              </div>

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
              <PostCard key={post.id} post={post as Post} currentUser={currentUser} />
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
