export async function verifyStripeSignature(
  body,
  header,
  secret,
  now = Math.floor(Date.now() / 1000),
) {
  if (!header || !secret) throw Error("Missing webhook signature");
  const values = header.split(",").map((v) => v.trim().split("="));
  const timestamp = values.find((v) => v[0] === "t")?.[1];
  if (
    !timestamp ||
    !/^\d+$/.test(timestamp) ||
    Math.abs(now - Number(timestamp)) > 300
  )
    throw Error("Expired webhook signature");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  for (const [name, value] of values) {
    if (name !== "v1" || !value || !/^[a-f0-9]{64}$/i.test(value)) continue;
    const bytes = Uint8Array.from(value.match(/.{2}/g), (v) => parseInt(v, 16));
    if (
      await crypto.subtle.verify(
        "HMAC",
        key,
        bytes,
        new TextEncoder().encode(`${timestamp}.${body}`),
      )
    )
      return;
  }
  throw Error("Invalid webhook signature");
}
export function paymentTransition(event, payment) {
  const o = event.data.object;
  if (
    [
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
    ].includes(event.type)
  ) {
    if (
      o.payment_status !== "paid" ||
      o.id !== payment.stripe_session_id ||
      o.metadata?.payment_id !== payment.id ||
      o.currency !== payment.currency ||
      o.amount_subtotal !== payment.amount_cents
    )
      return null;
    return "confirmed";
  }
  if (
    event.type === "checkout.session.async_payment_failed" &&
    o.id === payment.stripe_session_id
  )
    return "failed";
  if (
    event.type === "charge.refunded" &&
    o.payment_intent === payment.stripe_payment_intent &&
    o.amount_refunded > 0
  )
    return "refunded";
  return null;
}
export function hasPermission(profile, aal, module) {
  return (
    !profile?.revoked &&
    aal === "aal2" &&
    (profile?.role === "super_admin" ||
      profile?.permissions?.includes(module) === true)
  );
}
