import { getT } from "@/lib/i18n-server";
import { notFound } from "next/navigation";
import { configured, db } from "@/lib/server";
import { money } from "@/lib/parish";
import { CourseActions } from "@/components/parish/course";
export const dynamic = "force-dynamic";
export default async function Course({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getT();

  const { id } = await params;
  if (!configured() || !/^[\da-f-]{36}$/i.test(id)) notFound();
  const [course] = await db(
    `courses?id=eq.${id}&published=eq.true&select=id,title,description,sacrament,price_cents,tax_included`,
  );
  if (!course) notFound();
  return (
    <main id="contenido" className="wrap section page">
      <a href="/cursos" className="breadcrumb">
        {t("Cursos /")} {course.title}
      </a>
      <p className="eyebrow">{t(course.sacrament)}</p>
      <h1>{course.title}</h1>
      <p className="intro">{course.description}</p>
      <p>
        <strong>{money(course.price_cents, t.locale)} USD</strong>{" "}
        {t("· Pago único ·")}{" "}
        {course.tax_included
          ? t("Impuestos incluidos")
          : t("Impuestos calculados al pagar")}
      </p>
      <CourseActions id={id} />
    </main>
  );
}
