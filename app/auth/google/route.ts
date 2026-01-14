import { NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/google";

export async function GET() {
  const googleUrl = getGoogleAuthUrl();
  return NextResponse.redirect(googleUrl);
}
