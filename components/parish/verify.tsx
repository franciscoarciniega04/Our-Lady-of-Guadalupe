"use client";
import { useT } from "@/components/parish/language";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/i18n";
export function Verify() {
  const t = useT();

  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="record form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const f = new FormData(e.currentTarget);
          const r = await fetch(
            `/api/verify/${encodeURIComponent(String(f.get("folio")))}`,
          );
          const d: any = await r.json();
          setResult(
            r.ok
              ? `${t("Certificado válido")}: ${d.course}. ${t("Fecha de emisión:")} ${formatDate(d.issued_at, t.locale)}. ${t("Folio:")} ${d.folio}.`
              : d.error,
          );
        } catch {
          setResult(t("No se pudo consultar el folio. Inténtalo nuevamente."));
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor="folio">{t("Folio del certificado")}</label>
      <Input
        id="folio"
        name="folio"
        required
        maxLength={80}
        placeholder={t("Introduce el folio completo")}
      />
      <Button disabled={busy}>
        {busy ? t("Consultando…") : t("Verificar autenticidad")}
      </Button>
      <p role="status">{result}</p>
    </form>
  );
}
