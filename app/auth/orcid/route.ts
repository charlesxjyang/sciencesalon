import { NextResponse } from "next/server";
import { getOrcidAuthUrl } from "@/lib/orcid";

export async function GET() {
  const orcidUrl = getOrcidAuthUrl();
  return NextResponse.redirect(orcidUrl);
}
