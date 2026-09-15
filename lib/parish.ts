export const parish = {
  name: "Our Lady of Guadalupe Catholic Church Mendota",
  shortName: "Our Lady of Guadalupe",
  location: "Mendota, California",
  priest: "Jorge Alberto Robles Cuevas",
  phone: "+1 559-655-4237",
  phoneHref: "tel:+15596554237",
  currency: "USD",
  timeZone: "America/Los_Angeles",
};
export const days = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
export const money = (cents: number, locale: "en" | "es" = "en") =>
  new Intl.NumberFormat(locale === "es" ? "es-US" : "en-US", {
    style: "currency",
    currency: parish.currency,
  }).format(cents / 100);
