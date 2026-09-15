import { cookies } from "next/headers";
import { hasPermission } from "./payment-core.mjs";
import { supabaseServiceHeaders } from "./supabase-headers.mjs";

export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const configured = () =>
  Boolean(
    process.env.SUPABASE_URL &&
    (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
  );
export function secret(name: string) {
  const modernName = (
    {
      SUPABASE_SERVICE_ROLE_KEY: "SUPABASE_SECRET_KEY",
      SUPABASE_ANON_KEY: "SUPABASE_PUBLISHABLE_KEY",
    } as Record<string, string>
  )[name];
  const value =
    (modernName ? process.env[modernName] : undefined) || process.env[name];
  if (!value)
    throw new AppError(
      503,
      "Este servicio aún no está habilitado. Contacta con la oficina parroquial.",
    );
  return value;
}
export async function db(path: string, options: RequestInit = {}) {
  const response = await fetch(`${secret("SUPABASE_URL")}/rest/v1/${path}`, {
    ...options,
    headers: {
      ...supabaseServiceHeaders(secret("SUPABASE_SERVICE_ROLE_KEY")),
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...options.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    console.error(
      JSON.stringify({
        event: "database_error",
        status: response.status,
        path: path.split("?")[0],
      }),
    );
    throw new AppError(
      503,
      "No fue posible completar la operación. Inténtalo de nuevo.",
    );
  }
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}
export async function rpc(name: string, body: unknown) {
  return db(`rpc/${name}`, { method: "POST", body: JSON.stringify(body) });
}
export async function authCall(
  path: string,
  body?: unknown,
  token?: string,
  method = body ? "POST" : "GET",
) {
  const response = await fetch(`${secret("SUPABASE_URL")}/auth/v1/${path}`, {
    method,
    headers: {
      apikey: secret("SUPABASE_ANON_KEY"),
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });
  const result: any = await response.json();
  if (!response.ok)
    throw new AppError(
      response.status === 429 ? 429 : 400,
      "No se pudo completar la autenticación. Revisa tus datos o solicita un enlace nuevo.",
    );
  return result;
}
export async function session() {
  const token = (await cookies()).get("parish_access")?.value;
  if (!token) throw new AppError(401, "Inicia sesión para continuar.");
  let user;
  try {
    user = await authCall("user", undefined, token);
  } catch {
    throw new AppError(401, "Tu sesión ha caducado. Vuelve a iniciar sesión.");
  }
  const profiles = await db(
    `profiles?id=eq.${encodeURIComponent(user.id)}&select=*`,
  );
  if (!profiles[0])
    throw new AppError(
      403,
      "Tu perfil aún no está disponible. Contacta con la oficina parroquial.",
    );
  if (profiles[0]?.revoked)
    throw new AppError(403, "Esta cuenta ha sido revocada.");
  // Claims are read only after this exact access token was verified by the Auth server.
  const claims = JSON.parse(
    Buffer.from(token.split(".")[1], "base64url").toString(),
  );
  return { user, profile: profiles[0], token, aal: claims.aal };
}
export async function permitted(module: string) {
  const s = await session();
  if (s.aal !== "aal2")
    throw new AppError(
      403,
      "Activa y verifica la autenticación de dos factores para administrar.",
    );
  if (!hasPermission(s.profile, s.aal, module))
    throw new AppError(
      403,
      "No tienes permiso para administrar este apartado.",
    );
  return s;
}
export async function publicData(
  table: "schedules" | "announcements" | "videos" | "courses",
) {
  if (!configured()) return { rows: [], unavailable: false };
  try {
    const queries = {
      schedules: "select=*&order=weekday.asc,time.asc",
      announcements: `select=*&published_at=lte.${encodeURIComponent(new Date().toISOString())}&or=(expires_at.is.null,expires_at.gt.${encodeURIComponent(new Date().toISOString())})&order=pinned.desc,published_at.desc`,
      videos:
        "select=id,title,description,asset_id,thumbnail_id,created_at&published=eq.true&order=created_at.desc",
      courses:
        "select=id,title,description,sacrament,price_cents,tax_included&published=eq.true&order=created_at.desc",
    };
    return { rows: await db(`${table}?${queries[table]}`), unavailable: false };
  } catch {
    return { rows: [], unavailable: true };
  }
}
