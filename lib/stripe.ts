import { secret, AppError } from "./server";
export async function stripe(
  path: string,
  params: Record<string, string>,
  idempotencyKey?: string,
) {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret("STRIPE_SECRET_KEY")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: new URLSearchParams(params),
  });
  const d = (await r.json()) as any;
  if (!r.ok)
    throw new AppError(
      502,
      "La pasarela no pudo procesar la solicitud. Inténtalo nuevamente.",
    );
  return d;
}
