"use client";
import { useT } from "@/components/parish/language";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import { days } from "@/lib/parish";
const titles: Record<string, string> = {
  title: "Título",
  weekday: "Día de la semana",
  date: "Fecha de celebración especial",
  time: "Hora",
  language: "Idioma",
  body: "Contenido (permite Markdown)",
  published_at: "Publicar a partir de",
  expires_at: "Vencimiento (opcional)",
  pinned: "Fijar este aviso",
  image_id: "Imagen del aviso",
  description: "Descripción",
  asset_id: "Material adjunto",
  thumbnail_id: "Miniatura",
  published: "Visible en la web",
  sacrament: "Sacramento",
  price_cents: "Precio en dólares (USD)",
  tax_included: "El precio incluye impuestos",
  course_id: "Curso",
  kind: "Tipo de lección",
  position: "Número de lección",
  question: "Pregunta de evaluación (opcional)",
  options: "Opciones de respuesta, una por línea",
  correct_answer: "Respuesta correcta",
  full_name: "Nombre completo",
  role: "Rol del colaborador",
  permissions: "Apartados que puede administrar",
  revoked: "Revocar acceso a la cuenta",
};
export function AdminField({
  field: k,
  editing,
  setEditing,
  assets,
  courses,
}: {
  field: string;
  editing: any;
  setEditing: (v: any) => void;
  assets: any[];
  courses: any[];
}) {
  const t = useT();

  const value = editing[k];
  const update = (v: any) =>
    setEditing({
      ...editing,
      [k]: v,
      ...(k === "weekday" && v !== null ? { date: null } : {}),
      ...(k === "date" && v ? { weekday: null } : {}),
    });
  if (typeof value === "boolean")
    return (
      <label className="choice">
        <Checkbox checked={value} onCheckedChange={(v) => update(v === true)} />
        {t(titles[k])}
      </label>
    );
  if (k === "permissions")
    return (
      <fieldset>
        <legend>{t(titles[k])}</legend>
        {Object.entries({
          schedules: "Horarios",
          announcements: "Avisos",
          videos: "Videos",
          courses: "Cursos",
          payments: "Inscripciones y pagos",
        }).map(([permission, label]) => (
          <label key={permission} className="choice">
            <Checkbox
              checked={value?.includes(permission)}
              onCheckedChange={(v) =>
                update(
                  v
                    ? [...value, permission]
                    : value.filter((p: string) => p !== permission),
                )
              }
            />
            {t(label)}
          </label>
        ))}
      </fieldset>
    );
  let choices: Array<[string, string]> | undefined;
  if (k === "weekday")
    choices = [
      ["", "Celebración con fecha específica"],
      ...days.map((d, i) => [String(i), d] as [string, string]),
    ];
  if (k === "role")
    choices = [
      ["member", "Feligrés"],
      ["content_admin", "Administrador de contenido"],
      ["courses_admin", "Administrador de cursos y pagos"],
    ];
  if (k === "kind")
    choices = [
      ["text", "Texto"],
      ["video", "Video"],
      ["pdf", "Documento PDF"],
    ];
  if (k === "sacrament")
    choices = [
      "Bautismo",
      "Primera comunión",
      "Confirmación",
      "Matrimonio",
      "Formación general",
    ].map((v) => [v, v]);
  if (k === "course_id")
    choices = [
      ["", "Selecciona un curso"],
      ...courses.map((c) => [c.id, c.title] as [string, string]),
    ];
  if (["asset_id", "image_id", "thumbnail_id"].includes(k))
    choices = [
      ["", "Sin archivo"],
      ...assets.map(
        (a) =>
          [a.id, a.filename ?? `${a.mime} · ${a.created_at.slice(0, 10)}`] as [
            string,
            string,
          ],
      ),
    ];
  if (k === "correct_answer")
    choices = [
      ["", "Sin evaluación"],
      ...(editing.options ?? []).map(
        (v: string, i: number) =>
          [String(i), `${i + 1}. ${v}`] as [string, string],
      ),
    ];
  if (choices)
    return (
      <label>
        {t(titles[k])}
        <NativeSelect
          value={value ?? ""}
          onChange={(e) =>
            update(
              e.target.value === ""
                ? null
                : ["weekday", "correct_answer"].includes(k)
                  ? Number(e.target.value)
                  : e.target.value,
            )
          }
        >
          {choices.map(([v, label]) => (
            <NativeSelectOption value={v} key={v}>
              {t(label)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>
    );
  if (["body", "description", "options"].includes(k))
    return (
      <label>
        {t(titles[k])}
        <Textarea
          rows={k === "body" ? 8 : 4}
          value={Array.isArray(value) ? value.join("\n") : (value ?? "")}
          onChange={(e) =>
            update(
              k === "options"
                ? e.target.value
                  ? e.target.value.split("\n")
                  : null
                : e.target.value,
            )
          }
        />
      </label>
    );
  if (["published_at", "expires_at"].includes(k)) {
    const local = value
      ? new Date(
          new Date(value).getTime() -
            new Date(value).getTimezoneOffset() * 60000,
        )
          .toISOString()
          .slice(0, 16)
      : "";
    return (
      <label>
        {t(titles[k])}
        <Input
          type="datetime-local"
          value={local}
          required={k === "published_at"}
          onChange={(e) =>
            update(
              e.target.value ? new Date(e.target.value).toISOString() : null,
            )
          }
        />
      </label>
    );
  }
  return (
    <label>
      {t(titles[k])}
      <Input
        type={
          k === "date"
            ? "date"
            : k === "time"
              ? "time"
              : ["price_cents", "position"].includes(k)
                ? "number"
                : "text"
        }
        step={k === "price_cents" ? "0.01" : undefined}
        min={k === "price_cents" ? 0.5 : k === "position" ? 1 : undefined}
        value={
          k === "price_cents"
            ? value / 100
            : k === "position"
              ? value + 1
              : (value ?? "")
        }
        onChange={(e) =>
          update(
            k === "price_cents"
              ? Math.round(Number(e.target.value) * 100)
              : k === "position"
                ? Number(e.target.value) - 1
                : e.target.value || null,
          )
        }
      />
    </label>
  );
}
