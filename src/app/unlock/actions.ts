"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ACCESS_COOKIE,
  ACCESS_MAX_AGE_SECONDS,
  accessToken,
  isCorrectPassword,
  safeNextPath,
} from "@/lib/site-access";

export type UnlockState = { error: string | null };

export async function unlock(_prev: UnlockState, formData: FormData): Promise<UnlockState> {
  const attempt = String(formData.get("password") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? "/"));

  if (!(await isCorrectPassword(attempt))) {
    // Slow down guessing.
    await new Promise((resolve) => setTimeout(resolve, 750));
    return { error: "That password isn't right. Please try again." };
  }

  const token = await accessToken();
  if (!token) return { error: "The site password hasn't been set up yet." };

  (await cookies()).set(ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_MAX_AGE_SECONDS,
  });
  redirect(next);
}
