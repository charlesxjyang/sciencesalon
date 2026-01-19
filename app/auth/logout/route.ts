import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Create redirect response
  const response = NextResponse.redirect(new URL("/", request.url));

  // Delete cookies - must use same domain as when they were set
  response.cookies.set("salon_user", "", { path: "/", domain: "salon.science", maxAge: 0 });
  response.cookies.set("salon_token", "", { path: "/", domain: "salon.science", maxAge: 0 });

  return response;
}
