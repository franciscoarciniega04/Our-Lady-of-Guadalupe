import { z } from "zod";
import { AppError, db, permitted, rpc, authCall, secret } from "./server";
import { jsonBody } from "./security";
const id = z.string().uuid();
const title = z.string().trim().min(2).max(160);
const text = z.string().max(30000);
const nullableId = id.nullable().optional();
export const schemas = {
  schedules: z
    .object({
      title,
      weekday: z.number().int().min(0).max(6).nullable(),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .nullable(),
      time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
      language: z.string().min(2).max(50),
    })
    .refine(
      (v) => (v.weekday !== null) !== (v.date !== null),
      "Selecciona un día o una fecha especial.",
    ),
  announcements: z
    .object({
      title,
      body: text.min(1),
      published_at: z.string().datetime(),
      expires_at: z.string().datetime().nullable(),
      pinned: z.boolean(),
      image_id: nullableId,
    })
    .refine((v) => !v.expires_at || v.expires_at > v.published_at),
  videos: z.object({
    title,
    description: text,
    asset_id: id,
    thumbnail_id: nullableId,
    published: z.boolean(),
  }),
  courses: z.object({
    title,
    description: text.min(1),
    sacrament: z.enum([
      "Bautismo",
      "Primera comunión",
      "Confirmación",
      "Matrimonio",
      "Formación general",
    ]),
    price_cents: z.number().int().min(50).max(1000000),
    tax_included: z.boolean(),
    published: z.boolean(),
  }),
  lessons: z
    .object({
      course_id: id,
      title,
      body: text,
      kind: z.enum(["text", "video", "pdf"]),
      asset_id: nullableId,
      position: z.number().int().min(0).max(1000),
      question: z.string().max(1000).nullable(),
      options: z.array(z.string().min(1).max(500)).min(2).max(8).nullable(),
      correct_answer: z.number().int().min(0).max(7).nullable(),
    })
    .refine(
      (v) =>
        !v.question ||
        (v.options &&
          v.correct_answer !== null &&
          v.correct_answer < v.options.length),
    ),
  profiles: z.object({
    full_name: z.string().min(3).max(100),
    role: z.enum(["member", "content_admin", "courses_admin"]),
    permissions: z.array(
      z.enum(["schedules", "announcements", "videos", "courses", "payments"]),
    ),
    revoked: z.boolean(),
  }),
};
export async function adminRoute(request: Request, path: string[]) {
  const table = path[0];
  const permission =
    table === "lessons"
      ? "courses"
      : table === "profiles" || table === "audit_logs"
        ? "super_admin"
        : table;
  const s = await permitted(permission);
  if (request.method === "GET") {
    if (
      path[1] === "assets" &&
      ["courses", "videos", "announcements"].includes(table)
    )
      return Response.json(
        await db(
          `assets?status=eq.clean&storage_path=like.${table}%2F*&select=id,filename,mime,created_at&order=created_at.desc`,
        ),
      );
    if (table === "payments") {
      const [payments, certificates, progress, lessons] = await Promise.all([
        db(
          "payments?select=*,profiles(full_name),courses(title)&order=created_at.desc&limit=500",
        ),
        db("certificates?select=user_id,course_id,revoked,folio"),
        db("lesson_progress?select=user_id,lesson_id"),
        db("lessons?select=id,course_id"),
      ]);
      return Response.json(
        payments.map((p: any) => {
          const ids = lessons
            .filter((l: any) => l.course_id === p.course_id)
            .map((l: any) => l.id);
          const certificate = certificates.find(
            (c: any) =>
              c.user_id === p.user_id &&
              c.course_id === p.course_id &&
              !c.revoked,
          );
          return {
            ...p,
            completed: progress.filter(
              (pr: any) =>
                pr.user_id === p.user_id && ids.includes(pr.lesson_id),
            ).length,
            total: ids.length,
            certificate: certificate?.folio ?? null,
          };
        }),
      );
    }
    if (table === "audit_logs")
      return Response.json(
        await db("audit_logs?select=*&order=created_at.desc&limit=200"),
      );
    if (!(table in schemas)) throw new AppError(404, "Apartado no encontrado.");
    return Response.json(await db(`${table}?select=*&limit=500`));
  }
  if (!(table in schemas)) throw new AppError(404, "Apartado no encontrado.");
  const recordId = path[1] ? id.parse(path[1]) : null;
  if (table === "profiles" && recordId === s.user.id)
    throw new AppError(
      400,
      "No puedes revocar ni cambiar tus propios permisos.",
    );
  if (table === "profiles" && recordId) {
    const [target] = await db(`profiles?id=eq.${recordId}&select=role`);
    if (target?.role === "super_admin")
      throw new AppError(
        403,
        "Las cuentas principales se administran desde el despliegue.",
      );
  }
  if (request.method === "DELETE") {
    if (!recordId || table === "profiles")
      throw new AppError(400, "Revoca la cuenta en lugar de eliminarla.");
    await rpc("admin_write", {
      p_actor: s.user.id,
      p_table: table,
      p_action: "delete",
      p_id: recordId,
      p_data: {},
    });
    return Response.json({ message: "Registro eliminado." });
  }
  const data = schemas[table as keyof typeof schemas].parse(
    await jsonBody(request),
  );
  if (table === "profiles" && !recordId)
    throw new AppError(
      400,
      "La persona debe registrarse y verificar su correo antes de asignar permisos.",
    );
  if (table === "courses" && (data as any).published) {
    if (!recordId)
      throw new AppError(
        400,
        "Guarda primero el curso como borrador y añade sus lecciones.",
      );
    const lessons = await db(`lessons?course_id=eq.${recordId}&select=id`);
    if (!lessons.length)
      throw new AppError(400, "Añade al menos una lección antes de publicar.");
  }
  if (table === "lessons") {
    const [c] = await db(
      `courses?id=eq.${(data as any).course_id}&select=published`,
    );
    if (c?.published)
      throw new AppError(
        400,
        "Retira la publicación del curso antes de cambiar sus lecciones.",
      );
  }
  for (const field of ["asset_id", "image_id", "thumbnail_id"]) {
    const asset = (data as any)[field];
    if (asset) {
      const [a] = await db(
        `assets?id=eq.${asset}&status=eq.clean&select=id,storage_path,mime`,
      );
      const expectedModule = table === "lessons" ? "courses" : table;
      if (!a || !a.storage_path.startsWith(`${expectedModule}/`))
        throw new AppError(
          400,
          "El archivo debe estar validado antes de publicarlo.",
        );
    }
  }
  const saved = await rpc("admin_write", {
    p_actor: s.user.id,
    p_table: table,
    p_action: recordId ? "update" : "insert",
    p_id: recordId,
    p_data: data,
  });
  return Response.json(saved, { status: recordId ? 200 : 201 });
}
