import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Super Admin Routes
    if (path.startsWith("/superadmin")) {
      if (path === "/superadmin/login") return NextResponse.next();
      
      if (!token || token.role !== "superadmin") {
        return NextResponse.redirect(new URL("/superadmin/login", req.url));
      }
      return NextResponse.next();
    }

    // Pool Admin Routes
    const poolAdminRegex = /^\/([^\/]+)\/admin(\/.*)?$/;
    const match = path.match(poolAdminRegex);
    
    if (match) {
      const poolSlug = match[1];
      const adminSubRoute = match[2] || "";

      if (adminSubRoute.includes("/login")) return NextResponse.next();

      if (!token || (token.role !== "admin" && token.role !== "operator")) {
        return NextResponse.redirect(new URL(`/${poolSlug}/admin/login`, req.url));
      }

      if (token.poolSlug !== poolSlug) {
        return NextResponse.redirect(new URL(`/${poolSlug}/admin/login`, req.url));
      }

      return NextResponse.next();
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true,
    },
  }
);

export const config = {
  matcher: [
    "/superadmin/:path*",
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
