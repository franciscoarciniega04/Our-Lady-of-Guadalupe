import { getT } from "@/lib/i18n-server";
import Link from "next/link";
import {
  CalendarDays,
  BookOpen,
  ArrowUpRight,
  Play,
  Church,
} from "lucide-react";
import { HomeNews } from "@/components/parish/home-news";
export const dynamic = "force-dynamic";
export default async function Home() {
  const t = await getT();

  return (
    <main id="contenido">
      <section className="welcome">
        <div className="wrap hero-grid">
          <div>
            <p className="eyebrow">{t("FE · ENCUENTRO · COMUNIDAD")}</p>
            <h1>
              {t("Un lugar para creer.")}
              <br />
              <em>{t("Una comunidad para crecer.")}</em>
            </h1>
            <p className="intro">
              {t(
                "Nos reunimos para celebrar la fe, acompañarnos y servir. Encuentra aquí la vida de nuestra comunidad y un espacio para seguir tu camino de formación.",
              )}
            </p>
            <div className="actions">
              <Link className="primary-link" href="/horarios">
                {t("Consultar horarios")} <ArrowUpRight size={18} />
              </Link>
              <Link className="text-link" href="/parroquia">
                {t("Conoce la parroquia")}
              </Link>
            </div>
          </div>
          <aside className="sunday">
            <Church size={38} strokeWidth={1} />
            <p className="eyebrow">{t("LA VIDA EN COMUNIDAD")}</p>
            <h2>
              {t("Nos encontramos")}
              <br />
              {t("en la Eucaristía.")}
            </h2>
            <p>
              {t(
                "Consulta las celebraciones semanales y las misas especiales de nuestra parroquia.",
              )}
            </p>
            <Link href="/horarios">
              {t("Ver horarios de misas")} <ArrowUpRight size={20} />
            </Link>
          </aside>
        </div>
      </section>
      <section className="wrap shortcuts" aria-label={t("Accesos principales")}>
        {[
          {
            href: "/horarios",
            icon: CalendarDays,
            title: t("Horarios de misas"),
            text: t("Encuentra tu próxima celebración"),
          },
          {
            href: "/avisos",
            icon: Church,
            title: t("Avisos parroquiales"),
            text: t("Mantente cerca de tu comunidad"),
          },
          {
            href: "/videos",
            icon: Play,
            title: t("Videos y homilías"),
            text: t("Un momento para reflexionar"),
          },
          {
            href: "/cursos",
            icon: BookOpen,
            title: t("Formación y cursos"),
            text: t("Da el siguiente paso en tu fe"),
          },
        ].map(({ href, icon: Icon, title, text }) => (
          <Link href={href} key={href}>
            <Icon size={25} strokeWidth={1.5} />
            <h3>{title}</h3>
            <p>{text}</p>
            <ArrowUpRight className="corner" size={18} />
          </Link>
        ))}
      </section>
      <section className="wrap section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("EL DÍA A DÍA DE NUESTRA PARROQUIA")}</p>
            <h2>{t("Una comunidad viva")}</h2>
          </div>
          <Link className="text-link" href="/avisos">
            {t("Todos los avisos")} <ArrowUpRight size={18} />
          </Link>
        </div>
        <HomeNews />
      </section>
      <section className="formation">
        <div className="wrap formation-grid">
          <div>
            <p className="eyebrow">{t("FORMACIÓN PARA VIVIR LA FE")}</p>
            <h2>
              {t("Aprender también")}
              <br />
              {t("es un acto de fe.")}
            </h2>
          </div>
          <div>
            <p>
              {t(
                "Prepárate para los sacramentos con lecciones que puedes seguir a tu ritmo. Consulta el contenido, los requisitos y el costo de cada curso antes de inscribirte.",
              )}
            </p>
            <Link className="primary-link" href="/cursos">
              {t("Explorar los cursos")} <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
      </section>
      <section className="wrap section">
        <p className="eyebrow">{t("NUESTRA PARROQUIA")}</p>
        <h2>
          Our Lady of Guadalupe
          <br />
          Catholic Church Mendota
        </h2>
        <p>{t("Mendota, California · Padre Jorge Alberto Robles Cuevas")}</p>
        <a className="text-link" href="tel:+15596554237">
          +1 559-655-4237
        </a>
      </section>
    </main>
  );
}
