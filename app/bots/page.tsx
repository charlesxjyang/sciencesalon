import { cookies } from "next/headers";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { FollowButton } from "@/components/FollowButton";

export const dynamic = "force-dynamic";

// arXiv category descriptions
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "cs.AI": "Artificial Intelligence",
  "cs.LG": "Machine Learning",
  "cs.CL": "Computation and Language",
  "cs.CV": "Computer Vision",
  "cs.NE": "Neural and Evolutionary Computing",
  "cs.RO": "Robotics",
  "physics.optics": "Optics",
  "quant-ph": "Quantum Physics",
  "cond-mat": "Condensed Matter",
  "astro-ph": "Astrophysics",
  "hep-th": "High Energy Physics - Theory",
  "math.CO": "Combinatorics",
  "stat.ML": "Machine Learning (Statistics)",
  "q-bio": "Quantitative Biology",
  "econ": "Economics",
};

export default async function BotsPage() {
  const supabase = createServerSupabaseClient();

  // Get current user
  const cookieStore = cookies();
  const userCookie = cookieStore.get("salon_user");
  const currentUser = userCookie ? JSON.parse(userCookie.value) : null;

  // Fetch all bots with their user profiles
  const { data: bots } = await supabase
    .from("bots")
    .select(`
      *,
      user:users!bots_user_orcid_fkey(*)
    `)
    .order("created_at", { ascending: false });

  // Get follower counts for each bot
  const botOrcids = bots?.map((b) => b.user_orcid) || [];

  const { data: followerCounts } = botOrcids.length > 0
    ? await supabase
        .from("follows")
        .select("following_id")
        .in("following_id", botOrcids)
    : { data: [] };

  const followersCountMap = new Map<string, number>();
  followerCounts?.forEach((f) => {
    followersCountMap.set(f.following_id, (followersCountMap.get(f.following_id) || 0) + 1);
  });

  // Check which bots the current user follows
  let currentUserFollowing: Set<string> = new Set();
  if (currentUser) {
    const { data: followingData } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", currentUser.orcid_id);
    currentUserFollowing = new Set(followingData?.map((f) => f.following_id) || []);
  }

  // Get post counts for each bot
  const { data: postCounts } = botOrcids.length > 0
    ? await supabase
        .from("posts")
        .select("author_orcid")
        .in("author_orcid", botOrcids)
    : { data: [] };

  const postCountMap = new Map<string, number>();
  postCounts?.forEach((p) => {
    postCountMap.set(p.author_orcid, (postCountMap.get(p.author_orcid) || 0) + 1);
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
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-serif mb-2">arXiv Bots</h1>
          <p className="text-ink/60">
            Follow bots to see the latest papers from specific arXiv categories in your feed.
          </p>
        </div>

        {/* Bots grid */}
        <div className="space-y-4">
          {bots && bots.length > 0 ? (
            bots.map((bot) => {
              const botUser = bot.user as unknown as {
                orcid_id: string;
                name: string;
                bio: string | null;
              } | null;
              if (!botUser) return null;

              const isFollowed = currentUserFollowing.has(botUser.orcid_id);
              const followerCount = followersCountMap.get(botUser.orcid_id) || 0;
              const postCount = postCountMap.get(botUser.orcid_id) || 0;
              const categoryDescription = CATEGORY_DESCRIPTIONS[bot.category] || bot.category;

              return (
                <div key={bot.id} className="paper-card">
                  <div className="flex items-start gap-3">
                    <Link
                      href={`/user/${botUser.orcid_id}`}
                      className="w-12 h-12 rounded-full bg-sage/20 flex items-center justify-center text-sage flex-shrink-0"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          href={`/user/${botUser.orcid_id}`}
                          className="font-medium hover:text-sage transition-colors"
                        >
                          {botUser.name}
                        </Link>
                        <span className="px-1.5 py-0.5 text-xs bg-sage/10 text-sage rounded">
                          Bot
                        </span>
                      </div>
                      <p className="text-sm text-ink/60 mb-2">
                        {bot.description || `Posts new papers from arXiv ${categoryDescription}`}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-ink/40">
                        <span className="font-mono bg-ink/5 px-1.5 py-0.5 rounded">
                          {bot.category}
                        </span>
                        <span>{postCount} posts</span>
                        <span>{followerCount} followers</span>
                        {bot.last_fetched_at && (
                          <span>
                            Last updated: {new Date(bot.last_fetched_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {currentUser && (
                      <FollowButton
                        userId={botUser.orcid_id}
                        initialIsFollowing={isFollowed}
                        initialFollowersCount={followerCount}
                      />
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <p className="text-ink/40">No bots available yet.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
