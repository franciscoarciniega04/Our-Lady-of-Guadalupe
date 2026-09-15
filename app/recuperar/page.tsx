"use client";
import { useT } from "@/components/parish/language";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export default function Recovery() {
  const t = useT();

  const [message, setMessage] = useState("");
  return (
    <main className="wrap section page" id="contenido">
      <h1>{t("Nueva contraseña")}</h1>
      <form
        className="record form"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const data = Object.fromEntries(new FormData(e.currentTarget));
            const r = await fetch("/api/auth/reset", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            const d: any = await r.json();
            setMessage(d.message ?? d.error);
          } catch {
            setMessage(t("No se pudo actualizar la contraseña."));
          }
        }}
      >
        <label htmlFor="password">
          {t(
            "Contraseña nueva (al menos 12 caracteres, mayúsculas, minúsculas y números)",
          )}
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
          required
        />
        <Button>{t("Guardar contraseña")}</Button>
        <p role="status">{message}</p>
      </form>
    </main>
  );
}
