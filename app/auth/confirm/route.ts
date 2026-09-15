import { cookies } from "next/headers";
import { getT } from "@/lib/i18n-server";
import { authCall } from "@/lib/server";
export async function GET(request: Request) {
  const t = await getT();
  const url = new URL(request.url);
  const hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  if (!hash || !["signup", "recovery", "email"].includes(type ?? ""))
    return new Response(t("Enlace inválido"), { status: 400 });
  try {
    const d = await authCall("verify", { token_hash: hash, type });
    if (d.access_token) {
      const jar = await cookies();
      const options = {
        httpOnly: true,
        secure: true,
        sameSite: "strict" as const,
        path: "/",
      };
      jar.set("parish_access", d.access_token, {
        ...options,
        maxAge: d.expires_in ?? 900,
      });
      jar.set("parish_refresh", d.refresh_token, {
        ...options,
        maxAge: 604800,
      });
    }
    return Response.redirect(
      new URL(type === "recovery" ? "/recuperar" : "/cuenta", request.url),
      303,
    );
  } catch {
    return new Response(
      t(
        "Este enlace es inválido o ya caducó. Solicita uno nuevo desde Mi cuenta.",
      ),
      { status: 400 },
    );
  }
}
