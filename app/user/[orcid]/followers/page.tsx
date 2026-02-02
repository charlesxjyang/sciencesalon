import { redirect, notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface FollowersPageProps {
  params: { orcid: string };
}

export default async function FollowersPage({ params }: FollowersPageProps) {
  const supabase = createServerSupabaseClient();

  // Fetch user by orcid_id
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("username")
    .eq("orcid_id", params.orcid)
    .single();

  if (userError || !user) {
    notFound();
  }

  // If user has a username, redirect to the username-based URL
  if (user.username) {
    redirect(`/${user.username}/followers`);
  }

  // If no username, show 404 (all users should have usernames now)
  notFound();
}
