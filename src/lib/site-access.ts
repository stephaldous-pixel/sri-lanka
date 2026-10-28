// Shared-password gate used until launch (see PLAN.md section 4a).
//
// Env vars (set in Vercel → Project → Settings → Environment Variables):
//   SITE_PASSWORD  the shared password
//   SITE_ACCESS    "public" turns the gate off; anything else keeps it on
//
// The cookie holds an HMAC derived from the password, never the password
// itself, so changing SITE_PASSWORD invalidates every existing cookie.

export const ACCESS_COOKIE = "site_access";
export const ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
export const UNLOCK_PATH = "/unlock";

export function isSitePublic(): boolean {
  return process.env.SITE_ACCESS === "public";
}

function sitePassword(): string | null {
  const password = process.env.SITE_PASSWORD;
  return password && password.length > 0 ? password : null;
}

async function hmacHex(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** The cookie value that proves the visitor knows the current password. */
export async function accessToken(): Promise<string | null> {
  const password = sitePassword();
  return password ? hmacHex(password, "site-access-v1") : null;
}

export async function isValidAccessToken(token: string | undefined): Promise<boolean> {
  const expected = await accessToken();
  return !!token && !!expected && constantTimeEqual(token, expected);
}

export async function isCorrectPassword(attempt: string): Promise<boolean> {
  const password = sitePassword();
  if (!password) return false;
  // Compare HMACs so the comparison is constant-length and constant-time.
  const [a, b] = await Promise.all([
    hmacHex("password-check", attempt),
    hmacHex("password-check", password),
  ]);
  return constantTimeEqual(a, b);
}

export function isPasswordConfigured(): boolean {
  return sitePassword() !== null;
}

/** Only allow redirects back to a path on this site. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/";
  }
  return next.startsWith(UNLOCK_PATH) ? "/" : next;
}
