import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = cookies();
  
  cookieStore.delete("salon_user");
  cookieStore.delete("salon_token");

  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL));
}
