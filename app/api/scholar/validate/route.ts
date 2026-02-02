import { NextRequest, NextResponse } from "next/server";
import { extractScholarId } from "@/lib/google-scholar";

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

  // Validate Scholar ID format (alphanumeric, typically 12 chars)
  if (!/^[a-zA-Z0-9_-]{8,20}$/.test(scholarId)) {
    return NextResponse.json({ valid: false, error: "Invalid Google Scholar ID format" });
  }

  // Skip live validation - Google blocks requests from cloud servers
  // Just accept the ID if it has the right format
  return NextResponse.json({ valid: true, scholarId });
}
