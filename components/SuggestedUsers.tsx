"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FollowButton } from "./FollowButton";

interface SuggestedUser {
  orcid_id: string;
  name: string;
  bio: string | null;
  match_score: number;
  shared_count: number;
  shared_interests: string[];
}

export function SuggestedUsers() {
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSuggestions() {
      try {
        const response = await fetch("/api/users/suggestions", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSuggestions();
  }, []);

  if (isLoading) {
    return (
      <div className="paper-card">
        <h3 className="font-sans text-sm uppercase tracking-wide text-ink/40 mb-4">
          Based on your research
        </h3>
        <div className="text-center py-4 text-ink/40 text-sm">Loading...</div>
      </div>
    );
  }

  if (users.length === 0) {
    return null; // Don't show section if no suggestions
  }

  return (
    <div className="paper-card">
      <h3 className="font-sans text-sm uppercase tracking-wide text-ink/40 mb-4">
        Based on your research
      </h3>
      <div className="space-y-4">
        {users.slice(0, 5).map((user) => (
          <div key={user.orcid_id} className="flex items-start gap-3">
            <Link
              href={`/user/${user.orcid_id}`}
              className="w-10 h-10 rounded-full bg-sage/20 flex items-center justify-center text-sage font-sans text-sm hover:bg-sage/30 transition-colors flex-shrink-0"
            >
              {user.name.charAt(0)}
            </Link>
            <div className="flex-1 min-w-0">
              <Link
                href={`/user/${user.orcid_id}`}
                className="font-medium hover:text-sage transition-colors text-sm"
              >
                {user.name}
              </Link>
              {user.shared_interests.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {user.shared_interests.slice(0, 3).map((interest) => (
                    <span
                      key={interest}
                      className="text-xs px-1.5 py-0.5 bg-sage/10 text-sage rounded"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <FollowButton
              userId={user.orcid_id}
              initialIsFollowing={false}
              initialFollowersCount={0}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
