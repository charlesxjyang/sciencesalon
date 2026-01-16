import { NextResponse } from "next/server";
import { runAllBots } from "@/lib/bot-runner";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max for cron job

/**
 * GET handler for Vercel cron job
 * Runs all bots to fetch and post papers from arXiv
 */
export async function GET() {
  try {
    console.log("Starting bot run...");
    const results = await runAllBots();

    const totalNewPosts = results.reduce((sum, r) => sum + r.newPosts, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    console.log(`Bot run complete: ${totalNewPosts} new posts, ${totalErrors} errors`);

    return NextResponse.json({
      success: true,
      summary: {
        botsRun: results.length,
        totalNewPosts,
        totalErrors,
      },
      results,
    });
  } catch (error) {
    console.error("Bot run failed:", error);
    return NextResponse.json(
      { error: "Bot run failed", details: String(error) },
      { status: 500 }
    );
  }
}
