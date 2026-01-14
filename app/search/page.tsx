"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { FollowButton } from "@/components/FollowButton";
import { PaperCard } from "@/components/PaperCard";
import type { User, PaperMention } from "@/lib/types";

interface SearchUser extends User {
  is_bot?: boolean;
  followers_count?: number;
  is_followed?: boolean;
}

interface SearchPaper extends PaperMention {
  post?: {
    id: string;
    author_orcid: string;
    created_at: string;
    author?: { name: string; orcid_id: string };
  };
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";
  const initialTab = searchParams.get("tab") || "all";

  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<"all" | "users" | "papers">(
    initialTab as "all" | "users" | "papers"
  );
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [papers, setPapers] = useState<SearchPaper[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Get current user from cookie
  useEffect(() => {
    const cookies = document.cookie.split(";");
    const userCookie = cookies.find((c) => c.trim().startsWith("salon_user="));
    if (userCookie) {
      try {
        const value = decodeURIComponent(userCookie.split("=")[1]);
        setCurrentUser(JSON.parse(value));
      } catch {
        // Invalid cookie
      }
    }
  }, []);

  const performSearch = useCallback(async (searchQuery: string, type: string) => {
    if (searchQuery.length < 2) {
      setUsers([]);
      setPapers([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&type=${type}`
      );
      const data = await response.json();
      setUsers(data.users || []);
      setPapers(data.papers || []);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search when query or tab changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.length >= 2) {
        performSearch(query, activeTab);
        // Update URL
        const params = new URLSearchParams();
        params.set("q", query);
        if (activeTab !== "all") params.set("tab", activeTab);
        router.replace(`/search?${params.toString()}`, { scroll: false });
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, activeTab, performSearch, router]);

  // Initial search on mount
  useEffect(() => {
    if (initialQuery.length >= 2) {
      performSearch(initialQuery, initialTab);
    }
  }, [initialQuery, initialTab, performSearch]);

  const handleTabChange = (tab: "all" | "users" | "papers") => {
    setActiveTab(tab);
  };

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
                href="/bots"
                className="text-sm text-ink/60 hover:text-ink transition-colors"
              >
                Bots
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
        {/* Search input */}
        <div className="mb-6">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/40"
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
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users, bots, or papers..."
              className="w-full pl-10 pr-4 py-3 border border-ink/10 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sage/20 focus:border-sage transition-colors"
              autoFocus
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-ink/10">
          {(["all", "users", "papers"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                activeTab === tab
                  ? "text-sage"
                  : "text-ink/60 hover:text-ink"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sage" />
              )}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-8 text-ink/40">
            Searching...
          </div>
        )}

        {/* Results */}
        {!isLoading && query.length >= 2 && (
          <div className="space-y-8">
            {/* Users section */}
            {(activeTab === "all" || activeTab === "users") && users.length > 0 && (
              <section>
                {activeTab === "all" && (
                  <h2 className="font-sans text-sm uppercase tracking-wide text-ink/40 mb-4">
                    Users ({users.length})
                  </h2>
                )}
                <div className="space-y-3">
                  {users.map((user) => (
                    <div key={user.orcid_id} className="paper-card">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/user/${user.orcid_id}`}
                          className="w-10 h-10 rounded-full bg-sage/20 flex items-center justify-center text-sage font-sans text-sm hover:bg-sage/30 transition-colors flex-shrink-0"
                        >
                          {user.is_bot ? (
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
                                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                              />
                            </svg>
                          ) : (
                            user.name.charAt(0)
                          )}
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/user/${user.orcid_id}`}
                              className="font-medium hover:text-sage transition-colors"
                            >
                              {user.name}
                            </Link>
                            {user.is_bot && (
                              <span className="px-1.5 py-0.5 text-xs bg-sage/10 text-sage rounded">
                                Bot
                              </span>
                            )}
                          </div>
                          {user.is_bot && user.bot ? (
                            <p className="text-sm text-ink/60">
                              arXiv{" "}
                              <span className="font-mono bg-ink/5 px-1 rounded">
                                {user.bot.category}
                              </span>
                            </p>
                          ) : user.bio ? (
                            <p className="text-sm text-ink/60 truncate">
                              {user.bio}
                            </p>
                          ) : null}
                        </div>
                        {currentUser && currentUser.orcid_id !== user.orcid_id && (
                          <FollowButton
                            userId={user.orcid_id}
                            initialIsFollowing={user.is_followed || false}
                            initialFollowersCount={user.followers_count || 0}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Papers section */}
            {(activeTab === "all" || activeTab === "papers") && papers.length > 0 && (
              <section>
                {activeTab === "all" && (
                  <h2 className="font-sans text-sm uppercase tracking-wide text-ink/40 mb-4">
                    Papers ({papers.length})
                  </h2>
                )}
                <div className="space-y-4">
                  {papers.map((paper) => (
                    <div key={paper.id} className="paper-card">
                      <PaperCard paper={paper} />
                      {paper.post?.author && (
                        <div className="mt-3 pt-3 border-t border-ink/10 text-sm text-ink/60">
                          Posted by{" "}
                          <Link
                            href={`/user/${paper.post.author.orcid_id}`}
                            className="hover:text-sage transition-colors"
                          >
                            {paper.post.author.name}
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* No results */}
            {users.length === 0 && papers.length === 0 && (
              <div className="text-center py-12 text-ink/40">
                <p>No results found for &ldquo;{query}&rdquo;</p>
                <p className="text-sm mt-2">Try a different search term</p>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && query.length < 2 && (
          <div className="text-center py-12 text-ink/40">
            <svg
              className="w-12 h-12 mx-auto mb-4 text-ink/20"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p>Search for users, bots, or papers</p>
            <p className="text-sm mt-2">Enter at least 2 characters to search</p>
          </div>
        )}
      </main>
    </div>
  );
}

function SearchFallback() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-ink/10 sticky top-0 bg-cream/95 backdrop-blur-sm z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/feed" className="text-xl font-serif">
            <span className="text-sage">&#9670;</span> Salon
          </Link>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="text-center py-8 text-ink/40">Loading...</div>
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchContent />
    </Suspense>
  );
}
