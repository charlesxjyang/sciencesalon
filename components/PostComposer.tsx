"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PostComposerProps {
  user: {
    orcid_id: string;
    name: string;
  };
}

export function PostComposer({ user }: PostComposerProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (response.ok) {
        setContent("");
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.message || "Failed to create post");
      }
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="paper-card">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-sage/20 flex items-center justify-center text-sage font-sans text-sm">
          {user.name.charAt(0)}
        </div>
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share a thought, a paper, an idea..."
            className="w-full bg-transparent resize-none outline-none placeholder:text-ink/30 min-h-[80px]"
            rows={3}
          />
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-ink/10">
            <p className="text-xs text-ink/40">
              arXiv and DOI links will be automatically expanded
            </p>
            <button
              type="submit"
              disabled={!content.trim() || isSubmitting}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
