import { supabaseServiceHeaders } from "./supabase-headers.mjs";
import { z } from "zod";
import { AppError, db, rpc, secret, session } from "./server";
import { jsonBody, legalReady, limit } from "./security";
import { stripe } from "./stripe";
import { certificatePdf } from "./certificate.mjs";
import { getT } from "./i18n-server";
import { richText } from "./rich-text.mjs";
import { parish } from "./parish";
const id = z.string().uuid();
export async function courseRoute(request: Request, path: string[]) {
  const courseId = id.parse(path[0]);
  const action = path[1];
  const s = await session();
  if (action === "checkout" && request.method === "POST") {
    legalReady();
    if (!s.user.email_confirmed_at)
      throw new AppError(403, "Verifica tu correo electrónico antes de pagar.");
    await limit(`checkout:${s.user.id}`, 5);
    const [course] = await db(
      `courses?id=eq.${courseId}&published=eq.true&select=*`,
    );
    if (!course) throw new AppError(404, "Curso no disponible.");
    const enrollment = await db(
      `enrollments?user_id=eq.${s.user.id}&course_id=eq.${courseId}&status=eq.active&select=id`,
    );
    if (enrollment.length)
      throw new AppError(409, "Ya tienes acceso a este curso.");
    let [payment] = await db(
      `payments?user_id=eq.${s.user.id}&course_id=eq.${courseId}&status=eq.pending&select=*`,
    );
    if (!payment) {
      [payment] = await db("payments", {
        method: "POST",
        body: JSON.stringify({
          user_id: s.user.id,
          course_id: courseId,
          amount_cents: course.price_cents,
          currency: "usd",
        }),
      });
    }
    const params: Record<string, string> = {
      mode: "payment",
      customer_email: s.user.email,
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(payment.amount_cents),
      "line_items[0][price_data][product_data][name]": course.title,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][tax_behavior]": course.tax_included
        ? "inclusive"
        : "exclusive",
      "automatic_tax[enabled]": "true",
      "metadata[payment_id]": payment.id,
      success_url: `${secret("APP_URL")}/cursos/${courseId}?pago=pendiente`,
      cancel_url: `${secret("APP_URL")}/cursos/${courseId}`,
    };
    const checkout = await stripe(
      "checkout/sessions",
      params,
      `checkout-${payment.id}`,
    );
    await db(`payments?id=eq.${payment.id}`, {
      method: "PATCH",
      body: JSON.stringify({ stripe_session_id: checkout.id }),
    });
    return Response.json({ url: checkout.url });
  }
  const active = await db(
    `enrollments?user_id=eq.${s.user.id}&course_id=eq.${courseId}&status=eq.active&select=id,payments(status)`,
  );
  if (!active.some((e: any) => e.payments?.status === "confirmed"))
    throw new AppError(
      403,
      "Este curso requiere una inscripción con pago confirmado.",
    );
  if (action === "content" && request.method === "GET") {
    const lessons = await db(
      `lessons?course_id=eq.${courseId}&select=id,title,body,kind,asset_id,position,question,options&order=position.asc`,
    );
    const progress = await db(
      `lesson_progress?user_id=eq.${s.user.id}&select=lesson_id`,
    );
    return Response.json({
      lessons: lessons.map((l: any) => ({ ...l, html: richText(l.body) })),
      completed: progress.map((p: any) => p.lesson_id),
    });
  }
  if (action === "complete" && request.method === "POST") {
    const b = await jsonBody(request);
    const lessonId = id.parse(b.lessonId);
    const [lesson] = await db(
      `lessons?id=eq.${lessonId}&course_id=eq.${courseId}&select=id,question,correct_answer`,
    );
    if (!lesson) throw new AppError(404, "Lección no encontrada.");
    const answer =
      b.answer === null
        ? null
        : z.coerce.number().int().min(0).max(7).parse(b.answer);
    if (lesson.question && answer !== lesson.correct_answer)
      throw new AppError(
        400,
        "La respuesta no es correcta. Revisa la lección e inténtalo de nuevo.",
      );
    const cert = await rpc("complete_lesson", {
      p_user: s.user.id,
      p_lesson: lessonId,
      p_answer: answer,
    });
    if (cert) {
      await generateCertificate(cert);
      return Response.json({
        message:
          "¡Curso completado! Tu certificado está disponible en Mi cuenta.",
      });
    }
    return Response.json({
      message: "Lección completada. Tu progreso se guardó.",
    });
  }
  throw new AppError(404, "Acción no encontrada.");
}
async function storage(path: string, method: string, body?: Uint8Array) {
  const r = await fetch(
    `${secret("SUPABASE_URL")}/storage/v1/object/parish-certificates/${path}`,
    {
      method,
      headers: {
        ...supabaseServiceHeaders(secret("SUPABASE_SERVICE_ROLE_KEY")),
        "Content-Type": "application/pdf",
        "x-upsert": "true",
      },
      ...(body ? { body: body as unknown as BodyInit } : {}),
    },
  );
  if (!r.ok)
    throw new AppError(
      503,
      "El certificado se ha registrado, pero el PDF no está disponible aún. Vuelve a descargarlo desde tu cuenta.",
    );
  return r;
}
export async function generateCertificate(certId: string) {
  const [cert] = await db(
    `certificates?id=eq.${certId}&revoked=eq.false&select=*`,
  );
  if (!cert) return;
  if (cert.storage_path) return;
  const bytes = await certificatePdf(
    cert,
    secret("APP_URL"),
    (await getT()).locale,
  );
  const path = `${cert.user_id}/${cert.id}.pdf`;
  await storage(path, "POST", bytes);
  await db(`certificates?id=eq.${cert.id}`, {
    method: "PATCH",
    body: JSON.stringify({ storage_path: path }),
  });
}
export async function downloadCertificate(certId: string) {
  const s = await session();
  let [cert] = await db(
    `certificates?id=eq.${certId}&user_id=eq.${s.user.id}&revoked=eq.false&select=*`,
  );
  if (!cert) throw new AppError(404, "Certificado no encontrado.");
  if (!cert.storage_path) {
    await generateCertificate(cert.id);
    [cert] = await db(`certificates?id=eq.${certId}&select=*`);
  }
  const r = await fetch(
    `${secret("SUPABASE_URL")}/storage/v1/object/sign/parish-certificates/${cert.storage_path}`,
    {
      method: "POST",
      headers: {
        ...supabaseServiceHeaders(secret("SUPABASE_SERVICE_ROLE_KEY")),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: 60 }),
    },
  );
  if (!r.ok) throw new AppError(503, "No se pudo descargar el certificado.");
  const d = (await r.json()) as any;
  return Response.redirect(
    `${secret("SUPABASE_URL")}/storage/v1${d.signedURL}`,
    302,
  );
}
