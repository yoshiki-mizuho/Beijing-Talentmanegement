import { NextResponse, type NextRequest } from "next/server";

import { buildContentSecurityPolicy } from "@/server/security/content-security-policy";
import {
  getRequestHost,
  isCrossOriginWrite
} from "@/server/security/same-origin";

export function proxy(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = getRequestHost(forwardedHost, request.headers.get("host"));

  if (
    isCrossOriginWrite({
      method: request.method,
      pathname: request.nextUrl.pathname,
      origin: request.headers.get("origin"),
      host
    })
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const nonce = btoa(crypto.randomUUID());
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);

  return response;
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"]
};
