import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { applyCspNonceToRequestHeaders, buildContentSecurityPolicy, generateCspNonce } from "@/lib/csp";

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
  return withCsp(NextResponse.next({ request: { headers: requestHeaders } }), ctx);
}

export function getEdgeClientIp(req: NextRequest): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
