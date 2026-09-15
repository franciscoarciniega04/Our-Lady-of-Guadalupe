import { NextResponse } from "next/server";
export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  if (request.headers.get("origin") !== origin)
    return new Response("Invalid origin", { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > 4096)
    return new Response("Request too large", { status: 413 });
  const body = await request.text();
  if (body.length > 4096)
    return new Response("Request too large", { status: 413 });
  const form = new URLSearchParams(body);
  const locale = form.get("locale");
  if (locale !== "en" && locale !== "es")
    return new Response("Invalid language", { status: 400 });
  const path = form.get("returnTo") ?? "/";
  let target = new URL("/", origin);
  try {
    const candidate = new URL(path, origin);
    if (
      path.startsWith("/") &&
      !path.startsWith("//") &&
      candidate.origin === origin &&
      !candidate.pathname.startsWith("/api/")
    )
      target = candidate;
  } catch {}
  const response = NextResponse.redirect(target, 303);
  response.cookies.set("parish_locale", locale, {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    maxAge: 31536000,
    path: "/",
  });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
