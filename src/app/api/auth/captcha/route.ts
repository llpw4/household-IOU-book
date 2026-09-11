import { NextResponse } from "next/server";
import {
  captchaImageEtag,
  createCaptchaToken,
  generateCaptchaCode,
  getCaptchaCookieOptions,
  CAPTCHA_COOKIE,
  renderCaptchaSvg,
} from "@/lib/auth/captcha";
import { resolveSessionCookieSecure } from "@/lib/auth/session";

export async function GET() {
  const code = generateCaptchaCode();
  const token = await createCaptchaToken(code);
  const svg = renderCaptchaSvg(code);
  const secure = await resolveSessionCookieSecure();

  const response = new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      ETag: `"${captchaImageEtag(code)}"`,
    },
  });

  response.cookies.set(CAPTCHA_COOKIE, token, getCaptchaCookieOptions(secure));
  return response;
}
