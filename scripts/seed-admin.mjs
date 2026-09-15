import { supabaseServiceHeaders } from "../lib/supabase-headers.mjs";
const required = (n) => {
  if (!process.env[n]) throw Error(`Missing ${n}`);
  return process.env[n];
};
const root = required("SUPABASE_URL"),
  key =
    process.env.SUPABASE_SECRET_KEY || required("SUPABASE_SERVICE_ROLE_KEY"),
  id = required("SUPER_ADMIN_USER_ID");
if (!/^[a-f\d-]{36}$/i.test(id)) throw Error("Invalid user UUID");
const headers = {
  ...supabaseServiceHeaders(key),
  "Content-Type": "application/json",
};
const u = await fetch(`${root}/auth/v1/admin/users/${id}`, { headers });
if (!u.ok) throw Error("User not found");
const user = await u.json();
if (!user.email_confirmed_at) throw Error("Verify email first");
const r = await fetch(`${root}/rest/v1/profiles?id=eq.${id}`, {
  method: "PATCH",
  headers,
  body: JSON.stringify({
    role: "super_admin",
    permissions: [
      "schedules",
      "announcements",
      "videos",
      "courses",
      "payments",
    ],
    revoked: false,
  }),
});
if (!r.ok) throw Error("Bootstrap failed");
console.log(
  "Super administrator configured. Enroll and verify MFA in Mi cuenta before opening /admin.",
);
