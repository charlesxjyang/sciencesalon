"use client";

import { useState } from "react";
import Link from "next/link";
import type { Post, User } from "@/lib/types";
import { PaperCard } from "./PaperCard";
import { LinkPreviewCard } from "./LinkPreviewCard";
import { CommentSection } from "./CommentSection";

interface PostCardProps {
  post: Post;
  currentUser: User | null;
}

export function PostCard({ post, currentUser }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [userLiked, setUserLiked] = useState(post.user_liked || false);
  const [isLiking, setIsLiking] = useState(false);
  const timeAgo = getTimeAgo(new Date(post.created_at));
  const commentsCount = post.comments_count || post.comments?.length || 0;

  async function handleLike() {
    if (isLiking || !currentUser) return;

    setIsLiking(true);

    // Optimistic update
    const wasLiked = userLiked;
    setUserLiked(!wasLiked);
    setLikesCount((prev) => (wasLiked ? prev - 1 : prev + 1));

    try {
      const response = await fetch(`/api/posts/${post.id}/like`, {
        method: "POST",
      });

      if (!response.ok) {
        // Revert on error
        setUserLiked(wasLiked);
        setLikesCount((prev) => (wasLiked ? prev + 1 : prev - 1));
      } else {
        const data = await response.json();
        setLikesCount(data.likes_count);
        setUserLiked(data.user_liked);
      }
    } catch {
      // Revert on error
      setUserLiked(wasLiked);
      setLikesCount((prev) => (wasLiked ? prev + 1 : prev - 1));
    } finally {
      setIsLiking(false);
    }
  }

  return (
    <article className="paper-card">
      <div className="flex gap-3">
        <Link
          href={`/user/${post.author_orcid}`}
          className="w-10 h-10 rounded-full bg-sage/20 flex items-center justify-center text-sage font-sans text-sm hover:bg-sage/30 transition-colors flex-shrink-0"
        >
          {post.author?.name?.charAt(0) || "?"}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <Link
              href={`/user/${post.author_orcid}`}
              className="font-medium hover:text-sage transition-colors"
            >
              {post.author?.name || "Unknown"}
            </Link>
            {post.author?.is_bot && (
              <span className="px-1.5 py-0.5 text-xs bg-sage/10 text-sage rounded">
                Bot
              </span>
            )}
            <span className="text-sm text-ink/40">{timeAgo}</span>
          </div>
          <div className="whitespace-pre-wrap break-words">{post.content}</div>

          {/* Paper mentions */}
          {post.paper_mentions && post.paper_mentions.length > 0 && (
            <div className="mt-4 space-y-3">
              {post.paper_mentions.map((paper) => (
                <PaperCard key={paper.id} paper={paper} />
              ))}
            </div>
          )}

          {/* Link previews */}
          {post.link_previews && post.link_previews.length > 0 && (
            <div className="mt-4 space-y-3">
              {post.link_previews.map((preview) => (
                <LinkPreviewCard key={preview.url} preview={preview} />
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-3 flex items-center gap-4">
            {/* Like button */}
            <button
              onClick={handleLike}
              disabled={isLiking || !currentUser}
              className={`flex items-center gap-1.5 text-sm transition-colors ${
                userLiked
                  ? "text-rose-500 hover:text-rose-600"
                  : "text-ink/40 hover:text-ink/60"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label={userLiked ? "Unlike post" : "Like post"}
            >
              {userLiked ? (
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              )}
              {likesCount > 0 && <span>{likesCount}</span>}
            </button>

            {/* Comment toggle button */}
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1.5 text-sm text-ink/40 hover:text-ink/60 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <span>
                {commentsCount > 0
                  ? `${commentsCount} comment${commentsCount !== 1 ? "s" : ""}`
                  : "Comment"}
              </span>
            </button>
          </div>

          {/* Comments section */}
          {showComments && (
            <CommentSection
              postId={post.id}
              initialComments={post.comments || []}
              currentUser={currentUser}
            />
          )}
        </div>
      </div>
    </article>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
