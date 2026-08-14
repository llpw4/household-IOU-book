import { NextResponse } from "next/server";
import { withBasePath } from "@/lib/base-path";
import { clearSessionCookie } from "@/lib/auth/session";

export async function GET(request: Request) {
  await clearSessionCookie();
  return NextResponse.redirect(new URL(withBasePath("/login"), request.url));
}
