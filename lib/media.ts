import { supabaseServiceHeaders } from "./supabase-headers.mjs";
import { z } from "zod";
import { AppError, db, permitted, secret, session } from "./server";
const id = z.string().uuid();
function detect(b: Uint8Array) {
  const text = (a: number, n: number) =>
    String.fromCharCode(...b.slice(a, a + n));
  if (text(0, 5) === "%PDF-") return "application/pdf";
  if (b[0] === 137 && text(1, 3) === "PNG") return "image/png";
  if (b[0] === 255 && b[1] === 216 && b[2] === 255) return "image/jpeg";
  if (text(0, 4) === "RIFF" && text(8, 4) === "WEBP") return "image/webp";
  if (text(4, 4) === "ftyp") return "video/mp4";
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3)
    return "video/webm";
  return null;
}
export async function mediaRoute(request: Request, path: string[]) {
  if (request.method === "POST" && path[0] === "upload") {
    const module = request.headers.get("x-upload-module");
    if (!["videos", "announcements", "courses"].includes(module ?? ""))
      throw new AppError(400, "Selecciona el apartado del archivo.");
    const s = await permitted(module!);
    const max = 50 * 1024 * 1024;
    const length = Number(request.headers.get("content-length"));
    if (!length || length > max)
      throw new AppError(413, "El archivo debe pesar como máximo 50 MB.");
    const data = new Uint8Array(await request.arrayBuffer());
    if (data.length > max) throw new AppError(413, "Archivo demasiado grande.");
    const mime = detect(data);
    if (!mime)
      throw new AppError(
        400,
        "Formato no permitido. Usa MP4, WebM, PDF, PNG, JPG o WebP.",
      );
    // The scanner must return clean only after magic-byte/container validation and antivirus scan.
    const scan = await fetch(secret("FILE_SCANNER_URL"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret("FILE_SCANNER_TOKEN")}`,
        "Content-Type": mime,
      },
      body: data,
    });
    if (!scan.ok)
      throw new AppError(
        503,
        "La validación de archivos no está disponible. No se guardó el archivo.",
      );
    const verdict = (await scan.json()) as any;
    if (verdict.clean !== true || verdict.mime !== mime)
      throw new AppError(400, "El archivo no superó la revisión de seguridad.");
    const assetId = crypto.randomUUID();
    const storagePath = `${module}/${assetId}`;
    const upload = await fetch(
      `${secret("SUPABASE_URL")}/storage/v1/object/parish-media/${storagePath}`,
      {
        method: "POST",
        headers: {
          ...supabaseServiceHeaders(secret("SUPABASE_SERVICE_ROLE_KEY")),
          "Content-Type": mime,
        },
        body: data,
      },
    );
    if (!upload.ok)
      throw new AppError(
        503,
        "No se pudo guardar el archivo. Inténtalo otra vez.",
      );
    await db("assets", {
      method: "POST",
      body: JSON.stringify({
        id: assetId,
        storage_path: storagePath,
        mime,
        size: data.length,
        status: "clean",
        owner_id: s.user.id,
        filename: decodeURIComponent(
          request.headers.get("x-file-name") ?? "Archivo",
        ).slice(0, 180),
      }),
    });
    return Response.json({
      id: assetId,
      message: "Archivo validado y guardado.",
    });
  }
  if (request.method !== "GET") throw new AppError(405, "Método no permitido.");
  const assetId = id.parse(path[0]);
  const [asset] = await db(`assets?id=eq.${assetId}&status=eq.clean&select=*`);
  if (!asset) throw new AppError(404, "Archivo no encontrado.");
  const now = encodeURIComponent(new Date().toISOString());
  const [videos, announcements] = await Promise.all([
    db(
      `videos?published=eq.true&or=(asset_id.eq.${assetId},thumbnail_id.eq.${assetId})&select=id`,
    ),
    db(
      `announcements?image_id=eq.${assetId}&published_at=lte.${now}&or=(expires_at.is.null,expires_at.gt.${now})&select=id`,
    ),
  ]);
  if (!videos.length && !announcements.length) {
    const s = await session();
    const lessons = await db(`lessons?asset_id=eq.${assetId}&select=course_id`);
    let allowed = false;
    for (const lesson of lessons) {
      const enrollments = await db(
        `enrollments?user_id=eq.${s.user.id}&course_id=eq.${lesson.course_id}&status=eq.active&select=id,payments(status)`,
      );
      if (enrollments.some((e: any) => e.payments?.status === "confirmed"))
        allowed = true;
    }
    if (!allowed) {
      const module = asset.storage_path.split("/")[0];
      await permitted(module);
    }
  }
  const r = await fetch(
    `${secret("SUPABASE_URL")}/storage/v1/object/sign/parish-media/${asset.storage_path}`,
    {
      method: "POST",
      headers: {
        ...supabaseServiceHeaders(secret("SUPABASE_SERVICE_ROLE_KEY")),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: 120 }),
    },
  );
  if (!r.ok) throw new AppError(503, "No se pudo cargar el archivo.");
  const d = (await r.json()) as any;
  return Response.redirect(
    `${secret("SUPABASE_URL")}/storage/v1${d.signedURL}`,
    302,
  );
}
