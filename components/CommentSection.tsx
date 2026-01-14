"use client";

import { useState } from "react";
import type { Comment, User } from "@/lib/types";
import { CommentCard } from "./CommentCard";

interface CommentSectionProps {
  postId: string;
  initialComments: Comment[];
  currentUser: User | null;
}

export function CommentSection({
  postId,
  initialComments,
  currentUser,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting || !currentUser) return;

    setIsSubmitting(true);

    // Optimistic update
    const optimisticComment: Comment = {
      id: `temp-${Date.now()}`,
      post_id: postId,
      author_orcid: currentUser.orcid_id,
      content: newComment.trim(),
      created_at: new Date().toISOString(),
      author: currentUser,
    };

    setComments((prev) => [...prev, optimisticComment]);
    setNewComment("");

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (!response.ok) {
        // Revert on error
        setComments((prev) => prev.filter((c) => c.id !== optimisticComment.id));
        setNewComment(optimisticComment.content);
      } else {
        const savedComment = await response.json();
        // Replace optimistic comment with saved one
        setComments((prev) =>
          prev.map((c) => (c.id === optimisticComment.id ? savedComment : c))
        );
      }
    } catch {
      // Revert on error
      setComments((prev) => prev.filter((c) => c.id !== optimisticComment.id));
      setNewComment(optimisticComment.content);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-4 pt-3 border-t border-ink/10">
      {/* Comments list */}
      {comments.length > 0 && (
        <div className="space-y-1 mb-3">
          {comments.map((comment) => (
            <CommentCard key={comment.id} comment={comment} />
          ))}
        </div>
      )}

      {/* Comment form */}
      {currentUser ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="w-7 h-7 rounded-full bg-sage/15 flex items-center justify-center text-sage font-sans text-xs flex-shrink-0">
            {currentUser.name.charAt(0)}
          </div>
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 text-sm px-3 py-1.5 rounded-full border border-ink/10 bg-cream focus:outline-none focus:border-sage/50 transition-colors"
              disabled={isSubmitting}
            />
            <button
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              className="text-sm px-3 py-1.5 rounded-full bg-sage text-cream hover:bg-sage/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Post
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-ink/40 text-center py-2">
          Sign in to comment
        </p>
      )}
    </div>
  );
}
