import assert from "node:assert/strict";
import english from "../lib/locales/en.json" with { type: "json" };
const origin = process.argv[2] ?? "http://localhost:5173";
const pages = {"/":"Un lugar para creer.","/horarios":"Horarios de misas","/avisos":"Avisos parroquiales","/videos":"Videos y homilías","/cursos":"Formación y cursos","/parroquia":"Nuestra parroquia","/contacto":"Estamos para acompañarte","/cuenta":"Mi cuenta","/verificar":"Verificar un certificado","/privacidad":"Aviso de privacidad","/terminos":"Términos de los cursos","/admin":"Acceso administrativo"};
for (const [path, heading] of Object.entries(pages)) {
  for (const locale of ["en", "es"]) {
    const response = await fetch(origin + path, { headers: locale === "es" ? { Cookie: "parish_locale=es" } : {} });
    assert.equal(response.status, 200, path);
    const html = (await response.text()).replaceAll("&amp;", "&").replaceAll("&#x27;", "'");
    assert.ok(html.includes(`lang="${locale}-US"`), path + " document language");
    assert.ok(html.includes(locale === "es" ? heading : english[heading]), path + " translated heading");
    assert.ok(html.includes('action="/api/language"'), path + " selector");
  }
}
const change = async (locale, returnTo, requestOrigin = origin) => fetch(origin + "/api/language", { method: "POST", redirect: "manual", headers: { Origin: requestOrigin, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ locale, returnTo }) });
const changed = await change("es", "/cursos?status=cancelled");
assert.equal(changed.status, 303);
assert.equal(changed.headers.get("location"), origin + "/cursos?status=cancelled");
assert.match(changed.headers.get("set-cookie"), /parish_locale=es.*HttpOnly/i);
const cookie = changed.headers.get("set-cookie").split(";")[0];
const nextPage = await fetch(origin + "/horarios", { headers: { Cookie: cookie } });
assert.ok((await nextPage.text()).includes("Horarios de misas"));
assert.equal((await change("fr", "/")).status, 400);
assert.equal((await change("es", "/", "https://example.com")).status, 403);
assert.equal((await change("en", "//example.com/")).headers.get("location"), origin + "/");
for (const locale of ["en", "es"]) {
 const r = await fetch(origin + "/api/account", {headers:{Cookie:`parish_locale=${locale}`}});
 assert.equal(r.status,401);
 const d = await r.json();
 assert.equal(d.error,locale === "es" ? "Inicia sesión para continuar." : english["Inicia sesión para continuar."]);
}
console.log("Language checks passed: 24 pages, preference persistence, redirect safety and localized API errors.");
