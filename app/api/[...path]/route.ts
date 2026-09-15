import { cookies } from "next/headers";
import { getT } from "@/lib/i18n-server";
import { z } from "zod";
import {
  AppError,
  authCall,
  configured,
  db,
  permitted,
  rpc,
  secret,
  session,
} from "@/lib/server";
import {
  captcha,
  jsonBody,
  legalReady,
  limit,
  sameOrigin,
} from "@/lib/security";
import { verifyStripeSignature } from "@/lib/payment-core.mjs";
import { stripe } from "@/lib/stripe";
import { adminRoute } from "@/lib/admin";
import { courseRoute, downloadCertificate } from "@/lib/learning";
import { mediaRoute } from "@/lib/media";
export const dynamic = "force-dynamic";
const uuid = z.string().uuid();
async function setSession(data: any) {
  const jar = await cookies();
  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "strict" as const,
    path: "/",
  };
  jar.set("parish_access", data.access_token, {
    ...options,
    maxAge: Math.min(data.expires_in ?? 900, 3600),
  });
  if (data.refresh_token)
    jar.set("parish_refresh", data.refresh_token, {
      ...options,
      maxAge: 60 * 60 * 24 * 7,
    });
}
async function handler(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    const route = path.join("/");
    const method = request.method;
    if (route === "webhooks/stripe" && method === "POST") {
      const body = await request.text();
      try {
        await verifyStripeSignature(
          body,
          request.headers.get("stripe-signature"),
          secret("STRIPE_WEBHOOK_SECRET"),
        );
      } catch {
        throw new AppError(400, "Firma de webhook inválida.");
      }
      const event = JSON.parse(body);
      if (!event.id || !event.type || !event.data?.object)
        throw new AppError(400, "Evento inválido.");
      await rpc("apply_stripe_event", {
        p_event_id: event.id,
        p_type: event.type,
        p_object: event.data.object,
      });
      return Response.json({ received: true });
    }
    if (method !== "GET") sameOrigin(request);
    if (route === "config" && method === "GET")
      return Response.json({
        captchaSiteKey: process.env.HCAPTCHA_SITE_KEY ?? "",
      });
    if (path[0] === "auth" && method === "POST") {
      const action = path[1];
      const b = await jsonBody(request);
      if (action === "logout") {
        try {
          const s = await session();
          await authCall("logout", {}, s.token);
        } catch {}
        const jar = await cookies();
        jar.delete("parish_access");
        jar.delete("parish_refresh");
        return Response.json({ message: "Sesión cerrada." });
      }
      if (action === "refresh") {
        const refresh = (await cookies()).get("parish_refresh")?.value;
        if (!refresh) throw new AppError(401, "Inicia sesión.");
        const d = await authCall("token?grant_type=refresh_token", {
          refresh_token: refresh,
        });
        await setSession(d);
        return Response.json({ message: "Sesión actualizada." });
      }
      if (action.startsWith("mfa-")) {
        const s = await session();
        await limit(`mfa:${s.user.id}`, 10);
        if (action === "mfa-enroll") {
          const d = await authCall(
            "factors",
            { factor_type: "totp", friendly_name: "Parroquia" },
            s.token,
          );
          return Response.json({
            factor: d,
            message: "Añade la clave a tu autenticador y verifica el código.",
          });
        }
        const factorId = uuid.parse(b.factorId);
        const code = z
          .string()
          .regex(/^\d{6}$/)
          .parse(b.code);
        const challenge = await authCall(
          `factors/${factorId}/challenge`,
          {},
          s.token,
        );
        const d = await authCall(
          `factors/${factorId}/verify`,
          { challenge_id: challenge.id, code },
          s.token,
        );
        await setSession(d);
        return Response.json({
          message: "Verificación en dos pasos completada.",
        });
      }
      if (action === "reset") {
        const s = await session();
        const password = z
          .string()
          .min(12)
          .max(128)
          .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
          .parse(b.password);
        await authCall("user", { password }, s.token, "PUT");
        return Response.json({ message: "Contraseña actualizada." });
      }
      const email = z.string().email().max(254).parse(b.email).toLowerCase();
      await limit(`auth:${email}`, 8);
      await captcha(b["h-captcha-response"]);
      if (action === "recover") {
        await authCall("recover", {
          email,
          redirect_to: `${secret("APP_URL")}/recuperar`,
        });
        return Response.json({
          message:
            "Si la cuenta existe, recibirás un enlace para recuperar el acceso.",
        });
      }
      const password = z.string().min(12).max(128).parse(b.password);
      if (action === "signup") {
        legalReady();
        if (!b.consent)
          throw new AppError(400, "Acepta las condiciones para continuar.");
        z.string()
          .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
          .parse(password);
        const name = z.string().min(3).max(100).parse(b.name);
        await authCall("signup", {
          email,
          password,
          data: {
            full_name: name,
            legal_version: process.env.LEGAL_VERSION ?? "1",
          },
        });
        return Response.json({
          message:
            "Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.",
        });
      }
      if (action === "login") {
        const d = await authCall("token?grant_type=password", {
          email,
          password,
        });
        await setSession(d);
        return Response.json({ message: "Sesión iniciada." });
      }
      throw new AppError(404, "Acción no encontrada.");
    }
    if (route === "account" && method === "GET") {
      const s = await session();
      const [enrollments, certificates] = await Promise.all([
        db(`enrollments?user_id=eq.${s.user.id}&select=*,courses(title)`),
        db(
          `certificates?user_id=eq.${s.user.id}&revoked=eq.false&select=id,folio,issued_at`,
        ),
      ]);
      return Response.json({
        name:
          s.profile?.full_name ??
          s.user.user_metadata?.full_name ??
          "Mi cuenta",
        email: s.user.email,
        verified: !!s.user.email_confirmed_at,
        admin: s.profile?.role !== "member",
        factorId: s.user.factors?.find((f: any) => f.status === "verified")?.id,
        enrollments,
        certificates,
      });
    }
    if (path[0] === "verify" && method === "GET") {
      const folio = uuid.parse(path[1]);
      const records = await db(
        `certificates?folio=eq.${folio}&revoked=eq.false&select=folio,issued_at,courses(title)`,
      );
      if (!records.length)
        throw new AppError(
          404,
          "No se encontró un certificado válido con ese folio.",
        );
      return Response.json({
        folio: records[0].folio,
        issued_at: records[0].issued_at,
        course: records[0].courses.title,
      });
    }
    if (path[0] === "courses") return await courseRoute(request, path.slice(1));
    if (path[0] === "certificates" && method === "GET")
      return await downloadCertificate(uuid.parse(path[1]));
    if (path[0] === "media") return await mediaRoute(request, path.slice(1));
    if (path[0] === "admin") return await adminRoute(request, path.slice(1));
    throw new AppError(404, "Recurso no encontrado.");
  } catch (e) {
    const status =
      e instanceof AppError ? e.status : e instanceof z.ZodError ? 400 : 500;
    const message =
      e instanceof AppError
        ? e.message
        : e instanceof z.ZodError
          ? "Revisa los campos de la solicitud."
          : "Ocurrió un error. Inténtalo nuevamente.";
    if (status === 500)
      console.error(
        JSON.stringify({
          event: "api_error",
          message: e instanceof Error ? e.message : "unknown",
        }),
      );
    return Response.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
async function localizedHandler(...args: Parameters<typeof handler>) {
  const response = await handler(...args);
  if (!response.headers.get("content-type")?.includes("application/json"))
    return response;
  const data: any = await response.json();
  const t = await getT();
  if (data && !Array.isArray(data)) {
    for (const key of ["message", "error"]) {
      if (typeof data[key] === "string") data[key] = t(data[key]);
    }
  }
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("Content-Language", t.locale);
  headers.set("Cache-Control", "private, no-store");
  headers.append("Vary", "Cookie");
  return Response.json(data, { status: response.status, headers });
}
export {
  localizedHandler as GET,
  localizedHandler as POST,
  localizedHandler as PATCH,
  localizedHandler as DELETE,
};
