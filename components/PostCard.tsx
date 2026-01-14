import Link from "next/link";
import type { Post } from "@/lib/types";
import { PaperCard } from "./PaperCard";

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const timeAgo = getTimeAgo(new Date(post.created_at));

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
