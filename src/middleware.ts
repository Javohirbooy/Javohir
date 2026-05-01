import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

/** Edge: Prisma yuklanmasin — faqat `auth.config.ts`. To‘liq auth — `auth.ts` + API route. */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;

  if (pathname.startsWith("/admin")) {
    if (!role) return NextResponse.redirect(new URL("/kirish", req.url));
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") return NextResponse.redirect(new URL("/", req.url));
  }

  if (pathname.startsWith("/super-admin")) {
    if (!role) return NextResponse.redirect(new URL("/kirish", req.url));
    if (role !== "SUPER_ADMIN") return NextResponse.redirect(new URL("/", req.url));
  }

  if (pathname.startsWith("/oqituvchi")) {
    if (!role) return NextResponse.redirect(new URL("/kirish", req.url));
    if (role !== "TEACHER") return NextResponse.redirect(new URL("/", req.url));
  }

  if (pathname.startsWith("/oquvchi")) {
    if (!role) return NextResponse.redirect(new URL("/kirish", req.url));
    if (role !== "STUDENT") return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/super-admin/:path*", "/oqituvchi/:path*", "/oquvchi/:path*"],
};
