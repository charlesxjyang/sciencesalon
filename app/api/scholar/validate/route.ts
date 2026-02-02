import { NextRequest, NextResponse } from "next/server";
import { extractScholarId, validateScholarProfile } from "@/lib/google-scholar";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("url");

  if (!input) {
    return NextResponse.json({ valid: false, error: "URL is required" });
  }

  const scholarId = extractScholarId(input);

  if (!scholarId) {
    return NextResponse.json({ valid: false, error: "Could not extract Scholar ID from URL" });
  }

  const result = await validateScholarProfile(scholarId);

  if (result.valid) {
    return NextResponse.json({ valid: true, scholarId, name: result.name });
  } else {
    return NextResponse.json({ valid: false, error: "Google Scholar profile not found" });
  }
}
