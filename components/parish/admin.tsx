"use client";
import { useT } from "@/components/parish/language";

import { useEffect, useState } from "react";
import { AdminField } from "./admin-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
const names: Record<string, string> = {
  schedules: "Horarios",
  announcements: "Avisos",
  videos: "Videos",
  courses: "Cursos",
  lessons: "Lecciones",
  payments: "Inscripciones y pagos",
  profiles: "Colaboradores",
  audit_logs: "Auditoría",
};
const labels: Record<string, string> = {
  title: "Título",
  weekday: "Día semanal (0 lunes–6 domingo; vacío para fecha especial)",
  date: "Fecha especial (vacío para horario semanal)",
  time: "Hora",
  language: "Idioma",
  body: "Contenido",
  published_at: "Fecha de publicación",
  expires_at: "Fecha de vencimiento (opcional)",
  pinned: "Fijar aviso",
  image_id: "Archivo de imagen (ID)",
  description: "Descripción",
  asset_id: "Archivo de video o PDF (ID)",
  thumbnail_id: "Miniatura (ID opcional)",
  published: "Publicar",
  sacrament: "Sacramento",
  price_cents: "Precio en centavos de USD (ej. 2500 = $25.00)",
  tax_included: "Impuestos incluidos",
  course_id: "Curso (ID)",
  kind: "Tipo de lección: text, video o pdf",
  position: "Orden (comienza en 0)",
  question: "Pregunta de evaluación (opcional)",
  options: "Opciones, una por línea",
  correct_answer: "Respuesta correcta (0 primera opción, 1 segunda…)",
  full_name: "Nombre completo",
  role: "Rol: member, content_admin o courses_admin",
  permissions: "Permisos separados por coma",
  revoked: "Revocar acceso",
};
const defaults: Record<string, any> = {
  schedules: {
    title: "Santa Misa",
    weekday: 6,
    date: null,
    time: "",
    language: "Español",
  },
  announcements: {
    title: "",
    body: "",
    published_at: new Date().toISOString(),
    expires_at: null,
    pinned: false,
    image_id: null,
  },
  videos: {
    title: "",
    description: "",
    asset_id: "",
    thumbnail_id: null,
    published: false,
  },
  courses: {
    title: "",
    description: "",
    sacrament: "Formación general",
    price_cents: 2500,
    tax_included: true,
    published: false,
  },
  lessons: {
    course_id: "",
    title: "",
    body: "",
    kind: "text",
    asset_id: null,
    position: 0,
    question: null,
    options: null,
    correct_answer: null,
  },
  profiles: { full_name: "", role: "member", permissions: [], revoked: false },
};
export function Admin({ permissions }: { permissions: string[] }) {
  const t = useT();

  const modules = permissions.includes("courses")
    ? [...permissions, "lessons"]
    : permissions;
  const [module, setModule] = useState(modules[0] ?? ""),
    [rows, setRows] = useState<any[]>([]),
    [assets, setAssets] = useState<any[]>([]),
    [courses, setCourses] = useState<any[]>([]),
    [editing, setEditing] = useState<any>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/${module}`);
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setRows(d);
      if (["videos", "announcements", "lessons"].includes(module)) {
        const m = module === "lessons" ? "courses" : module;
        const ar = await fetch(`/api/admin/${m}/assets`);
        if (ar.ok) setAssets((await ar.json()) as any[]);
      }
      if (module === "lessons") {
        const cr = await fetch("/api/admin/courses");
        if (cr.ok) setCourses((await cr.json()) as any[]);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("Error de conexión."));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (module) void load();
  }, [module]);
  async function remove(id: string) {
    try {
      const r = await fetch(`/api/admin/${module}/${id}`, { method: "DELETE" });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setMessage(t("Registro eliminado."));
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("Error de conexión."));
    }
  }
  return (
    <>
      <Tabs
        value={module}
        onValueChange={(v) => {
          setModule(v);
          setEditing(null);
          setMessage("");
        }}
      >
        <TabsList className="admin-tabs">
          {modules.map((m) => (
            <TabsTrigger value={m} key={m}>
              {t(names[m])}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <p role="status">{message}</p>
      <div className="admin-actions">
        <h2>{t(names[module])}</h2>
        {defaults[module] && module !== "profiles" && (
          <Button
            onClick={() =>
              setEditing({
                ...defaults[module],
                ...(module === "schedules"
                  ? { title: t("Santa Misa"), language: t("Inglés") }
                  : {}),
              })
            }
          >
            {t("Crear")} {t(names[module])}
          </Button>
        )}
        <Button variant="outline" onClick={load} disabled={busy}>
          {t("Actualizar")}
        </Button>
      </div>
      {module === "profiles" && (
        <p>
          {t(
            "El colaborador debe registrarse y verificar su correo. Después podrás asignarle permisos aquí. Las cuentas principales se crean mediante el script de despliegue.",
          )}
        </p>
      )}
      {["videos", "announcements", "lessons"].includes(module) && (
        <form
          className="record form"
          onSubmit={async (e) => {
            e.preventDefault();
            const file = new FormData(e.currentTarget).get("file") as File;
            setBusy(true);
            try {
              const r = await fetch("/api/media/upload", {
                method: "POST",
                headers: {
                  "x-upload-module": module === "lessons" ? "courses" : module,
                  "x-file-name": encodeURIComponent(file.name),
                },
                body: file,
              });
              const d: any = await r.json();
              if (!r.ok) throw Error(d.error);
              setMessage(t("Archivo validado y disponible para seleccionar."));
              await load();
              if (editing)
                setEditing({
                  ...editing,
                  [module === "announcements" ? "image_id" : "asset_id"]: d.id,
                });
            } catch (e) {
              setMessage(e instanceof Error ? e.message : t("Error al subir."));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label htmlFor="upload">{t("Subir archivo (máximo 50 MB)")}</label>
          <Input
            id="upload"
            name="file"
            type="file"
            accept="video/mp4,video/webm,application/pdf,image/png,image/jpeg,image/webp"
            required
          />
          <Button disabled={busy}>{t("Validar y subir")}</Button>
        </form>
      )}
      {editing && (
        <form
          className="record form admin-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const fields = Object.fromEntries(
                Object.keys(defaults[module]).map((k) => [k, editing[k]]),
              );
              const r = await fetch(
                `/api/admin/${module}${editing.id ? `/${editing.id}` : ""}`,
                {
                  method: editing.id ? "PATCH" : "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(fields),
                },
              );
              const d: any = await r.json();
              if (!r.ok) throw Error(d.error);
              setEditing(null);
              setMessage(t("Cambios guardados."));
              await load();
            } catch (e) {
              setMessage(
                e instanceof Error ? e.message : t("No se pudo guardar."),
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <h3>{editing.id ? t("Editar registro") : t("Nuevo registro")}</h3>
          {Object.keys(defaults[module]).map((k) => (
            <AdminField
              key={k}
              field={k}
              editing={editing}
              setEditing={setEditing}
              assets={assets}
              courses={courses}
            />
          ))}
          <Button disabled={busy}>{t("Guardar cambios")}</Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => setEditing(null)}
          >
            {t("Cancelar")}
          </Button>
        </form>
      )}
      {busy ? (
        <p role="status">{t("Cargando…")}</p>
      ) : rows.length ? (
        <div className="admin-records">
          {rows.map((r: any) => (
            <article className="record" key={r.id}>
              <h3>
                {r.title ??
                  r.full_name ??
                  r.profiles?.full_name ??
                  r.action ??
                  r.id}
              </h3>

              {module === "payments" && (
                <p>
                  {r.courses?.title} ·{" "}
                  {
                    (
                      {
                        pending: t("Pendiente"),
                        confirmed: t("Confirmado"),
                        failed: t("Fallido"),
                        refunded: t("Reembolsado"),
                      } as Record<string, string>
                    )[r.status]
                  }{" "}
                  · {r.amount_cents / 100} USD
                  <br />
                  {t("Lecciones completadas:")} {r.completed} {t("de")}{" "}
                  {r.total}
                  <br />
                  {t("Certificado:")} {r.certificate ?? t("Aún no emitido")}
                </p>
              )}
              {module === "audit_logs" && (
                <>
                  <p>
                    {r.created_at} · {r.entity} · Actor:{" "}
                    {r.actor_id ?? t("Sistema")}
                  </p>
                  <pre>{JSON.stringify(r.details, null, 2)}</pre>
                </>
              )}
              {defaults[module] && (
                <div className="actions">
                  <Button variant="outline" onClick={() => setEditing(r)}>
                    {t("Editar")}
                  </Button>
                  {module !== "profiles" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">{t("Eliminar")}</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t("¿Eliminar este registro?")}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t(
                              "El registro dejará de estar disponible. Esta acción quedará registrada en la auditoría.",
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(r.id)}>
                            {t("Eliminar registro")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p>{t("No hay registros en este apartado.")}</p>
      )}
    </>
  );
}
