import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, getOrcidProfile } from "@/lib/orcid";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", request.url));
  }

  try {
    // Exchange code for token
    console.log("Starting token exchange...");
    const tokenData = await exchangeCodeForToken(code);
    console.log("Token data received:", JSON.stringify(tokenData));
    const { access_token, orcid } = tokenData;

    // Get user profile from ORCID
    console.log("Fetching profile for:", orcid);
    const profile = await getOrcidProfile(orcid, access_token);
    console.log("Profile:", JSON.stringify(profile));

    if (!profile) {
      return NextResponse.redirect(
        new URL("/?error=profile_fetch_failed", request.url)
      );
    }

    // Check if user already exists
    const supabase = createServiceRoleClient();
    const { data: existingUser } = await supabase
      .from("users")
      .select("orcid_id, username, onboarding_completed")
      .eq("orcid_id", profile.orcidId)
      .single();

    const isNewUser = !existingUser;

    // Upsert user in database
    const { error: dbError } = await supabase.from("users").upsert(
      {
        orcid_id: profile.orcidId,
        name: profile.name,
        bio: profile.biography,
      },
      { onConflict: "orcid_id" }
    );

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.redirect(
        new URL("/?error=database_error", request.url)
      );
    }

    // Determine redirect destination
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://salon.science";
    let redirectPath = "/feed";

    if (isNewUser || !existingUser?.username) {
      // New user or user without username - start at username selection
      redirectPath = "/onboarding/username";
    } else if (!existingUser?.onboarding_completed) {
      // Has username but hasn't completed full onboarding
      redirectPath = "/onboarding";
    }

    // Create redirect response and set cookies on it
    console.log("Setting cookies for user:", profile.orcidId, "redirecting to:", redirectPath);
    const response = NextResponse.redirect(new URL(redirectPath, appUrl));
    
    const cookieOptions = {
      httpOnly: false,
      secure: true,
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
      domain: "salon.science",
    };

    const userData = {
      orcid_id: profile.orcidId,
      name: profile.name,
      provider: "orcid",
    };

    if (redirectPath === "/feed") {
      // User already completed onboarding, set the real cookie
      response.cookies.set("salon_user", JSON.stringify(userData), cookieOptions);
    } else {
      // User needs onboarding, set temporary cookie
      response.cookies.set("salon_onboarding", JSON.stringify(userData), cookieOptions);
    }

    response.cookies.set("salon_token", access_token, cookieOptions);

    return response;
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.redirect(
      new URL("/?error=auth_failed", request.url)
    );
  }
}