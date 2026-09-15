import { getT } from "@/lib/i18n-server";
import { publicData } from "@/lib/server";
export async function HomeNews() {
  const t = await getT();

  const { rows, unavailable } = await publicData("announcements");
  return rows.length ? (
    <div className="record-grid">
      {rows.slice(0, 3).map((r: any) => (
        <article className="record" key={r.id}>
          <p className="eyebrow">
            {r.pinned ? t("DESTACADO") : t("VIDA PARROQUIAL")}
          </p>
          <h3>{r.title}</h3>
          <p>{r.body.replace(/[#*_>]/g, "").slice(0, 180)}</p>
          <a className="text-link" href="/avisos">
            {t("Leer aviso")}
          </a>
        </article>
      ))}
    </div>
  ) : (
    <div className="empty-panel">
      <div>
        <h3>
          {unavailable
            ? t("No podemos cargar los avisos")
            : t("Próximamente, nuestros avisos")}
        </h3>
        <p>
          {unavailable
            ? t("Intenta nuevamente más tarde.")
            : t(
                "Las fechas importantes y noticias aparecerán aquí cuando la parroquia las publique.",
              )}
        </p>
      </div>
    </div>
  );
}
