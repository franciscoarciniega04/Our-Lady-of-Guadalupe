import { test } from "node:test";
import assert from "node:assert/strict";
import {
  verifyStripeSignature,
  paymentTransition,
  hasPermission,
} from "../lib/payment-core.mjs";
async function sign(body, secret, t = 1700000000) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${t}.${body}`),
  );
  return `t=${t},v1=${Buffer.from(bytes).toString("hex")}`;
}
test("webhook requires a valid signature, rejects tampering and replay outside tolerance", async () => {
  const body = JSON.stringify({ id: "evt_1" }),
    secret = "whsec_test";
  await verifyStripeSignature(
    body,
    await sign(body, secret),
    secret,
    1700000000,
  );
  await assert.rejects(() =>
    verifyStripeSignature(body, null, secret, 1700000000),
  );
  await assert.rejects(() =>
    verifyStripeSignature(body + " ", awaitHeader, secret, 1700000000),
  );
  await assert.rejects(() =>
    verifyStripeSignature(body, "t=1,v1=" + "0".repeat(64), secret, 1700000000),
  );
  const expired = await sign(body, secret);
  await assert.rejects(() =>
    verifyStripeSignature(body, expired, secret, 1700000400),
  );
});
const awaitHeader = "t=1700000000,v1=" + "0".repeat(64);
test("redirects and unpaid sessions never grant access; amount/currency/session must match", () => {
  const p = {
    id: "p1",
    stripe_session_id: "cs_1",
    amount_cents: 2500,
    currency: "usd",
  };
  const event = {
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_1",
        metadata: { payment_id: "p1" },
        payment_status: "paid",
        currency: "usd",
        amount_subtotal: 2500,
      },
    },
  };
  assert.equal(paymentTransition(event, p), "confirmed");
  for (const patch of [
    { payment_status: "unpaid" },
    { currency: "mxn" },
    { amount_subtotal: 1 },
    { id: "cs_other" },
    { metadata: { payment_id: "p2" } },
  ])
    assert.equal(
      paymentTransition(
        { ...event, data: { object: { ...event.data.object, ...patch } } },
        p,
      ),
      null,
    );
  assert.equal(
    paymentTransition({ ...event, type: "frontend.success" }, p),
    null,
  );
});
test("permissions require active account, assigned module and MFA even for super admin", () => {
  assert.equal(
    hasPermission({ role: "super_admin" }, "aal1", "payments"),
    false,
  );
  assert.equal(
    hasPermission({ role: "super_admin" }, "aal2", "payments"),
    true,
  );
  assert.equal(
    hasPermission(
      { role: "content_admin", permissions: ["announcements"] },
      "aal2",
      "payments",
    ),
    false,
  );
  assert.equal(
    hasPermission(
      { role: "content_admin", permissions: ["announcements"] },
      "aal2",
      "announcements",
    ),
    true,
  );
  assert.equal(
    hasPermission({ role: "super_admin", revoked: true }, "aal2", "payments"),
    false,
  );
  assert.equal(
    hasPermission({ role: "member", permissions: [] }, "aal2", "courses"),
    false,
  );
});
