"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SyncPapersButtonProps {
  orcidId: string;
  hasScholarId?: boolean;
}

export function SyncPapersButton({ orcidId, hasScholarId }: SyncPapersButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const router = useRouter();

  const isGoogleUser = orcidId.startsWith("google_");
  const syncEndpoint = isGoogleUser && hasScholarId
    ? `/api/users/${orcidId}/sync-scholar`
    : `/api/users/${orcidId}/sync-papers`;
  const syncLabel = isGoogleUser ? "Sync from Google Scholar" : "Sync from ORCID";

  // Don't show sync button for Google users without Scholar ID
  if (isGoogleUser && !hasScholarId) {
    return null;
  }

  async function handleSync() {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch(syncEndpoint, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        if (data.synced > 0) {
          setSyncResult(`Synced ${data.synced} paper${data.synced !== 1 ? "s" : ""}`);
          router.refresh();
        } else if (data.message === "Recently synced") {
          setSyncResult("Already up to date");
        } else {
          setSyncResult("No new papers found");
        }
      } else {
        setSyncResult("Sync failed");
      }
    } catch (error) {
      console.error("Sync error:", error);
      setSyncResult("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {syncResult && (
        <span className="text-xs text-ink/60">{syncResult}</span>
      )}
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className="text-xs px-3 py-1 rounded-full border border-sage/30 text-sage hover:bg-sage/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
      >
        {isSyncing ? (
          <>
            <svg
              className="w-3 h-3 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Syncing...
          </>
        ) : (
          <>
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {syncLabel}
          </>
        )}
      </button>
    </div>
  );
}
