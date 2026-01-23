import type { PaperMention } from "@/lib/types";

interface PaperCardProps {
  paper: PaperMention;
}

function formatPublishedDate(dateStr: string | null): string | null {
  if (!dateStr) return null;

  try {
    // Handle YYYY-MM-DD format
    const [year, month, day] = dateStr.split("-").map(Number);
    if (!year) return null;

    // If we only have year (month/day are 01/01 defaults), just show year
    if (month === 1 && day === 1) {
      return year.toString();
    }

    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function PaperCard({ paper }: PaperCardProps) {
  const authorList = paper.authors?.slice(0, 3).join(", ");
  const hasMoreAuthors = paper.authors?.length > 3;
  const publishedDate = formatPublishedDate(paper.published_date);

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
          <div className="flex flex-wrap items-center gap-x-2 text-sm text-ink/60 mb-1">
            {authorList && (
              <span>
                {authorList}
                {hasMoreAuthors && " et al."}
              </span>
            )}
            {authorList && publishedDate && <span>•</span>}
            {publishedDate && <span>{publishedDate}</span>}
          </div>
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
