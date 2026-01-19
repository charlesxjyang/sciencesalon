import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Create redirect response
  const response = NextResponse.redirect(new URL("/", request.url));
  
  // Delete cookies on the response
  response.cookies.delete("salon_user");
  response.cookies.delete("salon_token");

  return response;
}
