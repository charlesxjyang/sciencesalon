import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { FollowButton } from "@/components/FollowButton";

export const dynamic = "force-dynamic";

interface FollowersPageProps {
  params: { orcid: string };
}

export default async function FollowersPage({ params }: FollowersPageProps) {
  const supabase = createServerSupabaseClient();

  // Fetch user to verify they exist
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("orcid_id", params.orcid)
    .single();

  if (userError || !user) {
    notFound();
  }

  // Get current user
  const cookieStore = cookies();
  const userCookie = cookieStore.get("salon_user");
  const currentUser = userCookie ? JSON.parse(userCookie.value) : null;

  // Fetch followers with user details
  const { data: followers } = await supabase
    .from("follows")
    .select(`
      follower:users!follows_follower_id_fkey(*)
    `)
    .eq("following_id", params.orcid)
    .order("created_at", { ascending: false });

  // Check which followers the current user follows
  let currentUserFollowing: Set<string> = new Set();
  if (currentUser) {
    const { data: followingData } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", currentUser.orcid_id);
    currentUserFollowing = new Set(followingData?.map((f) => f.following_id) || []);
  }

  // Get followers counts for each follower
  const followerIds = followers?.map((f) => {
    const follower = f.follower as unknown as { orcid_id: string } | null;
    return follower?.orcid_id;
  }).filter(Boolean) as string[] || [];

  const { data: followerCounts } = followerIds.length > 0
    ? await supabase
        .from("follows")
        .select("following_id")
        .in("following_id", followerIds)
    : { data: [] };

  const followersCountMap = new Map<string, number>();
  followerCounts?.forEach((f) => {
    followersCountMap.set(f.following_id, (followersCountMap.get(f.following_id) || 0) + 1);
  });

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

      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* Back link and title */}
        <div className="mb-6">
          <Link
            href={`/user/${params.orcid}`}
            className="text-sm text-ink/40 hover:text-ink/60 transition-colors"
          >
            &larr; Back to {user.name}
          </Link>
          <h1 className="text-2xl font-serif mt-2">Followers</h1>
        </div>

        {/* Followers list */}
        <div className="space-y-4">
          {followers && followers.length > 0 ? (
            followers.map((follow) => {
              const follower = follow.follower as unknown as {
                orcid_id: string;
                name: string;
                bio: string | null;
              } | null;
              if (!follower) return null;

              const isCurrentUser = currentUser?.orcid_id === follower.orcid_id;
              const isFollowed = currentUserFollowing.has(follower.orcid_id);
              const followerCount = followersCountMap.get(follower.orcid_id) || 0;

              return (
                <div key={follower.orcid_id} className="paper-card">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/user/${follower.orcid_id}`}
                      className="w-10 h-10 rounded-full bg-sage/20 flex items-center justify-center text-sage font-sans text-sm hover:bg-sage/30 transition-colors flex-shrink-0"
                    >
                      {follower.name.charAt(0)}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/user/${follower.orcid_id}`}
                        className="font-medium hover:text-sage transition-colors"
                      >
                        {follower.name}
                      </Link>
                      {follower.bio && (
                        <p className="text-sm text-ink/60 truncate">{follower.bio}</p>
                      )}
                    </div>
                    {currentUser && !isCurrentUser && (
                      <FollowButton
                        userId={follower.orcid_id}
                        initialIsFollowing={isFollowed}
                        initialFollowersCount={followerCount}
                      />
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center py-12 text-ink/40">No followers yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}
