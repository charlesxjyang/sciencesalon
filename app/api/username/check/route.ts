import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Twitter-style username validation rules:
 * - 4-15 characters
 * - Only letters, numbers, and underscores
 * - Cannot be only numbers
 * - Cannot start with underscore
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username) {
    return { valid: false, error: "Username is required" };
  }

  if (username.length < 4) {
    return { valid: false, error: "Username must be at least 4 characters" };
  }

  if (username.length > 15) {
    return { valid: false, error: "Username must be 15 characters or less" };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, error: "Username can only contain letters, numbers, and underscores" };
  }

  if (username.startsWith("_")) {
    return { valid: false, error: "Username cannot start with an underscore" };
  }

  if (/^\d+$/.test(username)) {
    return { valid: false, error: "Username cannot be only numbers" };
  }

  // Reserved usernames
  const reserved = [
    "admin", "administrator", "root", "system", "moderator", "mod",
    "support", "help", "info", "contact", "about", "api", "feed", "feeds",
    "user", "users", "login", "logout", "signup", "signin", "register",
    "settings", "profile", "account", "search", "explore", "home",
    "salon", "science", "arxiv", "orcid", "bot", "bots"
  ];

  if (reserved.includes(username.toLowerCase())) {
    return { valid: false, error: "This username is reserved" };
  }

  return { valid: true };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username")?.trim().toLowerCase();

  if (!username) {
    return NextResponse.json({ available: false, error: "Username is required" });
  }

  // Validate format first
  const validation = validateUsername(username);
  if (!validation.valid) {
    return NextResponse.json({ available: false, error: validation.error });
  }

  // Check if username is taken
  const supabase = createServiceRoleClient();
  const { data: existingUser } = await supabase
    .from("users")
    .select("orcid_id")
    .eq("username", username)
    .single();

  if (existingUser) {
    return NextResponse.json({ available: false, error: "Username is already taken" });
  }

  return NextResponse.json({ available: true });
}
