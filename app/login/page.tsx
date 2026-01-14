import { redirect } from "next/navigation";
import { getOrcidAuthUrl } from "@/lib/orcid";

export default function LoginPage() {
  const orcidUrl = getOrcidAuthUrl();
  redirect(orcidUrl);
}
