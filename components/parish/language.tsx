"use client";
import { createContext, useContext } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { translator, type Locale } from "@/lib/i18n";
const LanguageContext = createContext<Locale>("en");
export function LanguageProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <LanguageContext.Provider value={locale}>
      {children}
    </LanguageContext.Provider>
  );
}
export function useT() {
  return translator(useContext(LanguageContext));
}
export function LanguageSwitcher() {
  const t = useT();
  const pathname = usePathname();
  const search = useSearchParams();
  const query = search.toString();
  return (
    <form
      className="language-switcher"
      method="post"
      action="/api/language"
      aria-label={t("Cambiar idioma")}
    >
      <input
        type="hidden"
        name="returnTo"
        value={`${pathname}${query ? `?${query}` : ""}`}
      />
      <button
        type="submit"
        name="locale"
        value="en"
        lang="en"
        aria-pressed={t.locale === "en"}
      >
        English
      </button>
      <span aria-hidden="true">/</span>
      <button
        type="submit"
        name="locale"
        value="es"
        lang="es"
        aria-pressed={t.locale === "es"}
      >
        Español
      </button>
    </form>
  );
}
