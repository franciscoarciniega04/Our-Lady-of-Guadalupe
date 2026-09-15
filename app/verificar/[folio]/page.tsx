import { formatDate } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { db, configured } from "@/lib/server";
export const dynamic = "force-dynamic";
export default async function VerifyFolio({
  params,
}: {
  params: Promise<{ folio: string }>;
}) {
  const t = await getT();

  const { folio } = await params;
  let cert: any = null;
  let unavailable = false;
  try {
    if (configured() && /^[a-f\d-]{36}$/i.test(folio))
      [cert] = await db(
        `certificates?folio=eq.${folio}&revoked=eq.false&select=folio,issued_at,course_title`,
      );
    else unavailable = !configured();
  } catch {
    unavailable = true;
  }
  return (
    <main id="contenido" className="wrap section page">
      <p className="eyebrow">{t("VERIFICACIÓN DE CERTIFICADOS")}</p>
      <h1>
        {unavailable
          ? t("Verificación no disponible")
          : cert
            ? t("Certificado válido")
            : t("Certificado no encontrado")}
      </h1>
      {cert ? (
        <div className="record">
          <h2>{cert.course_title}</h2>
          <p>
            {t("Emitido:")} {formatDate(cert.issued_at, t.locale)}
          </p>
          <p>
            {t("Folio:")} {cert.folio}
          </p>
          <p>
            {t(
              "Por privacidad, esta consulta no publica el nombre del participante.",
            )}
          </p>
        </div>
      ) : (
        <p>
          {unavailable
            ? t("Intenta nuevamente más tarde o contacta con la parroquia.")
            : t(
                "Revisa el folio. Es posible que el certificado no exista o haya sido revocado.",
              )}
        </p>
      )}
      <a href="/verificar">{t("Consultar otro folio")}</a>
    </main>
  );
}
