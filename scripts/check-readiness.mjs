const groups = {
  "Cuenta y base de datos": [
    ["SUPABASE_URL"],
    ["SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY"],
    ["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
  ],
  Captcha: [["HCAPTCHA_SITE_KEY"], ["HCAPTCHA_SECRET"]],
  "Pagos de prueba": [["STRIPE_SECRET_KEY"], ["STRIPE_WEBHOOK_SECRET"]],
  Archivos: [["FILE_SCANNER_URL"], ["FILE_SCANNER_TOKEN"]],
  "URL del sitio": [["APP_URL"]],
};
let missing = false;
for (const [name, fields] of Object.entries(groups)) {
  const absent = fields.filter(
    (aliases) =>
      !aliases.some(
        (k) =>
          process.env[k] &&
          !/your-project|your-site|\.example/.test(process.env[k]),
      ),
  );
  console.log(
    `${absent.length ? "PENDIENTE" : "CONFIGURADO"}: ${name}${absent.length ? " — " + absent.map((a) => a.join(" o ")).join(", ") : ""}`,
  );
  missing ||= absent.length > 0;
}
console.log(
  `Apertura de inscripciones: ${process.env.LEGAL_APPROVED === "true" ? "habilitada por configuración; comprobar aprobación documental" : "cerrada"}`,
);
console.log(
  "Esta comprobación no muestra claves ni contacta proveedores. Tener variables no demuestra que los servicios funcionen.",
);
process.exitCode = missing ? 1 : 0;
