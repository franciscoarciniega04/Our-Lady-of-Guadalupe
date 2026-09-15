"use client";
import { useT } from "@/components/parish/language";

import { useEffect } from "react";
export function WebTools() {
  const t = useT();

  useEffect(() => {
    const context = (document as any).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    Promise.resolve(
      context.registerTool(
        {
          name: "verify_parish_certificate",
          description: t(
            "Consulta la validez de un folio de certificado de la parroquia. No revela el nombre del participante.",
          ),
          inputSchema: {
            type: "object",
            properties: { folio: { type: "string" } },
            required: ["folio"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: true },
          async execute(input: any) {
            if (
              typeof input?.folio !== "string" ||
              !/^[\da-f-]{36}$/i.test(input.folio)
            )
              throw Error(t("Folio inválido"));
            const r = await fetch(`/api/verify/${input.folio}`);
            const result = await r.json();
            if (!r.ok)
              throw Error(
                t(
                  "No se encontró un certificado válido o el servicio no está disponible.",
                ),
              );
            return result;
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, []);
  return null;
}
