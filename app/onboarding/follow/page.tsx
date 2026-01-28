"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "@/lib/types";

interface SuggestedFollow {
  user: User;
  reason: "coauthor" | "interests" | "popular";
  shared_interests?: string[];
  coauthor_papers?: number;
}

export default function FollowOnboardingPage() {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<SuggestedFollow[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<{ orcid_id: string; name: string } | null>(null);

  useEffect(() => {
    const cookies = document.cookie.split(";");
    const userCookie = cookies.find((c) => c.trim().startsWith("salon_user="));

    if (!userCookie) {
      router.push("/login");
      return;
    }

    try {
      const value = decodeURIComponent(userCookie.split("=")[1]);
      const userData = JSON.parse(value);
      setUser(userData);
      fetchSuggestions();
    } catch {
      router.push("/login");
    }
  }, [router]);

  async function fetchSuggestions() {
    try {
      const response = await fetch("/api/onboarding/suggested-follows");
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleFollow(userId: string) {
    const newFollowing = new Set(following);
    if (newFollowing.has(userId)) {
      newFollowing.delete(userId);
    } else {
      newFollowing.add(userId);
    }
    setFollowing(newFollowing);
  }

  async function handleSubmit() {
    if (!user) return;
    setIsSaving(true);

    try {
      // Follow all selected users
      const followPromises = Array.from(following).map((userId) =>
        fetch(`/api/users/${userId}/follow`, { method: "POST" })
      );

      await Promise.all(followPromises);
      router.push("/feed");
    } catch (error) {
      console.error("Error following users:", error);
    } finally {
      setIsSaving(false);
    }
  }

  function handleSkip() {
    router.push("/feed");
  }

  function getReasonLabel(reason: SuggestedFollow["reason"]) {
    switch (reason) {
      case "coauthor":
        return "Co-author";
      case "interests":
        return "Similar interests";
      case "popular":
        return "Popular";
    }
  }

  function getReasonIcon(reason: SuggestedFollow["reason"]) {
    switch (reason) {
      case "coauthor":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        );
      case "interests":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      case "popular":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-ink/60 mb-2">Finding scientists for you to follow...</div>
          <div className="text-sm text-ink/40">Checking your co-authors and interests</div>
        </div>
      </div>
    );
  }

  // Group suggestions by reason
  const coauthors = suggestions.filter((s) => s.reason === "coauthor");
  const interestBased = suggestions.filter((s) => s.reason === "interests");
  const popular = suggestions.filter((s) => s.reason === "popular");

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-ink/10 sticky top-0 bg-paper/95 backdrop-blur-sm z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-serif">
            <span className="text-sage">&#9670;</span> Salon
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-full bg-sage/20 text-sage flex items-center justify-center text-sm font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="w-12 h-0.5 bg-sage" />
          <div className="w-8 h-8 rounded-full bg-sage text-white flex items-center justify-center text-sm font-medium">
            2
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif mb-3">Follow Scientists</h1>
          <p className="text-ink/60 max-w-xl mx-auto">
            {coauthors.length > 0
              ? "We found some of your collaborators on Salon! Follow them to see their posts in your feed."
              : "Follow scientists with similar research interests to build your personalized feed."}
          </p>
        </div>

        <div className="space-y-8 mb-8">
          {/* Co-authors section */}
          {coauthors.length > 0 && (
            <div>
              <h2 className="font-medium text-lg mb-4 flex items-center gap-2 text-ink/80">
                {getReasonIcon("coauthor")}
                <span>Your Co-authors</span>
                <span className="text-sm font-normal text-ink/40">on Salon</span>
              </h2>
              <div className="space-y-3">
                {coauthors.map(({ user: suggestedUser }) => (
                  <UserCard
                    key={suggestedUser.orcid_id}
                    user={suggestedUser}
                    isFollowing={following.has(suggestedUser.orcid_id)}
                    onToggle={() => toggleFollow(suggestedUser.orcid_id)}
                    badge="Co-author"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Interest-based section */}
          {interestBased.length > 0 && (
            <div>
              <h2 className="font-medium text-lg mb-4 flex items-center gap-2 text-ink/80">
                {getReasonIcon("interests")}
                <span>Similar Research Interests</span>
              </h2>
              <div className="space-y-3">
                {interestBased.map(({ user: suggestedUser, shared_interests }) => (
                  <UserCard
                    key={suggestedUser.orcid_id}
                    user={suggestedUser}
                    isFollowing={following.has(suggestedUser.orcid_id)}
                    onToggle={() => toggleFollow(suggestedUser.orcid_id)}
                    sharedInterests={shared_interests}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Popular users section */}
          {popular.length > 0 && (
            <div>
              <h2 className="font-medium text-lg mb-4 flex items-center gap-2 text-ink/80">
                {getReasonIcon("popular")}
                <span>Popular on Salon</span>
              </h2>
              <div className="space-y-3">
                {popular.map(({ user: suggestedUser }) => (
                  <UserCard
                    key={suggestedUser.orcid_id}
                    user={suggestedUser}
                    isFollowing={following.has(suggestedUser.orcid_id)}
                    onToggle={() => toggleFollow(suggestedUser.orcid_id)}
                  />
                ))}
              </div>
            </div>
          )}

          {suggestions.length === 0 && (
            <div className="text-center py-12 text-ink/40">
              <p>No suggestions available yet.</p>
              <p className="text-sm mt-2">You can discover scientists to follow from your feed.</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-paper/95 backdrop-blur-sm border-t border-ink/10 -mx-6 px-6 py-4">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div className="text-sm text-ink/60">
              {following.size > 0
                ? `Following ${following.size} scientist${following.size !== 1 ? "s" : ""}`
                : "Select scientists to follow"}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-sm text-ink/60 hover:text-ink transition-colors"
              >
                Skip for now
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className="px-6 py-2 bg-sage text-white rounded-lg hover:bg-sage/90 transition-colors disabled:opacity-50"
              >
                {isSaving ? "Saving..." : following.size > 0 ? "Continue" : "Continue to Feed"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

interface UserCardProps {
  user: User;
  isFollowing: boolean;
  onToggle: () => void;
  badge?: string;
  sharedInterests?: string[];
}

function UserCard({ user, isFollowing, onToggle, badge, sharedInterests }: UserCardProps) {
  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-ink/10 hover:border-sage/30 transition-colors">
      <Link
        href={`/user/${user.orcid_id}`}
        className="w-12 h-12 rounded-full bg-sage/20 flex items-center justify-center text-sage font-medium text-lg hover:bg-sage/30 transition-colors flex-shrink-0"
      >
        {user.name.charAt(0)}
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/user/${user.orcid_id}`}
            className="font-medium hover:text-sage transition-colors truncate"
          >
            {user.name}
          </Link>
          {badge && (
            <span className="text-xs px-2 py-0.5 bg-sage/10 text-sage rounded-full">
              {badge}
            </span>
          )}
        </div>
        {user.bio && (
          <p className="text-sm text-ink/60 truncate mt-0.5">{user.bio}</p>
        )}
        {sharedInterests && sharedInterests.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {sharedInterests.map((interest) => (
              <span
                key={interest}
                className="text-xs px-2 py-0.5 bg-sage/10 text-sage rounded"
              >
                {interest}
              </span>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={onToggle}
        className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors flex-shrink-0 ${
          isFollowing
            ? "bg-sage text-white"
            : "border border-sage text-sage hover:bg-sage hover:text-white"
        }`}
      >
        {isFollowing ? "Following" : "Follow"}
      </button>
    </div>
  );
}
