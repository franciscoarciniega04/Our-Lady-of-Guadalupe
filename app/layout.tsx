import { getT } from "@/lib/i18n-server";
import type { Metadata } from "next";
import "./globals.css";
import { WebTools } from "@/components/parish/web-tools";
import {
  LanguageProvider,
  LanguageSwitcher,
} from "@/components/parish/language";
import { languageTag } from "@/lib/i18n";
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: {
      default: "Our Lady of Guadalupe · Mendota",
      template: "%s | Our Lady of Guadalupe · Mendota",
    },
    description: t(
      "Horarios de misas, avisos, videos y formación de nuestra comunidad parroquial.",
    ),
    icons: { icon: "/favicon.svg" },
  };
}
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const t = await getT();

  return (
    <html lang={languageTag(t.locale)}>
      <body>
        <LanguageProvider locale={t.locale}>
          <WebTools />
          <a className="skip-link" href="#contenido">
            {t("Saltar al contenido")}
          </a>
          <div className="topline">
            <div className="wrap topline-inner">
              <span>{t("Un espacio de encuentro, oración y servicio")}</span>
              <LanguageSwitcher />
            </div>
          </div>
          <header className="site-header">
            <div className="wrap nav">
              <a className="brand" href="/">
                <span className="cross">✝</span>
                <span>
                  Our Lady of Guadalupe
                  <br />
                  <strong>Catholic Church · Mendota</strong>
                </span>
              </a>
              <nav aria-label={t("Navegación principal")}>
                <a href="/horarios">{t("Misas")}</a>
                <a href="/avisos">{t("Avisos")}</a>
                <a href="/videos">{t("Videos")}</a>
                <a href="/cursos">{t("Cursos")}</a>
                <a href="/contacto">{t("Contacto")}</a>
              </nav>
              <a className="account-link" href="/cuenta">
                {t("Mi cuenta")}
              </a>
            </div>
          </header>
          {children}
          <footer className="site-footer">
            <div className="wrap">
              <div className="footer-grid">
                <div>
                  <a className="brand" href="/">
                    ✝ Our Lady of Guadalupe · Mendota
                  </a>
                  <p>{t("Celebramos la fe. Caminamos juntos.")}</p>
                </div>
                <div>
                  <a href="/parroquia">{t("Nuestra parroquia")}</a>
                  <a href="/contacto">{t("Contacto y ubicación")}</a>
                </div>
                <div>
                  <a href="/privacidad">{t("Aviso de privacidad")}</a>
                  <a href="/terminos">{t("Términos y reembolsos")}</a>
                  <a href="/verificar">{t("Verificar certificado")}</a>
                </div>
              </div>
              <p className="footer-note">
                Our Lady of Guadalupe · Mendota · California
              </p>
            </div>
          </footer>
        </LanguageProvider>
      </body>
    </html>
  );
}
