import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCode, getGoogleProfile } from "@/lib/google";
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
    console.log("Starting Google token exchange...");
    const tokenData = await exchangeGoogleCode(code);
    console.log("Token data received");
    const { access_token } = tokenData;

    // Get user profile from Google
    console.log("Fetching Google profile...");
    const profile = await getGoogleProfile(access_token);
    console.log("Profile:", JSON.stringify(profile));

    if (!profile) {
      return NextResponse.redirect(
        new URL("/?error=profile_fetch_failed", request.url)
      );
    }

    // Upsert user in database (using google_id in orcid_id column for simplicity)
    const supabase = createServiceRoleClient();
    const { error: dbError } = await supabase.from("users").upsert(
      {
        orcid_id: `google_${profile.googleId}`,
        name: profile.name,
        bio: null,
      },
      { onConflict: "orcid_id" }
    );

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.redirect(
        new URL("/?error=database_error", request.url)
      );
    }

    // Create redirect response and set cookies on it
    console.log("Setting cookies for Google user:", profile.googleId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://salon.science";
    const response = NextResponse.redirect(new URL("/feed", appUrl));

    const cookieOptions = {
      httpOnly: false,
      secure: true,
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
      domain: "salon.science",
    };

    response.cookies.set(
      "salon_user",
      JSON.stringify({
        orcid_id: `google_${profile.googleId}`,
        name: profile.name,
        provider: "google",
        email: profile.email,
      }),
      cookieOptions
    );

    response.cookies.set("salon_token", access_token, cookieOptions);

    return response;
  } catch (error) {
    console.error("Google auth error:", error);
    return NextResponse.redirect(
      new URL("/?error=auth_failed", request.url)
    );
  }
}
