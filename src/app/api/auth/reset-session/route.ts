import { NextRequest, NextResponse } from "next/server";
import { createAppRedirectUrl } from "@/lib/base-path";
import { clearSessionCookie } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  await clearSessionCookie();
  return NextResponse.redirect(createAppRedirectUrl(request, "/login"));
}
