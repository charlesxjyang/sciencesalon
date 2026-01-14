"use client";

import { useState } from "react";

interface FollowButtonProps {
  userId: string;
  initialIsFollowing: boolean;
  initialFollowersCount: number;
  onFollowersCountChange?: (count: number) => void;
}

export function FollowButton({
  userId,
  initialIsFollowing,
  initialFollowersCount,
  onFollowersCountChange,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  async function handleClick() {
    if (isLoading) return;

    setIsLoading(true);

    // Optimistic update
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    const newCount = wasFollowing ? followersCount - 1 : followersCount + 1;
    setFollowersCount(newCount);
    onFollowersCountChange?.(newCount);

    try {
      const response = await fetch(`/api/users/${userId}/follow`, {
        method: "POST",
      });

      if (!response.ok) {
        // Revert on error
        setIsFollowing(wasFollowing);
        setFollowersCount(followersCount);
        onFollowersCountChange?.(followersCount);
      } else {
        const data = await response.json();
        setIsFollowing(data.following);
        setFollowersCount(data.followers_count);
        onFollowersCountChange?.(data.followers_count);
      }
    } catch {
      // Revert on error
      setIsFollowing(wasFollowing);
      setFollowersCount(followersCount);
      onFollowersCountChange?.(followersCount);
    } finally {
      setIsLoading(false);
    }
  }

  if (isFollowing) {
    return (
      <button
        onClick={handleClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        disabled={isLoading}
        className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
          isHovering
            ? "bg-red-50 text-red-600 border border-red-200"
            : "bg-sage text-cream border border-sage"
        } disabled:opacity-50`}
      >
        {isHovering ? "Unfollow" : "Following"}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="px-4 py-1.5 text-sm font-medium rounded-full border border-sage text-sage hover:bg-sage hover:text-cream transition-colors disabled:opacity-50"
    >
      Follow
    </button>
  );
}
