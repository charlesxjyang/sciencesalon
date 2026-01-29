import { NextResponse } from "next/server";
import { runAllFeeds } from "@/lib/feed-runner";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max for cron job

/**
 * GET handler for Vercel cron job
 * Runs all feeds to fetch and post papers from arXiv
 */
export async function GET() {
  try {
    console.log("Starting feed run...");
    const results = await runAllFeeds();

    const totalNewPosts = results.reduce((sum, r) => sum + r.newPosts, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    console.log(`Feed run complete: ${totalNewPosts} new posts, ${totalErrors} errors`);

    return NextResponse.json({
      success: true,
      summary: {
        feedsRun: results.length,
        totalNewPosts,
        totalErrors,
      },
      results,
    });
  } catch (error) {
    console.error("Feed run failed:", error);
    return NextResponse.json(
      { error: "Feed run failed", details: String(error) },
      { status: 500 }
    );
  }
}
