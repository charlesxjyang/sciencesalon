import type { PaperMention } from "@/lib/types";

interface PaperCardProps {
  paper: PaperMention;
}

export function PaperCard({ paper }: PaperCardProps) {
  const authorList = paper.authors?.slice(0, 3).join(", ");
  const hasMoreAuthors = paper.authors?.length > 3;

  return (
    <a
      href={paper.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-sage/30 rounded-lg p-4 hover:border-sage/50 hover:bg-sage/5 transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded bg-sage/10 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-sans text-sage uppercase">
            {paper.identifier_type}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium leading-snug mb-1 line-clamp-2">
            {paper.title}
          </h4>
          {authorList && (
            <p className="text-sm text-ink/60 mb-2">
              {authorList}
              {hasMoreAuthors && " et al."}
            </p>
          )}
          {paper.abstract && (
            <p className="text-sm text-ink/50 line-clamp-2">
              {paper.abstract}
            </p>
          )}
        </div>
      </div>
    </a>
  );
}
