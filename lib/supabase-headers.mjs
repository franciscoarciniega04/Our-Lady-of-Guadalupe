/** New Supabase API keys belong in apikey, not in a JWT bearer header. */
export function supabaseServiceHeaders(key) {
  if (!key) throw new Error("Supabase service key is missing");
  return {
    apikey: key,
    ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}),
  };
}
