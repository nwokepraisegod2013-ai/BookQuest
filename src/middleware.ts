import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/books(.*)",
  "/store(.*)",
  "/terms",
  "/privacy",
  "/refund",
  "/contact",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/books/.*/sample",
]);

export default clerkMiddleware((auth, req) => {
  // Public routes bypass auth
  if (isPublicRoute(req)) return;

  // Protected routes
  auth.protect();
});

export const config = {
  matcher: [
    // Run middleware on all routes except static assets
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};