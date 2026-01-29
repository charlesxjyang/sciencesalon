import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { runFeed, runAllFeeds } from "@/lib/feed-runner";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max

/**
 * POST handler for manual feed trigger
 * Can run a specific feed or all feeds
 */
export async function POST(req: NextRequest) {
  // Check for admin authorization
  const authHeader = req.headers.get("authorization");
  const feedSecret = process.env.FEED_SECRET_KEY || process.env.BOT_SECRET_KEY;

  // Check Bearer token for API access
  if (authHeader === `Bearer ${feedSecret}`) {
    // Authorized via API key
  } else {
    // Check for logged-in admin user
    const cookieStore = cookies();
    const userCookie = cookieStore.get("salon_user");

    if (!userCookie) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = JSON.parse(userCookie.value);

    // Check if user is an admin (you may want to add an admin check here)
    // For now, we'll allow any authenticated user to trigger manually
    // In production, add proper admin role check
    if (!user.orcid_id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { feedOrcid, category } = body as { feedOrcid?: string; category?: string };

    let results;

    if (feedOrcid && category) {
      // Run specific feed
      console.log(`Running feed ${feedOrcid} for category ${category}`);
      const result = await runFeed(feedOrcid, category);
      results = [result];
    } else if (feedOrcid) {
      // Run specific feed by orcid, fetch category from database
      const supabase = createServiceRoleClient();
      const { data: feed } = await supabase
        .from("users")
        .select("feed_category")
        .eq("orcid_id", feedOrcid)
        .eq("is_feed", true)
        .single();

      if (!feed || !feed.feed_category) {
        return NextResponse.json(
          { error: "Feed not found" },
          { status: 404 }
        );
      }

      console.log(`Running feed ${feedOrcid} for category ${feed.feed_category}`);
      const result = await runFeed(feedOrcid, feed.feed_category);
      results = [result];
    } else {
      // Run all feeds
      console.log("Running all feeds");
      results = await runAllFeeds();
    }

    const totalNewPosts = results.reduce((sum, r) => sum + r.newPosts, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

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
    console.error("Manual feed run failed:", error);
    return NextResponse.json(
      { error: "Feed run failed", details: String(error) },
      { status: 500 }
    );
  }
}
