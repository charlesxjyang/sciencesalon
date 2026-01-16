import type { LinkPreview } from "@/lib/types";

interface LinkPreviewCardProps {
  preview: LinkPreview;
}

export function LinkPreviewCard({ preview }: LinkPreviewCardProps) {
  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-ink/10 rounded-lg overflow-hidden hover:border-ink/20 transition-colors"
    >
      {preview.image_url && (
        <div className="aspect-[2/1] bg-ink/5 overflow-hidden">
          <img
            src={preview.image_url}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              // Hide broken images
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}
      <div className="p-3">
        {preview.site_name && (
          <p className="text-xs text-ink/40 mb-1 uppercase tracking-wide">
            {preview.site_name}
          </p>
        )}
        {preview.title && (
          <h4 className="font-medium text-sm leading-snug line-clamp-2">
            {preview.title}
          </h4>
        )}
        {preview.description && (
          <p className="text-sm text-ink/60 mt-1 line-clamp-2">
            {preview.description}
          </p>
        )}
      </div>
    </a>
  );
}
