# Our Lady of Guadalupe Catholic Church Mendota

Portal parroquial en español para Mendota, California. Teléfono: +1 559-655-4237. Párroco: Jorge Alberto Robles Cuevas. Moneda: USD. Los horarios permanecen pendientes, por indicación del usuario.

## Estado

Código de web pública, administración, autenticación, pagos y formación implementado. Pruebas locales de transacciones PostgreSQL y seguridad incluidas. **No está listo para recibir cuentas o pagos reales:** faltan credenciales de servicios, migraciones en el proveedor, contenido real, aprobación legal, escáner de archivos y pruebas integrales en un entorno de prueba. Las operaciones fallan de forma cerrada mientras no se configure lo necesario. La publicación privada sirve para revisar la web.

## Arquitectura

- React con Vinext (API de Next.js y renderizado del servidor), TypeScript, componentes accesibles y CSS responsivo.
- Backend REST en `app/api/[...path]/route.ts`; autorización y validación Zod en cada módulo. Middleware con cabeceras de seguridad.
- PostgreSQL administrado por Supabase, Auth administrado y almacenamiento de objetos privado separado del servidor. Acceso a datos mediante PostgREST con consultas parametrizadas y funciones SQL transaccionales; **no se emplea un ORM en las consultas de aplicación**. Este ajuste evita conexiones TCP no disponibles en Sites.
- Stripe Checkout hospedado y webhook HMAC SHA-256 con tolerancia de 5 minutos. Solo el webhook confirmado concede acceso; la redirección del navegador no lo hace.
- Certificados PDF con nombre, curso, fecha y URL/folio verificable. El archivo se genera al completar la formación y se guarda en object storage; la descarga vuelve a intentarlo si el almacenamiento falla.

## Instalación local

Para crear las cuentas externas por primera vez, seguir [CREAR-CUENTAS.md](docs/CREAR-CUENTAS.md). El backend admite tanto las claves actuales de Supabase (`SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`) como los alias JWT antiguos.

Requisitos: Node.js >=22.13, npm y una cuenta Supabase/Stripe para probar las integraciones.

```sh
npm run install:ci
cp .env.example .env.local
npm run dev
```

En Windows, si el lanzador npm del entorno no encuentra `npm-cli.js`, usar `node "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" run install:ci`.

La vista previa usa el puerto 5173. Las cookies de acceso son Secure; para pruebas de autenticación completas usar HTTPS en un entorno de prueba. Nunca cambiar las cookies a inseguras para producción.

## Base de datos y superadministrador

1. Crear un proyecto Supabase y copiar URL, clave pública y clave de servicio a variables del servidor. Nunca exponer la clave de servicio en `NEXT_PUBLIC_*`.
2. Aplicar `supabase/migrations/202609130001_parish.sql` y las migraciones posteriores, en orden, con el SQL Editor o `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f ...`. La tabla de usuarios de Supabase Auth debe existir previamente.
3. Crear buckets privados: `node --env-file=.env.local scripts/setup-storage.mjs`.
4. Configurar Auth, SMTP, captcha y plantillas según [OPERACION.md](docs/OPERACION.md).
5. Registrar una cuenta y verificar su correo. Definir su UUID en `SUPER_ADMIN_USER_ID`; ejecutar `node --env-file=.env.local scripts/seed-admin.mjs`. No hay contraseña predeterminada.
6. Activar y verificar TOTP en Mi cuenta. La administración requiere AAL2, incluso para el superadministrador.

Las tablas públicas tienen RLS activado y no conceden acceso a `anon` ni `authenticated`; solo el backend puede operar. La función de webhook tampoco es ejecutable con esos roles. La auditoría usa disparadores y no admite UPDATE/DELETE/TRUNCATE desde la aplicación.

## Configuración de pagos

Configurar `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `APP_URL` y Stripe Tax. Enviar eventos al endpoint HTTPS `/api/webhooks/stripe`. Registrar los eventos detallados en [OPERACION.md](docs/OPERACION.md). Los importes se guardan en centavos USD. Los cursos se publican después de añadir lecciones. Cada usuario puede tener un solo pago pendiente o confirmado por curso. El Checkout usa clave de idempotencia por pago.

Antes de abrir inscripciones, sustituir los borradores `/privacidad` y `/terminos` por documentos aprobados y establecer `LEGAL_APPROVED=true`. Esa variable **no convierte el borrador en una política aprobada**.

## Administración

Entrar en `/cuenta`, verificar MFA y abrir `/admin`. Los módulos autorizados dependen de los permisos del colaborador. El superadministrador asigna o revoca roles a usuarios existentes verificados. Horarios: día semanal 0–6 o fecha única, nunca ambos. Avisos y lecciones aceptan Markdown (negrita, cursiva, listas y enlaces) sanitizado al mostrarlo. Los archivos deben superar la revisión real del escáner antes de guardarse.

La interfaz administrativa incluye selectores de archivos, cursos, días y permisos; los precios se introducen en dólares. No hay invitación automática por correo ni envío opcional de certificados. No hay transcodificación automática; los clips permitidos son MP4/WebM.

## Validación

```sh
node node_modules/typescript/bin/tsc --noEmit
node --test tests/*.test.mjs
npm run build
node scripts/smoke-http.mjs http://localhost:5173
```

`tests/database.test.mjs` ejecuta la migración en PostgreSQL mediante PGlite con una tabla Auth de prueba: pago pendiente, webhook no pagado/importe incorrecto, confirmación, duplicados, evaluación, emisión, reembolso, evento tardío, permisos DB y auditoría. `tests/security.test.mjs` prueba firma, expiración y autorización por módulo/MFA. Esto no sustituye pruebas reales con Stripe, Supabase Auth, el escáner ni un simulacro de restauración.

## Despliegue

El frontend/backend se compila para Cloudflare Workers con `npm run build`. Conservar `.openai/hosting.json` y el identificador del sitio. Publicar `dist/server` y `dist/client` mediante Sites. Las migraciones PostgreSQL se aplican por separado; no usar D1 para este modelo. Configurar los secretos en el entorno hospedado. El sitio se mantiene privado hasta que el responsable autorice abrirlo al público.

Para hospedar fuera de Sites, conservar la compatibilidad de los componentes con Next.js, sustituir el envoltorio Vinext por el proceso estándar del proveedor y verificar de nuevo middleware, cookies, rutas y compilación; no se ha probado esa alternativa.

## Operación y pendientes

La interfaz abre en inglés por defecto. El selector English / Español guarda una cookie esencial durante un año y conserva la ruta y sus parámetros. Se traducen las páginas estáticas, formularios, administración, mensajes del servidor y formatos de fecha/hora; los importes siguen en USD. El PDF se emite en el idioma elegido al generarlo y conserva ese idioma después. Los futuros avisos, títulos y materiales escritos por la parroquia se muestran en su idioma original: el selector no traduce automáticamente contenido editorial ni videos. Publicar ese contenido en inglés o con ambas versiones. Las instrucciones técnicas de este repositorio permanecen en español para el responsable del proyecto.

Prueba de idiomas: `node scripts/smoke-i18n.mjs http://localhost:5173`. Comprueba 12 páginas en ambos idiomas, conservación de preferencia, mensajes API y validación de redirecciones.

Ver [OPERACION.md](docs/OPERACION.md) para backups diarios cifrados, retención de 30 días, recuperación, logs, alertas y pruebas de apertura. Los horarios, historia, misión, dirección postal, correo, redes y contenido de cursos/avisos se incorporarán cuando la parroquia los proporcione. No se han inventado datos ni celebrado cobros reales.

Referencias técnicas consultadas: [Supabase Auth del servidor](https://supabase.com/docs/guides/auth/server-side/advanced-guide), [verificación de webhooks Stripe](https://docs.stripe.com/webhooks?lang=node).

