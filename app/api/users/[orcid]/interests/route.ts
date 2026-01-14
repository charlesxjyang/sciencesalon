import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { syncUserInterests } from "@/lib/sync-interests";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for interest sync

interface RouteParams {
  params: { orcid: string };
}

/**
 * POST: Trigger interest sync for a user
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const cookieStore = cookies();
  const userCookie = cookieStore.get("salon_user");

  if (!userCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUser = JSON.parse(userCookie.value);

  // Only allow users to sync their own interests
  if (currentUser.orcid_id !== params.orcid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const count = await syncUserInterests(params.orcid);
    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("Error syncing interests:", error);
    return NextResponse.json(
      { error: "Failed to sync interests" },
      { status: 500 }
    );
  }
}

/**
 * GET: Fetch interests for a user
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const supabase = createServerSupabaseClient();

  const { data: interests, error } = await supabase
    .from("user_interests")
    .select("*")
    .eq("user_orcid", params.orcid)
    .order("weight", { ascending: false });

  if (error) {
    console.error("Error fetching interests:", error);
    return NextResponse.json(
      { error: "Failed to fetch interests" },
      { status: 500 }
    );
  }

  return NextResponse.json(interests || []);
}
