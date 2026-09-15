"use client";
import { useT } from "@/components/parish/language";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
export function Account() {
  const t = useT();

  const [me, setMe] = useState<any>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [factor, setFactor] = useState<any>(null);
  async function load() {
    try {
      let r = await fetch("/api/account");
      if (r.status === 401) {
        await fetch("/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        r = await fetch("/api/account");
      }
      if (r.ok) setMe(await r.json());
    } catch {
      setMessage(t("No se pudo conectar. Inténtalo nuevamente."));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function action(name: string, data: unknown) {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch(`/api/auth/${name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setMessage(d.message ?? t("Listo."));
      if (d.factor) setFactor(d.factor);
      if (name === "login" || name === "mfa-verify") await load();
      if (name === "logout") {
        setMe(null);
        setFactor(null);
      }
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : t("No fue posible completar la solicitud."),
      );
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <p role="status">{t("Cargando tu cuenta…")}</p>;
  return (
    <>
      <p role="status" className={message ? "notice" : ""}>
        {message}
      </p>
      {me ? (
        <div className="two-column">
          <section className="record">
            <p className="eyebrow">{t("BIENVENIDO/A")}</p>
            <h2>{me.name}</h2>
            <p>{me.email}</p>
            <p>
              {me.verified
                ? t("Correo verificado")
                : t("Verifica tu correo antes de inscribirte")}
            </p>
            <h3>{t("Mis cursos")}</h3>
            {me.enrollments?.length ? (
              me.enrollments.map((r: any) => (
                <p key={r.id}>
                  <Link href={`/cursos/${r.course_id}`}>
                    {r.courses?.title ?? t("Abrir curso")}
                  </Link>{" "}
                  ·{" "}
                  {r.status === "active"
                    ? t("Acceso activo")
                    : t("Acceso revocado")}
                </p>
              ))
            ) : (
              <p>{t("Aún no tienes cursos inscritos.")}</p>
            )}
            <h3>{t("Mis certificados")}</h3>
            {me.certificates?.length ? (
              me.certificates.map((r: any) => (
                <p key={r.id}>
                  <a href={`/api/certificates/${r.id}`}>
                    {t("Descargar certificado ·")} {r.folio}
                  </a>
                </p>
              ))
            ) : (
              <p>
                {t("Los certificados aparecerán al completar tu formación.")}
              </p>
            )}
            {me.admin && (
              <p>
                <Link className="primary-link" href="/admin">
                  {t("Administrar la parroquia")}
                </Link>
              </p>
            )}
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => action("logout", {})}
            >
              {t("Cerrar sesión")}
            </Button>
          </section>
          <section className="record">
            <h2>{t("Seguridad de la cuenta")}</h2>
            <p>
              {t(
                "La verificación en dos pasos es obligatoria para administrar y opcional para feligreses.",
              )}
            </p>
            <Button disabled={busy} onClick={() => action("mfa-enroll", {})}>
              {t("Configurar autenticador")}
            </Button>
            {factor && (
              <>
                <p>
                  {t("Introduce esta clave en tu aplicación de autenticación:")}
                </p>
                <code className="break-all">{factor.totp?.secret}</code>
              </>
            )}
            <form
              className="form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void action("mfa-verify", {
                  factorId: factor?.id ?? me.factorId,
                  code: f.get("code"),
                });
              }}
            >
              <label htmlFor="mfa-code">{t("Código de 6 dígitos")}</label>
              <Input
                id="mfa-code"
                name="code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoComplete="one-time-code"
              />
              <Button disabled={busy}>{t("Verificar código")}</Button>
            </form>
          </section>
        </div>
      ) : (
        <div className="account-container">
          <Tabs defaultValue="login">
            <TabsList>
              <TabsTrigger value="login">{t("Iniciar sesión")}</TabsTrigger>
              <TabsTrigger value="signup">{t("Registrarme")}</TabsTrigger>
              <TabsTrigger value="recover">{t("Recuperar acceso")}</TabsTrigger>
            </TabsList>
            {["login", "signup", "recover"].map((mode) => (
              <TabsContent value={mode} key={mode}>
                <form
                  className="record form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void action(mode, Object.fromEntries(f));
                  }}
                >
                  {mode === "signup" && (
                    <>
                      <label htmlFor="name">{t("Nombre completo")}</label>
                      <Input
                        id="name"
                        name="name"
                        required
                        minLength={3}
                        maxLength={100}
                        autoComplete="name"
                      />
                    </>
                  )}
                  <label htmlFor={`email-${mode}`}>
                    {t("Correo electrónico")}
                  </label>
                  <Input
                    id={`email-${mode}`}
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                  />
                  {mode !== "recover" && (
                    <>
                      <label htmlFor={`password-${mode}`}>
                        {t("Contraseña")}
                      </label>
                      <Input
                        id={`password-${mode}`}
                        name="password"
                        type="password"
                        minLength={12}
                        maxLength={128}
                        required
                        autoComplete={
                          mode === "login" ? "current-password" : "new-password"
                        }
                      />
                      {mode === "signup" && (
                        <p>
                          {t(
                            "Usa al menos 12 caracteres, mayúsculas, minúsculas y números.",
                          )}
                        </p>
                      )}
                    </>
                  )}
                  <Captcha />
                  {mode === "signup" && (
                    <label className="consent">
                      <input type="checkbox" name="consent" required />{" "}
                      {t("Soy mayor de edad y he leído el")}{" "}
                      <Link href="/privacidad">{t("Aviso de privacidad")}</Link>{" "}
                      {t("y los")} <Link href="/terminos">{t("términos")}</Link>
                      .
                    </label>
                  )}
                  <Button disabled={busy}>
                    {busy
                      ? t("Procesando…")
                      : mode === "login"
                        ? t("Entrar")
                        : mode === "signup"
                          ? t("Crear cuenta")
                          : t("Enviar enlace de recuperación")}
                  </Button>
                </form>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
    </>
  );
}
function Captcha() {
  const t = useT();

  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let disposed = false;
    let widget: string | undefined;
    let script: HTMLScriptElement | null = null;
    const render = (key: string) => {
      if (disposed || !host.current || !(window as any).hcaptcha) return;
      widget = (window as any).hcaptcha.render(host.current, {
        sitekey: key,
        hl: t.locale,
      });
      setReady(true);
    };
    let onLoad = () => {};
    fetch("/api/config")
      .then((r) => r.json())
      .then((d: any) => {
        if (!d.captchaSiteKey || disposed) return;
        if ((window as any).hcaptcha) {
          render(d.captchaSiteKey);
          return;
        }
        script = document.querySelector("script[data-parish-captcha]");
        if (!script) {
          script = document.createElement("script");
          script.src = "https://js.hcaptcha.com/1/api.js?render=explicit";
          script.async = true;
          script.dataset.parishCaptcha = "true";
          document.head.appendChild(script);
        }
        onLoad = () => render(d.captchaSiteKey);
        script.addEventListener("load", onLoad);
      })
      .catch(() => {});
    return () => {
      disposed = true;
      script?.removeEventListener("load", onLoad);
      if (widget !== undefined) (window as any).hcaptcha?.remove(widget);
    };
  }, []);
  return (
    <>
      <div ref={host} />
      {!ready && (
        <p className="notice">
          {t(
            "El acceso se habilitará cuando la parroquia complete la configuración del servicio.",
          )}
        </p>
      )}
    </>
  );
}
