import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Admin-only route prefixes (plan §9). Staff are redirected away from these;
 * admins pass through. Everything else under /admin is allowed for any
 * authenticated user (admin or staff).
 */
const ADMIN_ONLY_PREFIXES = [
  "/admin/users",
  "/admin/services",
  "/admin/venues",
  "/admin/business-hours",
  "/admin/audit-log",
];

const CHANGE_PASSWORD_PATH = "/admin/change-password";
const LOGIN_PATH = "/admin/login";

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const { pathname } = req.nextUrl;

    // Already authenticated but sitting on the login page → send to dashboard.
    if (token && pathname === LOGIN_PATH) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    // Forced first-login password change: trap the user on the change-password
    // page until they have set a new password.
    if (token?.mustChangePassword && pathname !== CHANGE_PASSWORD_PATH) {
      return NextResponse.redirect(new URL(CHANGE_PASSWORD_PATH, req.url));
    }

    // Role enforcement: staff may not access admin-only sections.
    const isAdminOnly = ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
    if (isAdminOnly && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/admin?error=forbidden", req.url));
    }

    return NextResponse.next();
  },
  {
    pages: { signIn: LOGIN_PATH },
    callbacks: {
      // The login page is always reachable; every other /admin route requires a
      // valid token (unauthenticated users are redirected to signIn).
      authorized: ({ token, req }) => {
        if (req.nextUrl.pathname === LOGIN_PATH) return true;
        return !!token;
      },
    },
  },
);

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
