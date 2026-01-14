import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { FollowButton } from "@/components/FollowButton";

export const dynamic = "force-dynamic";

interface FollowingPageProps {
  params: { orcid: string };
}

export default async function FollowingPage({ params }: FollowingPageProps) {
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

  // Fetch users this person is following
  const { data: following } = await supabase
    .from("follows")
    .select(`
      following:users!follows_following_id_fkey(*)
    `)
    .eq("follower_id", params.orcid)
    .order("created_at", { ascending: false });

  // Check which of these users the current user follows
  let currentUserFollowing: Set<string> = new Set();
  if (currentUser) {
    const { data: followingData } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", currentUser.orcid_id);
    currentUserFollowing = new Set(followingData?.map((f) => f.following_id) || []);
  }

  // Get followers counts for each user
  const followingIds = following?.map((f) => {
    const followedUser = f.following as unknown as { orcid_id: string } | null;
    return followedUser?.orcid_id;
  }).filter(Boolean) as string[] || [];

  const { data: followerCounts } = followingIds.length > 0
    ? await supabase
        .from("follows")
        .select("following_id")
        .in("following_id", followingIds)
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
          <h1 className="text-2xl font-serif mt-2">Following</h1>
        </div>

        {/* Following list */}
        <div className="space-y-4">
          {following && following.length > 0 ? (
            following.map((follow) => {
              const followedUser = follow.following as unknown as {
                orcid_id: string;
                name: string;
                bio: string | null;
              } | null;
              if (!followedUser) return null;

              const isCurrentUser = currentUser?.orcid_id === followedUser.orcid_id;
              const isFollowed = currentUserFollowing.has(followedUser.orcid_id);
              const followerCount = followersCountMap.get(followedUser.orcid_id) || 0;

              return (
                <div key={followedUser.orcid_id} className="paper-card">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/user/${followedUser.orcid_id}`}
                      className="w-10 h-10 rounded-full bg-sage/20 flex items-center justify-center text-sage font-sans text-sm hover:bg-sage/30 transition-colors flex-shrink-0"
                    >
                      {followedUser.name.charAt(0)}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/user/${followedUser.orcid_id}`}
                        className="font-medium hover:text-sage transition-colors"
                      >
                        {followedUser.name}
                      </Link>
                      {followedUser.bio && (
                        <p className="text-sm text-ink/60 truncate">{followedUser.bio}</p>
                      )}
                    </div>
                    {currentUser && !isCurrentUser && (
                      <FollowButton
                        userId={followedUser.orcid_id}
                        initialIsFollowing={isFollowed}
                        initialFollowersCount={followerCount}
                      />
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center py-12 text-ink/40">Not following anyone yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}
