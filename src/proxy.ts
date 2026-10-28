import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_COOKIE, UNLOCK_PATH, isSitePublic, isValidAccessToken } from "@/lib/site-access";

export async function proxy(request: NextRequest) {
  if (isSitePublic()) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const unlocked = await isValidAccessToken(request.cookies.get(ACCESS_COOKIE)?.value);

  if (!unlocked && pathname !== UNLOCK_PATH) {
    const url = request.nextUrl.clone();
    url.pathname = UNLOCK_PATH;
    url.search = "";
    url.searchParams.set("next", pathname + search);
    return withNoIndex(NextResponse.redirect(url));
  }

  return withNoIndex(NextResponse.next());
}

// Keep search engines out while the site is private.
function withNoIndex(response: NextResponse) {
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  // Everything except Next.js build assets and robots.txt.
  matcher: ["/((?!_next/static|_next/image|robots.txt).*)"],
};
