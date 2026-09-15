import { AppError, secret, rpc } from "./server";
export function sameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new AppError(403, "Origen de solicitud no permitido.");
}
export async function jsonBody(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 65536)
    throw new AppError(413, "Solicitud demasiado grande.");
  const text = await request.text();
  if (text.length > 65536)
    throw new AppError(413, "Solicitud demasiado grande.");
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError(400, "Datos inválidos.");
  }
}
export async function captcha(token: string) {
  if (!token) throw new AppError(400, "Completa la verificación de seguridad.");
  const r = await fetch("https://api.hcaptcha.com/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: secret("HCAPTCHA_SECRET"),
      response: token,
    }),
  });
  const d = (await r.json()) as any;
  if (!d.success || d.hostname !== new URL(secret("APP_URL")).hostname)
    throw new AppError(400, "Verificación de seguridad inválida.");
}
export async function limit(key: string, max = 10) {
  const hash = Buffer.from(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key)),
  ).toString("hex");
  const allowed = await rpc("take_rate_limit", { p_key: hash, p_limit: max });
  if (!allowed)
    throw new AppError(
      429,
      "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
    );
}
export function legalReady() {
  if (process.env.LEGAL_APPROVED !== "true")
    throw new AppError(
      503,
      "La parroquia aún está preparando las condiciones del servicio. Las inscripciones no están abiertas.",
    );
}
