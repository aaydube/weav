import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isClerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/canvas(.*)",
  "/api/workflows(.*)",
]);

export function middleware(req: NextRequest, event: any) {
  if (isClerkConfigured) {
    return clerkMiddleware(async (auth, request) => {
      if (isProtectedRoute(request)) {
        await auth.protect();
      }
    })(req, event);
  }

  // Fallback Mock Middleware
  const { pathname } = req.nextUrl;
  
  // Public paths that do not require login
  const publicPaths = ["/sign-in", "/sign-up", "/favicon.ico", "/next.svg", "/vercel.svg", "/window.svg", "/globe.svg", "/file.svg"];
  const isPublicPath = publicPaths.some((p) => pathname === p || pathname.startsWith("/_next"));

  const token = req.cookies.get("py_auth_token")?.value;

  if (!token) {
    if (pathname.startsWith("/api/workflows")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isPublicPath && pathname !== "/") {
      const url = req.nextUrl.clone();
      url.pathname = "/sign-in";
      return NextResponse.redirect(url);
    }
  }

  if (token && (pathname === "/sign-in" || pathname === "/sign-up")) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export default middleware;

export const config = {
  matcher: [
    // Match all pathnames except for
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
