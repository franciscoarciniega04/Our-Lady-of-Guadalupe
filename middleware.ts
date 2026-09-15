import { NextRequest, NextResponse } from "next/server";
export function middleware(request: NextRequest) {
  if (
    process.env.NODE_ENV === "production" &&
    request.nextUrl.protocol === "http:" &&
    request.nextUrl.hostname !== "localhost" &&
    request.nextUrl.hostname !== "127.0.0.1"
  ) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }
  const r = NextResponse.next();
  r.headers.set("Vary", "Cookie");
  const storage = process.env.SUPABASE_URL
    ? new URL(process.env.SUPABASE_URL).origin
    : "https://*.supabase.co";
  r.headers.set("X-Content-Type-Options", "nosniff");
  r.headers.set("X-Frame-Options", "DENY");
  r.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  r.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  if (process.env.NODE_ENV === "production")
    r.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  r.headers.set(
    "Content-Security-Policy",
    `default-src 'self'; script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV !== "production" ? "'unsafe-eval'" : ""} https://hcaptcha.com https://*.hcaptcha.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: ${storage}; media-src 'self' ${storage}; connect-src 'self' ${storage} https://hcaptcha.com https://*.hcaptcha.com ${process.env.NODE_ENV !== "production" ? "ws://localhost:*" : ""}; frame-src https://www.google.com https://hcaptcha.com https://*.hcaptcha.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`,
  );
  if (
    request.nextUrl.pathname.startsWith("/api/") ||
    ["/cuenta", "/admin", "/recuperar"].some((p) =>
      request.nextUrl.pathname.startsWith(p),
    )
  )
    r.headers.set("Cache-Control", "private, no-store");
  return r;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg).*)"],
};
