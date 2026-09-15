# Crear las cuentas para la parroquia

Primero prepararemos un entorno de prueba. No necesitamos cobrar dinero real para verificar el proyecto.

## 1. Supabase: usuarios, base de datos y archivos

1. Abre https://supabase.com/dashboard y crea tu cuenta con un correo bajo control de la parroquia o de su responsable autorizado. Completa personalmente la verificación y las condiciones del servicio.
2. Crea la organización de la parroquia y el proyecto `parroquia-mendota`. Elige una región de Estados Unidos cercana a California si aparece disponible.
3. Genera una contraseña única para la base de datos y guárdala en un gestor de contraseñas. No la envíes por el chat.
4. Espera a que el proyecto termine de crearse. En los ajustes del proyecto, localiza la URL y la sección **API Keys**.
5. El código admite las claves actuales **Publishable key** (`sb_publishable_…`) y **Secret key** (`sb_secret_…`). La segunda es exclusivamente del servidor. También admite las claves JWT antiguas `anon` y `service_role` si el proyecto ya las usa.
6. En el archivo local `.env.local` coloca la URL en `SUPABASE_URL`, la clave publicable en `SUPABASE_PUBLISHABLE_KEY` y la secreta en `SUPABASE_SECRET_KEY`. No modifiques `.env.example` con valores reales. El archivo local queda excluido de Git y del ZIP de entrega.

Cuando esté creado el proyecto, avisa sin compartir claves. El siguiente paso será aplicar las migraciones y configurar autenticación, correo y buckets privados. La base de datos no se crea automáticamente por guardar las claves.

## 2. Stripe: pagos de prueba

1. Abre https://dashboard.stripe.com/register y crea la cuenta del responsable autorizado. Completa personalmente contraseñas, verificación y aceptación de condiciones.
2. Usa un **sandbox** para las pruebas. Stripe permite simular transacciones sin mover dinero.
3. Al preparar la cuenta real, usa los datos legales de la entidad responsable de Our Lady of Guadalupe Catholic Church Mendota, en Estados Unidos. No inventes datos fiscales, titularidad ni información bancaria. Esa activación la debe completar la persona autorizada.
4. Obtén la clave secreta del entorno de prueba y guárdala en `STRIPE_SECRET_KEY` dentro de `.env.local`. No necesitamos números de tarjeta ni acceso a cuentas bancarias en el proyecto.
5. Configuraremos después el destino de eventos `/api/webhooks/stripe`; su secreto de firma va en `STRIPE_WEBHOOK_SECRET`. No es la misma clave que la clave API.

El sitio utiliza USD y pago único. La activación de cobros reales queda para después de verificar los pagos de prueba y aprobar las políticas parroquiales.

## 3. Comprobar la configuración sin revelar claves

Desde la carpeta del proyecto:

```sh
node --env-file=.env.local scripts/check-readiness.mjs
```

Solo muestra qué grupos están configurados y cuáles faltan. A continuación reiniciamos el servidor para que lea los cambios y ejecutamos las pruebas reales.

También faltarán el correo de envío, hCaptcha y el servicio antivirus; los configuraremos por etapas, después de la base de datos. Las claves locales no se publican automáticamente: deberán guardarse por separado como secretos en el hosting.

## Fuentes oficiales

- https://supabase.com/docs/guides/getting-started/api-keys
- https://github.com/supabase/supabase/blob/master/examples/user-management/nextjs-user-management/README.md
- https://docs.stripe.com/get-started/account
- https://docs.stripe.com/sandboxes

Guía verificada el 13 de septiembre de 2026. No se han creado cuentas en nombre del usuario ni se han aceptado contratos.
