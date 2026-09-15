import { getT } from "@/lib/i18n-server";
import { permitted, session, AppError } from "@/lib/server";
import { Admin } from "@/components/parish/admin";
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const t = await getT();

  try {
    const s = await session();
    if (s.profile?.role === "member" || !s.profile)
      throw new AppError(403, t("No tienes acceso a la administración."));
    if (s.aal !== "aal2")
      throw new AppError(
        403,
        t("Verifica tu código de autenticación en dos pasos desde Mi cuenta."),
      );
    return (
      <main id="contenido" className="wrap section page">
        <p className="eyebrow">{t("ADMINISTRACIÓN PARROQUIAL")}</p>
        <h1>{t("Al servicio de la comunidad")}</h1>
        <Admin
          permissions={
            s.profile.role === "super_admin"
              ? [
                  "schedules",
                  "announcements",
                  "videos",
                  "courses",
                  "payments",
                  "profiles",
                  "audit_logs",
                ]
              : s.profile.permissions
          }
        />
      </main>
    );
  } catch (e) {
    return (
      <main id="contenido" className="wrap section page">
        <h1>{t("Acceso administrativo")}</h1>
        <p>
          {e instanceof AppError
            ? t(e.message)
            : t("No se pudo consultar tu cuenta.")}
        </p>
        <a className="primary-link" href="/cuenta">
          {t("Ir a Mi cuenta")}
        </a>
      </main>
    );
  }
}
