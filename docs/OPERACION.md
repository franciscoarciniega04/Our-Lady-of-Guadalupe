# Operación y apertura del servicio

La ubicación y moneda definitivas son Mendota, California, Estados Unidos y USD. El documento original suponía México; no se aplicará automáticamente una política mexicana a esta parroquia.

## Dependencias externas pendientes

- Proyecto Supabase PostgreSQL con Auth y dos buckets privados. Ejecutar las migraciones y el script de almacenamiento.
- Configurar SMTP propio en Supabase, correo obligatorio, contraseñas de 12 caracteres con mayúsculas, minúsculas y números, expiración del JWT de 900 segundos, rotación de refresh tokens y expiración del enlace de recuperación de 900 segundos.
- Plantillas de confirmación/recuperación con `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup` o `type=recovery`. No utilizar enlaces con tokens en fragmentos URL. La sesión queda en cookies httpOnly/Secure/SameSite=Strict.
- hCaptcha: registrar el dominio, configurar clave pública y secreto. El backend verifica el token; no activar un segundo consumo del mismo token en Auth. Configurar los límites propios de Supabase Auth además del límite persistente de la aplicación.
- Stripe: cuenta de la parroquia, USD, Stripe Tax configurado, claves de prueba y secreto del webhook. Eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`.
- Servicio privado antivirus con contrato de `FILE_SCANNER_URL`: recibe bytes, autentica Bearer token, verifica tamaño, contenedor/MIME y antivirus, devuelve `{clean:true,mime:"..."}` únicamente después de superar todas las comprobaciones. Debe fallar cerrado. No habilitar subidas hasta disponer del servicio. Límite 50 MB; transcodificación adicional no implementada.
- Crear una cuenta verificada, ejecutar `seed-admin.mjs` y activar TOTP desde Mi cuenta. Los administradores no pueden abrir administración ni ejecutar sus API con AAL1.
- Aprobar los textos legales aplicables a California, privacidad, menores, plazo de conservación y reembolsos; reemplazar los borradores visibles. Solo entonces establecer `LEGAL_APPROVED=true` y versionar `LEGAL_VERSION`.

## Backups y recuperación

Programar diariamente `scripts/backup.sh` en un ejecutor con PostgreSQL CLI, age y AWS CLI. El archivo se cifra antes de subirlo a un bucket separado. Activar versionado, cifrado de servidor y una regla de retención mínima de 30 días (se recomiendan 35) sobre `parish-backups/`. Guardar la clave privada age fuera del servidor y de Git. El script no crea la programación ni configura el bucket automáticamente.

RPO objetivo: 24 horas. RTO objetivo: 4 horas, pendiente de validar con un simulacro. Restaurar en un proyecto aislado: descargar copia, verificar SHA-256, descifrar con age, restaurar con `pg_restore --no-owner --no-privileges`, recuperar configuraciones de Auth/storage y copiar objetos. Los backups PostgreSQL no incluyen los bytes de los buckets: activar una copia diaria independiente/versionado de esos objetos. Comprobar usuarios, matrícula pagada, archivos, folios y auditoría antes de cambiar el dominio. Ejecutar simulacro trimestral y conservar evidencia.

## Logs y alertas

El servidor registra errores de acceso a datos y API en JSON, sin contraseñas, claves ni números de tarjeta. Los cambios de contenido y permisos se registran en PostgreSQL con disparadores, dentro de la misma transacción. La aplicación no puede modificar/borrar/truncar la auditoría. Un propietario de infraestructura conserva poder administrativo: exportar diariamente los logs a almacenamiento con retención inmutable para una garantía independiente.

Configurar una salida centralizada de logs del hosting, del autenticador y de Stripe. Alertas: más de 5 pagos fallidos por usuario en 15 minutos, errores de webhook durante 5 minutos, picos de 403/429, fallo de backup, indisponibilidad del escáner. Son ajustes operativos pendientes de activar en los proveedores; las variables de ejemplo no los activan por sí solas.

## Prueba integral antes de abrir

1. Registrar una cuenta de prueba, verificar correo, recuperar contraseña y comprobar que el enlace usado no se reutiliza.
2. Comprobar rotación de sesión, cierre y revocación; configurar TOTP administrativo y rechazar AAL1.
3. Publicar un curso con al menos una lección y evaluación. Pagar con Stripe en modo prueba: visitar la URL de éxito nunca debe habilitar el curso por sí sola.
4. Entregar webhook real firmado. Probar duplicados, pagos asíncronos, importe incorrecto, fallo, expiración y reembolso; comprobar acceso y auditoría.
5. Completar lecciones, descargar el PDF, verificar folio y comprobar revocación tras reembolso.
6. Subir archivos válidos y muestras de prueba antivirus autorizadas al entorno de prueba. Rechazar MIME falso y archivos mayores de 50 MB.
7. Verificar políticas y cabeceras HTTPS en el dominio final, correo real, restauración de backup y alertas.

Estas pruebas no pueden darse por ejecutadas sin las cuentas y credenciales externas.
El servicio de referencia del escáner está en services/scanner (Python/libmagic y ClamAV INSTREAM). Requiere desplegar ClamAV, mantener firmas actualizadas y configurar TLS privado. El flujo diario de backup se incluye en .github/workflows/backup.yml para repositorios GitHub; no se ejecuta en el repositorio interno de Sites hasta conectarlo a un ejecutor.
