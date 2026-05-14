import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { applyCspNonceToRequestHeaders, buildContentSecurityPolicy, generateCspNonce } from "@/lib/csp";
import { getClientIpFromHeadersGetter } from "@/lib/client-ip";

export type EdgeContext = {
  nonce: string;
  csp: string;
  requestId: string;
};

export function createEdgeContext(req: NextRequest): EdgeContext {
  const nonce = generateCspNonce();
  const csp = buildContentSecurityPolicy(nonce, process.env.NODE_ENV === "development");
  const incomingRid = req.headers.get("x-request-id");
  const requestId = incomingRid?.trim() ? incomingRid : crypto.randomUUID();
  return { nonce, csp, requestId };
}

export function withCsp(res: NextResponse, ctx: EdgeContext): NextResponse {
  res.headers.set("Content-Security-Policy", ctx.csp);
  res.headers.set("x-request-id", ctx.requestId);
  return res;
}

export function nextWithRequestHeaders(req: NextRequest, ctx: EdgeContext): NextResponse {
  const requestHeaders = applyCspNonceToRequestHeaders(req.headers, ctx.nonce);
  requestHeaders.set("x-request-id", ctx.requestId);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  /**
   * `/api/*` javoblarida markaziy CSP `style-src` da `nonce` bo‘lganda brauzer `'unsafe-inline'` ni e’tiborsiz qiladi;
   * shuning uchun `/api/health?ui=1` kabi HTML dagi `<style>` bloklanadi. API marshrutlariga CSP qo‘ymaymiz.
   */
  if (req.nextUrl.pathname.startsWith("/api/")) {
    res.headers.set("x-request-id", ctx.requestId);
    return res;
  }
  return withCsp(res, ctx);
}

export function getEdgeClientIp(req: NextRequest): string {
  return getClientIpFromHeadersGetter((name) => req.headers.get(name));
}
