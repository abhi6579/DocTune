import { NextResponse, type NextRequest } from "next/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Guard /runs/:id page requests: a malformed run id is rewritten to a
 * nonexistent route so Next serves the real 404 (status + not-found UI)
 * instead of the streamed soft-404 (HTTP 200) the App Router otherwise emits.
 * Valid-format ids pass through and are resolved by the page as usual.
 */
export default function proxy(req: NextRequest) {
  const match = req.nextUrl.pathname.match(/^\/runs\/([^/]+)\/?$/);
  if (match && !UUID_RE.test(match[1])) {
    return NextResponse.rewrite(new URL("/__not-found", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/runs/:path*",
};
