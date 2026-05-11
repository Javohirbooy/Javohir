import { wrapRouteHandlerWithSentry } from "@sentry/nextjs";
import { handlers } from "@/auth";

export const GET = wrapRouteHandlerWithSentry(handlers.GET, {
  method: "GET",
  parameterizedRoute: "/api/auth/[...nextauth]",
});

export const POST = wrapRouteHandlerWithSentry(handlers.POST, {
  method: "POST",
  parameterizedRoute: "/api/auth/[...nextauth]",
});
