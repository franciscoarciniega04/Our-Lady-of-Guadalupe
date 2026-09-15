import { cookies } from "next/headers";
import { normalizeLocale, translator } from "./i18n";
export async function getT() {
  return translator(
    normalizeLocale((await cookies()).get("parish_locale")?.value),
  );
}
