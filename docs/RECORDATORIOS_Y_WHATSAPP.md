# Recordatorios y WhatsApp (sin Meta Cloud API)

Azenda **no envía** mensajes de WhatsApp por la API de Meta. El flujo es **manual y gratuito** para el negocio:

1. **Configuración** (`/tenant/config`): horario de reservas por días y franjas, teléfono y mensaje base del negocio para `wa.me`.
2. **Cliente en la reserva pública**: puede marcar que comparte móvil; al terminar, si el negocio tiene número configurado, verá un enlace **«Abrir WhatsApp con el negocio»** con la cita y la referencia ya en el texto.
3. **Panel Citas**: lista **«Recordatorios por WhatsApp (hoy y mañana)»** con enlace `wa.me` al **cliente** y botón **«Marcar enviado»** para no repetir.

La columna **Contacto WA** en la tabla indica si el cliente dejó móvil y si ya marcaste el recordatorio como enviado.
