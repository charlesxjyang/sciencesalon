import Link from "next/link";
import type { Comment } from "@/lib/types";

interface CommentCardProps {
  comment: Comment;
}

export function CommentCard({ comment }: CommentCardProps) {
  const timeAgo = getTimeAgo(new Date(comment.created_at));

  return (
    <div className="flex gap-2 py-2">
      <Link
        href={`/user/${comment.author_orcid}`}
        className="w-7 h-7 rounded-full bg-sage/15 flex items-center justify-center text-sage font-sans text-xs hover:bg-sage/25 transition-colors flex-shrink-0"
      >
        {comment.author?.name?.charAt(0) || "?"}
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <Link
            href={`/user/${comment.author_orcid}`}
            className="text-sm font-medium hover:text-sage transition-colors"
          >
            {comment.author?.name || "Unknown"}
          </Link>
          <span className="text-xs text-ink/40">{timeAgo}</span>
        </div>
        <p className="text-sm text-ink/80 whitespace-pre-wrap break-words">
          {comment.content}
        </p>
      </div>
    </div>
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
