# Prompt para Codex — Sitio web de la parroquia

Copia y pega el siguiente texto (desde "## Rol y objetivo" hasta el final) directamente en Codex. Está redactado para que la IA tenga todo el contexto necesario en una sola pasada. Puedes ajustar los nombres de la parroquia, colores, textos y montos antes de usarlo.

---

## Rol y objetivo

Actúa como un desarrollador full-stack senior especializado en aplicaciones web seguras con pagos en línea. Vas a construir, de forma completa y funcional, el sitio web de una parroquia católica en México. El sitio debe ser responsivo (móvil, tablet, escritorio), rápido, accesible y fácil de mantener por personal no técnico (el sacerdote y colaboradores designados).

## Stack tecnológico sugerido

- Frontend: React (Next.js) o similar con renderizado híbrido para buen SEO en la página de inicio y avisos públicos.
- Backend: Node.js con framework (NestJS o Express) o Django/FastAPI si prefieres Python. Debe exponer una API REST o GraphQL segura.
- Base de datos: PostgreSQL (relacional, robusta para manejar usuarios, pagos y cursos con integridad referencial).
- Almacenamiento de archivos (videos, certificados PDF, imágenes): un bucket de object storage (Amazon S3, Google Cloud Storage o Cloudflare R2), nunca en el propio servidor.
- Autenticación: JWT con refresh tokens, o un proveedor gestionado (Auth0, Clerk, Supabase Auth) para reducir el riesgo de manejar contraseñas por cuenta propia.
- Pagos: pasarela de pago que opere en México y soporte pesos mexicanos (MXN) — Stripe (disponible en México), Conekta u OpenPay/PayPal como alternativas. El sitio nunca debe tocar ni almacenar datos de tarjeta; todo el cobro se hace con los widgets/checkout hospedado o tokenización de la pasarela.
- Generación de certificados: librería de generación de PDF (por ejemplo pdf-lib o wkhtmltopdf) que se dispare automáticamente al confirmar pago + finalización del curso.
- Hosting: un proveedor con HTTPS gestionado (Vercel, Render, Railway, o un VPS con Nginx + Let's Encrypt).

## Módulos y apartados funcionales

### 1. Página de inicio (pública, sin login)
- Nombre de la parroquia, dirección, párroco a cargo, historia breve, misión.
- Datos de contacto (teléfono, correo, redes sociales, mapa embebido de ubicación).
- Sección destacada con los próximos avisos y fechas importantes.
- Acceso visible a "Horarios de misas", "Avisos", "Videos" y "Cursos".

### 2. Horarios de misas
- Panel de administración donde el sacerdote o un editor autorizado pueda dar de alta, editar y eliminar horarios por día de la semana (incluyendo misas especiales o eventos únicos con fecha específica).
- Vista pública en formato de calendario/tabla semanal, ordenada por día y hora, indicando idioma o tipo de misa si aplica (ej. misa de sanación, misa en otro idioma).

### 3. Fechas importantes y avisos
- CRUD de avisos con título, cuerpo (texto enriquecido), fecha de publicación, fecha de expiración opcional e imagen adjunta.
- Los avisos deben poder marcarse como "fijados" para aparecer primero.
- Vista pública tipo tablón de anuncios, ordenada cronológicamente, con los avisos vencidos ocultos automáticamente.

### 4. Galería de videos
- Módulo para subir clips cortos (por ejemplo, homilías, testimonios, eventos).
- Los videos deben almacenarse en el bucket de object storage, no en la base de datos ni en el servidor de la aplicación.
- Validar en el backend el tipo de archivo (solo formatos de video permitidos), un límite de tamaño razonable y, de ser posible, comprimir/transcodificar (ej. con un servicio como Mux o Cloudflare Stream) para no depender del navegador del usuario final.
- Vista pública en forma de galería con miniaturas y reproductor embebido.

### 5. Cursos con certificación y pago único
- El sacerdote (o un editor con permiso) puede crear cursos: título, descripción, sacramento al que aplica (bautismo, primera comunión, confirmación, matrimonio, etc.), contenido (lecciones en texto/video/PDF), precio en pesos mexicanos y si el precio incluye IVA o no.
- Cada curso tiene contenido bloqueado por defecto. Un usuario debe iniciar sesión, iniciar el proceso de pago único a través de la pasarela y **solo tras recibir la confirmación de pago vía webhook verificado por firma** el backend debe desbloquear el acceso al contenido para ese usuario específico (nunca desbloquear solo porque el frontend "dice" que el pago tuvo éxito).
- Al completar todas las lecciones/evaluaciones del curso, el sistema genera automáticamente un certificado en PDF con el nombre del usuario, el curso, la fecha y un folio único verificable (por ejemplo con un código QR o una URL de verificación pública que confirme la autenticidad del certificado).
- El certificado debe quedar disponible para descarga en el perfil del usuario y, opcionalmente, enviarse por correo.
- Panel para que el sacerdote pueda ver quién ha pagado, quién ha completado cada curso y quién ya tiene certificado, para poder autorizar la recepción del sacramento correspondiente.

### 6. Autenticación e inicio de sesión
- Registro e inicio de sesión de usuarios (feligreses) con correo y contraseña, o inicio de sesión social (Google) como opción adicional.
- Verificación de correo electrónico obligatoria antes de poder pagar un curso.
- Recuperación de contraseña por correo con enlace de un solo uso y expiración corta.
- Autenticación multifactor (MFA) opcional para usuarios y **obligatoria** para cuentas administrativas.

### 7. Roles y permisos (súper usuario / administrador)
- Debe existir un rol de **súper usuario** (el administrador principal), creado manualmente al desplegar el sistema, que:
  - Puede crear, editar y revocar cuentas de otros administradores/editores.
  - Puede asignar permisos granulares por módulo (por ejemplo, un colaborador solo puede editar avisos y horarios, pero no cursos ni pagos).
  - Puede ver un registro de auditoría (quién hizo qué cambio y cuándo).
- Los roles sugeridos: Súper administrador, Administrador de contenido (avisos, horarios, videos), Administrador de cursos y pagos, Usuario/feligrés.
- Toda acción administrativa sensible (borrar un aviso, cambiar el precio de un curso, otorgar permisos) debe quedar registrada en un log de auditoría inmutable.

## Requisitos de seguridad (obligatorios)

- **Transporte:** forzar HTTPS en todo el sitio (HSTS activado), redirigir cualquier tráfico HTTP.
- **Contraseñas:** nunca almacenar contraseñas en texto plano; usar bcrypt o Argon2 con salt. Aplicar políticas mínimas de complejidad y bloqueo temporal tras varios intentos fallidos (rate limiting / protección de fuerza bruta).
- **Sesiones y tokens:** JWT de corta duración con refresh tokens rotativos almacenados en cookies `httpOnly`, `secure` y `SameSite=strict`.
- **Pagos:** cumplimiento con estándares PCI-DSS delegando el manejo de datos de tarjeta enteramente a la pasarela de pago (nunca guardar números de tarjeta en tu base de datos). Verificar la firma de cada webhook de confirmación de pago antes de desbloquear contenido. Registrar cada transacción con su estado (pendiente, confirmado, fallido, reembolsado).
- **Validación de datos:** validar y sanitizar toda entrada del usuario en el backend (no confiar solo en la validación del frontend) para prevenir inyección SQL, XSS y CSRF. Usar un ORM con consultas parametrizadas.
- **Control de acceso:** verificar permisos en cada endpoint del backend según el rol del usuario autenticado (no solo ocultar botones en el frontend).
- **Subida de archivos:** validar tipo MIME real, tamaño máximo y escanear archivos (videos, imágenes, PDFs) antes de almacenarlos; servirlos desde un dominio/bucket separado del backend principal.
- **Cabeceras de seguridad:** Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy configuradas correctamente.
- **Protección contra bots:** captcha (por ejemplo hCaptcha o reCAPTCHA) en formularios de registro, login y contacto.
- **Respaldo de datos:** backups automáticos y cifrados de la base de datos (diarios) con retención de al menos 30 días, y un plan de recuperación ante desastres documentado.
- **Cifrado en reposo:** cifrar campos sensibles (si se llegan a guardar datos personales delicados) y cifrar los backups.
- **Registro y monitoreo:** logs centralizados de accesos, errores y eventos de seguridad, con alertas ante actividad sospechosa (por ejemplo múltiples pagos fallidos desde la misma cuenta).
- **Cumplimiento legal:** el sitio debe incluir aviso de privacidad conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (México), y términos y condiciones claros sobre el pago único de los cursos y su política de reembolsos.

## Entregables esperados

1. Código fuente completo (frontend y backend) organizado en un repositorio con estructura clara de carpetas.
2. Migraciones y modelo de base de datos (usuarios, roles, permisos, horarios, avisos, videos, cursos, inscripciones, pagos, certificados, logs de auditoría).
3. Archivo `.env.example` con todas las variables de entorno necesarias (claves de la pasarela de pago, credenciales de base de datos, secretos de JWT, credenciales del bucket de almacenamiento, etc.), sin valores reales.
4. Script o seed inicial para crear la cuenta del súper usuario administrador.
5. Documentación (`README.md`) con instrucciones de instalación, variables de entorno, cómo correr migraciones y cómo desplegar a producción.
6. Pruebas automatizadas mínimas para el flujo de pago (confirmar que el contenido del curso no se desbloquea sin un webhook válido) y para el control de acceso por rol.

---

*Fin del prompt para Codex.*
