import { getT } from "@/lib/i18n-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Phone, MapPin, BookOpen, Play } from "lucide-react";
import { parish, days, money } from "@/lib/parish";
import { publicData } from "@/lib/server";
import { Account } from "@/components/parish/account";
import { RichText } from "@/components/parish/rich-text";
import { Verify } from "@/components/parish/verify";
import { formatDate, formatTime } from "@/lib/i18n";

export const dynamic = "force-dynamic";
const sections: Record<string, { title: string; intro: string }> = {
  horarios: {
    title: "Horarios de misas",
    intro: "Encuentra un momento para reunirte con nuestra comunidad.",
  },
  avisos: {
    title: "Avisos parroquiales",
    intro: "Noticias, encuentros y fechas importantes de nuestra parroquia.",
  },
  videos: {
    title: "Videos y homilías",
    intro: "Palabras y momentos para acompañar tu vida de fe.",
  },
  cursos: {
    title: "Formación y cursos",
    intro: "Prepárate para los sacramentos con formación a tu ritmo.",
  },
  parroquia: {
    title: "Nuestra parroquia",
    intro: "Una comunidad de fe en Mendota, California.",
  },
  contacto: {
    title: "Estamos para acompañarte",
    intro: "Comunícate con la oficina parroquial para recibir orientación.",
  },
  cuenta: {
    title: "Mi cuenta",
    intro: "Tu formación, tu progreso y tus certificados en un solo lugar.",
  },
  verificar: {
    title: "Verificar un certificado",
    intro: "Consulta la autenticidad de un folio emitido por la parroquia.",
  },
  privacidad: {
    title: "Aviso de privacidad",
    intro: "Información sobre el tratamiento de tus datos personales.",
  },
  terminos: {
    title: "Términos de los cursos",
    intro: "Información que debes conocer antes de inscribirte.",
  },
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const t = await getT();

  return {
    title: t(sections[(await params).section]?.title ?? "Página no encontrada"),
  };
}
export default async function Section({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const t = await getT();

  const { section } = await params;
  const info = sections[section];
  if (!info) notFound();
  const table = (
    {
      horarios: "schedules",
      avisos: "announcements",
      videos: "videos",
      cursos: "courses",
    } as const
  )[section as "horarios"];
  const data = table ? await publicData(table) : null;
  return (
    <main id="contenido" className="wrap section page">
      <Link href="/" className="breadcrumb">
        {t("Inicio /")} {t(info.title)}
      </Link>
      <p className="eyebrow">OUR LADY OF GUADALUPE · MENDOTA</p>
      <h1>{t(info.title)}</h1>
      <p className="intro">{t(info.intro)}</p>
      {data?.unavailable && (
        <p role="alert" className="notice">
          {t(
            "No podemos cargar la información en este momento. Intenta nuevamente o llama a la oficina parroquial.",
          )}
        </p>
      )}
      {section === "horarios" && (
        <>
          <div className="week-grid">
            {days.map((day, index) => (
              <section key={day}>
                <h3>{t(day)}</h3>
                {data?.rows
                  .filter((r: any) => r.weekday === index && !r.date)
                  .map((r: any) => (
                    <p key={r.id}>
                      <strong>{formatTime(r.time, t.locale)}</strong>
                      <br />
                      {t(r.title)} · {t(r.language)}
                    </p>
                  ))}
                {!data?.rows.some(
                  (r: any) => r.weekday === index && !r.date,
                ) && <p>{t("Por confirmar")}</p>}
              </section>
            ))}
          </div>
          <h2 className="subheading">{t("Celebraciones especiales")}</h2>
          {data?.rows
            .filter((r: any) => r.date)
            .map((r: any) => (
              <div className="empty-panel" key={r.id}>
                <CalendarDays />
                <p>
                  <strong>{r.title}</strong>
                  <br />
                  {formatDate(r.date, t.locale)} ·{" "}
                  {formatTime(r.time, t.locale)} · {t(r.language)}
                </p>
              </div>
            ))}
          {!data?.rows.some((r: any) => r.date) && (
            <p>
              {t(
                "Las misas especiales se publicarán aquí cuando estén programadas.",
              )}
            </p>
          )}
          <p>
            {t("Para confirmar una celebración, llama al")}{" "}
            <a href={parish.phoneHref}>{parish.phone}</a>.
          </p>
        </>
      )}
      {section === "avisos" && (
        <div className="record-grid">
          {data?.rows.map((r: any) => (
            <article className="record" key={r.id}>
              {r.image_id && <img src={`/api/media/${r.image_id}`} alt="" />}
              <p className="eyebrow">
                {r.pinned ? t("AVISO DESTACADO") : t("COMUNIDAD")}
              </p>
              <h2>{r.title}</h2>
              <time>{formatDate(r.published_at, t.locale)}</time>
              <RichText text={r.body} />
            </article>
          ))}
          {!data?.rows.length && !data?.unavailable && (
            <Empty
              title={t("Aún no hay avisos publicados")}
              text={t(
                "Vuelve pronto para consultar las noticias de nuestra comunidad.",
              )}
            />
          )}
        </div>
      )}
      {section === "videos" && (
        <div className="record-grid">
          {data?.rows.map((r: any) => (
            <article className="record" key={r.id}>
              <video
                controls
                preload="metadata"
                src={`/api/media/${r.asset_id}`}
                poster={
                  r.thumbnail_id ? `/api/media/${r.thumbnail_id}` : undefined
                }
                aria-label={r.title}
              />
              <h2>{r.title}</h2>
              <p>{r.description}</p>
            </article>
          ))}
          {!data?.rows.length && !data?.unavailable && (
            <Empty
              title={t("Nuestras reflexiones, próximamente")}
              text={t(
                "Las homilías y videos de la comunidad estarán disponibles en este espacio.",
              )}
            />
          )}
        </div>
      )}
      {section === "cursos" && (
        <>
          <div className="record-grid">
            {data?.rows.map((r: any) => (
              <article className="record" key={r.id}>
                <BookOpen />
                <p className="eyebrow">{t(r.sacrament)}</p>
                <h2>{r.title}</h2>
                <p>{r.description}</p>
                <p>
                  <strong>{money(r.price_cents, t.locale)} USD</strong>{" "}
                  {t("· Pago único")}
                  <br />
                  {r.tax_included
                    ? t("Impuestos incluidos")
                    : t("Impuestos calculados al pagar")}
                </p>
                <Link className="primary-link" href={`/cursos/${r.id}`}>
                  {t("Ver curso")}
                </Link>
              </article>
            ))}
            {!data?.rows.length && !data?.unavailable && (
              <Empty
                title={t("Estamos preparando nuestra formación")}
                text={t(
                  "Los cursos aparecerán aquí cuando la parroquia los publique. No hay inscripciones ni cobros habilitados todavía.",
                )}
              />
            )}
          </div>
          <p className="notice">
            {t(
              "El certificado acredita la formación del curso. La recepción del sacramento requiere la autorización de la parroquia.",
            )}
          </p>
        </>
      )}
      {section === "parroquia" && (
        <div className="two-column">
          <article className="record">
            <p className="eyebrow">{t("BIENVENIDOS")}</p>
            <h2>{parish.name}</h2>
            <p>
              {t("Nos encontramos en")} {parish.location}{" "}
              {t(
                "para celebrar nuestra fe católica y acompañarnos en la vida de comunidad.",
              )}
            </p>
            <h3>{t("Párroco")}</h3>
            <p>
              {t("Padre")} {parish.priest}
            </p>
            <h3>{t("Historia y misión")}</h3>
            <p>
              {t(
                "Próximamente compartiremos la historia de la parroquia y su misión pastoral.",
              )}
            </p>
          </article>
          <article className="record">
            <h2>{t("Acércate a la comunidad")}</h2>
            <p>
              {t(
                "La oficina parroquial puede orientarte sobre celebraciones, preparación para los sacramentos y actividades.",
              )}
            </p>
            <Link className="primary-link" href="/contacto">
              {t("Contactar a la parroquia")}
            </Link>
          </article>
        </div>
      )}
      {section === "contacto" && (
        <div className="two-column">
          <article className="record">
            <Phone />
            <h2>{t("Oficina parroquial")}</h2>
            <a className="contact-phone" href={parish.phoneHref}>
              {parish.phone}
            </a>
            <p>
              {t(
                "Consulta horarios, trámites y preparación para los sacramentos.",
              )}
            </p>
            <MapPin />
            <h3>{parish.location}</h3>
            <p>
              {t(
                "Dirección postal y horario de oficina pendientes de confirmar.",
              )}
            </p>
            <a
              className="text-link"
              href="https://www.google.com/maps/search/?api=1&query=Our+Lady+of+Guadalupe+Catholic+Church+Mendota+California"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("Buscar la parroquia en el mapa")}
            </a>
          </article>
          <iframe
            className="map"
            loading="lazy"
            title={t("Mapa de Mendota, California")}
            referrerPolicy="no-referrer"
            src="https://www.google.com/maps?q=Mendota%2C%20California&output=embed"
          />
        </div>
      )}
      {section === "cuenta" && <Account />}
      {section === "verificar" && <Verify />}
      {section === "privacidad" && (
        <article className="legal">
          <p className="notice">
            {t(
              "Borrador pendiente de aprobación por la parroquia antes de habilitar registros y pagos.",
            )}
          </p>
          <h2>{t("Responsable y contacto")}</h2>
          <p>
            {parish.name}, {parish.location}.{" "}
            {t("Para consultas sobre tus datos, llama al")} {parish.phone}.
          </p>
          <h2>{t("Información y finalidades")}</h2>
          <p>
            {t(
              "Al habilitarse la plataforma se tratarán nombre, correo electrónico, datos de acceso, inscripciones, progreso, pagos y certificados para gestionar tu cuenta y formación. La parroquia no recibe ni almacena números de tarjeta.",
            )}
          </p>
          <h2>{t("Proveedores y protección")}</h2>
          <p>
            {t(
              "Los servicios de autenticación, almacenamiento y pago procesarán la información necesaria para prestar sus funciones. Se definirán sus identidades, plazos de conservación y condiciones antes de la apertura del servicio.",
            )}
          </p>
          <h2>{t("Tus solicitudes")}</h2>
          <p>
            {t(
              "Puedes contactar a la oficina para solicitar información, correcciones o eliminación de tus datos, según la normativa aplicable y las obligaciones de conservación.",
            )}
          </p>
          <h2>{t("Menores de edad")}</h2>
          <p>
            {t(
              "No se habilitarán registros de menores hasta que la parroquia establezca el procedimiento y consentimiento correspondiente.",
            )}
          </p>
          <h2>Cookies</h2>
          <p>
            {t(
              "Guardamos tu preferencia de idioma durante un año en este navegador.",
            )}
          </p>
          <p>
            {t(
              "La cuenta utiliza cookies esenciales de sesión y seguridad. El mapa externo puede enviar datos a Google; también puedes consultar la ubicación por teléfono.",
            )}
          </p>
        </article>
      )}
      {section === "terminos" && (
        <article className="legal">
          <p className="notice">
            {t(
              "Condiciones pendientes de aprobación. Los pagos permanecerán deshabilitados hasta que se configure y apruebe esta política.",
            )}
          </p>
          <h2>{t("Inscripción y pago único")}</h2>
          <p>
            {t(
              "Los precios se mostrarán en dólares estadounidenses (USD). El pago se realizará en el sitio seguro de la pasarela; el acceso se activará únicamente cuando se confirme el cobro.",
            )}
          </p>
          <h2>{t("Formación y certificados")}</h2>
          <p>
            {t(
              "Debes completar las lecciones y aprobar las evaluaciones requeridas. El certificado no sustituye la autorización pastoral para recibir un sacramento.",
            )}
          </p>
          <h2>{t("Reembolsos")}</h2>
          <p>
            {t(
              "La parroquia debe definir el plazo, requisitos y excepciones de su política de reembolsos antes de habilitar inscripciones. Para consultas llama al",
            )}
            {parish.phone}
            {t(
              ". Los reembolsos confirmados revocarán el acceso y la validez del certificado asociado.",
            )}
          </p>
          <h2>{t("Uso de la cuenta")}</h2>
          <p>
            {t(
              "La cuenta es personal. No compartas tus credenciales ni los materiales del curso sin autorización.",
            )}
          </p>
        </article>
      )}
    </main>
  );
}
async function Empty({ title, text }: { title: string; text: string }) {
  const t = await getT();

  return (
    <div className="empty-panel">
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  );
}
