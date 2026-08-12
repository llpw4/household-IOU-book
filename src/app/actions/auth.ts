"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createCsrfToken } from "@/lib/auth/csrf";
import { logoutUser, loginUser, registerUser, checkUsernameAvailability } from "@/lib/auth/service";
import { clearSessionCookie } from "@/lib/auth/session";
import { getClientIp } from "@/lib/logger";

export type AuthActionState = { error?: string } | undefined;

async function getAuthContext() {
  const headerStore = await headers();
  return { ip: getClientIp(headerStore) };
}

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const context = await getAuthContext();
  const result = await loginUser(
    {
      username: String(formData.get("username") ?? ""),
      password: String(formData.get("password") ?? ""),
      csrfToken: String(formData.get("csrfToken") ?? ""),
      honeypot: String(formData.get("website") ?? ""),
    },
    context,
  );

  if (result.error) {
    return result;
  }

  const next = String(formData.get("next") ?? "").trim();
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function registerAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const context = await getAuthContext();
  const result = await registerUser(
    {
      username: String(formData.get("username") ?? ""),
      password: String(formData.get("password") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
      csrfToken: String(formData.get("csrfToken") ?? ""),
      honeypot: String(formData.get("website") ?? ""),
    },
    context,
  );

  if (result.error) {
    return result;
  }

  redirect("/");
}

export async function logoutAction(): Promise<void> {
  const context = await getAuthContext();
  await logoutUser(context);
  await clearSessionCookie();
  redirect("/login");
}

export async function refreshCsrfTokenAction(): Promise<string> {
  return createCsrfToken();
}

export type UsernameAvailabilityResult = {
  available: boolean;
  error?: string;
};

export async function checkUsernameAvailabilityAction(
  username: string,
): Promise<UsernameAvailabilityResult> {
  return checkUsernameAvailability(username);
}
