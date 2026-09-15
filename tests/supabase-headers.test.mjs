import { test } from "node:test";
import assert from "node:assert/strict";
import { supabaseServiceHeaders } from "../lib/supabase-headers.mjs";
test("new Supabase secrets are sent as API keys, never as JWTs", () => {
  const headers = supabaseServiceHeaders("sb_secret_fixture");
  assert.equal(headers.apikey, "sb_secret_fixture");
  assert.equal(headers.Authorization, undefined);
});
test("legacy JWT service keys remain supported", () => {
  assert.equal(
    supabaseServiceHeaders("eyJfixture.payload.signature").Authorization,
    "Bearer eyJfixture.payload.signature",
  );
  assert.throws(() => supabaseServiceHeaders(""));
});
