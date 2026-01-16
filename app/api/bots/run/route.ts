import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { runBot, runAllBots } from "@/lib/bot-runner";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max

/**
 * POST handler for manual bot trigger
 * Can run a specific bot or all bots
 */
export async function POST(req: NextRequest) {
  // Check for admin authorization
  const authHeader = req.headers.get("authorization");
  const botSecret = process.env.BOT_SECRET_KEY;

  // Check Bearer token for API access
  if (authHeader === `Bearer ${botSecret}`) {
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
    const { botOrcid, category } = body as { botOrcid?: string; category?: string };

    let results;

    if (botOrcid && category) {
      // Run specific bot
      console.log(`Running bot ${botOrcid} for category ${category}`);
      const result = await runBot(botOrcid, category);
      results = [result];
    } else if (botOrcid) {
      // Run specific bot by orcid, fetch category from database
      const supabase = createServiceRoleClient();
      const { data: bot } = await supabase
        .from("users")
        .select("bot_category")
        .eq("orcid_id", botOrcid)
        .eq("is_bot", true)
        .single();

      if (!bot || !bot.bot_category) {
        return NextResponse.json(
          { error: "Bot not found" },
          { status: 404 }
        );
      }

      console.log(`Running bot ${botOrcid} for category ${bot.bot_category}`);
      const result = await runBot(botOrcid, bot.bot_category);
      results = [result];
    } else {
      // Run all bots
      console.log("Running all bots");
      results = await runAllBots();
    }

    const totalNewPosts = results.reduce((sum, r) => sum + r.newPosts, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

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
    console.error("Manual bot run failed:", error);
    return NextResponse.json(
      { error: "Bot run failed", details: String(error) },
      { status: 500 }
    );
  }
}
