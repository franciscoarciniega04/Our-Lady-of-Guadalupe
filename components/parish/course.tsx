"use client";
import { useT } from "@/components/parish/language";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
export function CourseActions({ id }: { id: string }) {
  const t = useT();

  const [content, setContent] = useState<any>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const r = await fetch(`/api/courses/${id}/content`);
    if (r.ok) setContent(await r.json());
  }
  useEffect(() => {
    void load();
  }, [id]);
  async function act(path: string, body: unknown) {
    setBusy(true);
    try {
      const r = await fetch(`/api/courses/${id}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      if (d.url) {
        window.location.assign(d.url);
        return;
      }
      setMessage(d.message ?? t("Progreso guardado."));
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("Error de conexión."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p role="status">{message}</p>
      {content ? (
        <>
          <h2>{t("Tu formación")}</h2>
          {content.lessons.map((lesson: any) => (
            <article className="record" key={lesson.id}>
              <p className="eyebrow">
                {t("LECCIÓN")} {lesson.position + 1}
                {content.completed.includes(lesson.id)
                  ? t(" · COMPLETADA")
                  : ""}
              </p>
              <h3>{lesson.title}</h3>
              <div
                className="rich-text"
                dangerouslySetInnerHTML={{ __html: lesson.html }}
              />
              {lesson.asset_id &&
                (lesson.kind === "video" ? (
                  <video controls src={`/api/media/${lesson.asset_id}`} />
                ) : (
                  <a href={`/api/media/${lesson.asset_id}`}>
                    {t("Descargar material PDF")}
                  </a>
                ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void act("complete", {
                    lessonId: lesson.id,
                    answer: f.get("answer"),
                  });
                }}
              >
                {lesson.question && (
                  <fieldset>
                    <legend>{lesson.question}</legend>
                    {lesson.options.map((o: string, i: number) => (
                      <label className="choice" key={i}>
                        <input type="radio" name="answer" value={i} required />
                        {o}
                      </label>
                    ))}
                  </fieldset>
                )}
                <Button
                  disabled={busy || content.completed.includes(lesson.id)}
                >
                  {content.completed.includes(lesson.id)
                    ? t("Lección completada")
                    : t("Completar lección")}
                </Button>
              </form>
            </article>
          ))}
        </>
      ) : (
        <>
          <p>
            {t(
              "Inicia sesión con tu correo verificado para inscribirte. El acceso se habilita tras confirmar el pago.",
            )}
          </p>
          <Button disabled={busy} onClick={() => act("checkout", {})}>
            {busy ? t("Preparando pago…") : t("Inscribirme y pagar")}
          </Button>
          <p>
            <a href="/cuenta">{t("Iniciar sesión o crear una cuenta")}</a>
          </p>
        </>
      )}
    </>
  );
}
