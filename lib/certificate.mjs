import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
export async function certificatePdf(cert, origin, locale = "en") {
  const text = (en, es) => (locale === "es" ? es : en);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]);
  const regular = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const green = rgb(0.09, 0.25, 0.23);
  page.drawRectangle({
    x: 25,
    y: 25,
    width: 792,
    height: 545,
    borderColor: green,
    borderWidth: 2,
  });
  const write = (text, y, size, font = regular) => {
    const safe = [...text]
      .map((c) => {
        try {
          font.encodeText(c);
          return c;
        } catch {
          return "?";
        }
      })
      .join("");
    const fitted = Math.min(
      size,
      740 / Math.max(font.widthOfTextAtSize(safe, 1), 1),
    );
    page.drawText(safe, {
      x: (842 - font.widthOfTextAtSize(safe, fitted)) / 2,
      y,
      size: fitted,
      font,
      color: green,
    });
  };
  write("Our Lady of Guadalupe", 505, 24, bold);
  write("Catholic Church - Mendota, California", 478, 15);
  write(
    text("CERTIFICATE OF COMPLETION", "CERTIFICADO DE FORMACIÓN"),
    410,
    30,
    bold,
  );
  write(text("This certifies that", "Se hace constar que"), 355, 18);
  write(cert.recipient_name, 315, 30, bold);
  write(text("has completed the course", "ha completado el curso"), 272, 18);
  write(cert.course_title, 235, 24, bold);
  write(
    `${text("Date", "Fecha")}: ${new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", { dateStyle: "long", timeZone: "America/Los_Angeles" }).format(new Date(cert.issued_at))}`,
    180,
    16,
  );
  write(`${text("Certificate ID", "Folio")}: ${cert.folio}`, 145, 12);
  write(`${origin}/verificar/${cert.folio}`, 117, 11);
  write(
    text(
      "Receiving a sacrament requires parish authorization.",
      "La recepción del sacramento requiere autorización parroquial.",
    ),
    70,
    12,
  );
  return pdf.save();
}
