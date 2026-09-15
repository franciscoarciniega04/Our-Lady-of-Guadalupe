import { supabaseServiceHeaders } from "../lib/supabase-headers.mjs";
const url = process.env.SUPABASE_URL,
  key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw Error("Configure Supabase server credentials");
for (const bucket of [
  {
    id: "parish-media",
    name: "parish-media",
    public: false,
    file_size_limit: 52428800,
    allowed_mime_types: [
      "video/mp4",
      "video/webm",
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
  },
  {
    id: "parish-certificates",
    name: "parish-certificates",
    public: false,
    file_size_limit: 5242880,
    allowed_mime_types: ["application/pdf"],
  },
]) {
  const r = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      ...supabaseServiceHeaders(key),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bucket),
  });
  if (!r.ok) {
    const d = await r.json();
    if (d.statusCode !== "409" && d.error !== "Duplicate")
      throw Error(`Bucket ${bucket.id}: creation failed`);
  }
  console.log(`${bucket.id}: private bucket ready`);
}
