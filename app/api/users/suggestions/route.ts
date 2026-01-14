import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSuggestedUsers } from "@/lib/suggestions";

export const dynamic = "force-dynamic";

/**
 * GET: Get suggested users based on shared interests
 */
export async function GET() {
  const cookieStore = cookies();
  const userCookie = cookieStore.get("salon_user");

  if (!userCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUser = JSON.parse(userCookie.value);

  try {
    const suggestions = await getSuggestedUsers(currentUser.orcid_id, 10);
    return NextResponse.json(suggestions);
  } catch (error) {
    console.error("Error getting suggestions:", error);
    return NextResponse.json(
      { error: "Failed to get suggestions" },
      { status: 500 }
    );
  }
}
