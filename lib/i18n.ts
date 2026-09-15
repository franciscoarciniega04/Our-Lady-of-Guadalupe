import english from "./locales/en.json";
export type Locale = "en" | "es";
export const languageTag = (locale: Locale) =>
  locale === "es" ? "es-US" : "en-US";
export function normalizeLocale(value?: string | null): Locale {
  return value === "es" ? "es" : "en";
}
export function translator(locale: Locale) {
  const t = (text: string) =>
    locale === "en"
      ? ((english as Record<string, string>)[text] ?? text)
      : text;
  return Object.assign(t, { locale });
}
export function formatTime(value: string, locale: Locale) {
  const [hour, minute] = value.split(":").map(Number);
  return new Intl.DateTimeFormat(languageTag(locale), {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2000, 0, 1, hour, minute)));
}
export function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(languageTag(locale), {
    dateStyle: "medium",
    timeZone: value.length === 10 ? "UTC" : "America/Los_Angeles",
  }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value));
}
