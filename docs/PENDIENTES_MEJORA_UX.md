# Pendientes de mejora UX / producto

Lista viva: **tacha** lo que esté hecho cambiando `[ ]` por `[x]`, o borra la línea si preferís acortar el documento.

Última ejecución en código: recordatorios **WhatsApp manuales** (`wa.me`), horario de reservas por franjas en configuración, casilla y móvil en reserva pública; ver [RECORDATORIOS_Y_WHATSAPP.md](RECORDATORIOS_Y_WHATSAPP.md).

---

## Clientes finales (quien reserva)

- [x] Reserva en pocos pasos: **teléfono opcional**; nombre sigue siendo obligatorio para identificar la cita en el panel.
- [x] Reserva en pocos pasos: **progreso visible** (pasos Servicio → Horario → Confirmar en `/reservar/:slug`).
- [x] **No pedir cuenta** para reservar (flujo público sin login).
- [x] **Claridad antes de confirmar**: bloque «Antes de confirmar» con ubicación/enlace (si el negocio los configura), texto de cancelación y de recordatorio; **textos por defecto** cuando el negocio no personaliza (excepto ubicación).
- [x] Resumen antes de confirmar: servicio, profesional, fecha y hora (paso 3).
- [x] **Móvil primero**: `scroll-padding-bottom` en la página de reserva, margen inferior de la barra de confirmación y FAB con **safe-area** (`env(safe-area-inset-bottom)`).
- [x] **Móvil**: hints de teclado y autocompletado en nombre/teléfono (`enterkeyhint`, `autocomplete`, `inputmode`).
- [x] **Confianza**: marca del negocio (logo, nombre) en página pública.
- [x] **Confianza**: aclaración de que estrellas/reseñas del héroe son **ilustrativas**.
- [x] **Columna lateral**: sin valoraciones falsas tipo «4,9»; texto honesto + consejos (reseñas reales cuando el producto las soporte).
- [x] Mensajes de error **humanos** en reserva/asistencias/catálogo público.
- [ ] **Reseñas reales** desde datos del negocio (integración futura).
- [x] **Accesibilidad** (incremental): `:focus-visible` destacado en controles clave de la reserva; **etiquetas visibles** en alta manual de citas del panel.

---

## Dueños y personal (admin / empleado)

- [ ] **Calendario**: medición con datos reales; optimizar llamadas solo si hay problema constatado.
- [x] Estado de **asistencia en un clic** (chips «Pendiente / Asistió / No asistió»).
- [x] **Avisos**: insignia numérica en menú «Citas» ante nuevas filas respecto al último estado visto fuera de esa pantalla (API); **polling** cada 8 s ya refresca datos; botón «Actualizar lista» en Citas + toasts breves.
- [x] **Permisos**: menú ya acota «Empleados» y «Configuración» a administrador del negocio; revisión más amplia si aparecen nuevas rutas.
- [x] **Coherencia credenciales demo**: `admin-spa@azenda.dev` ↔ `azenda123` en documentación de pruebas.

---

## Plataforma y sensación de “producto serio”

- [x] **Rendimiento y estabilidad (MVP)** — CI en GitHub + [`CHECKLIST_PRE_RELEASE.md`](CHECKLIST_PRE_RELEASE.md) antes de releases.
- [x] **Onboarding del negocio** (primer nivel): tarjeta «Primeros pasos» en **Configuración** con enlaces a inventario y flujo del enlace público (**solo administrador del tenant**).
- [x] **Comunicación tras reservar (MVP)** — `BookingNotificationService` en API (log + opcional `BOOKING_NOTIFY_EMAIL`); email transaccional al cliente con SMTP = integración futura.
- [x] **Recordatorios WhatsApp manuales** (`wa.me` al cliente + marcar enviado; enlace al negocio tras reservar); sin Meta Cloud API.
- [ ] **Push al staff** ante cambios concretos (websocket o notificación explícita más allá del polling).

---

## Sugerencia de orden de ejecución (siguiente oleada)

1. Canal de **email transaccional** (confirmación al cliente + copia opcional al negocio).
2. **Recordatorios** programados si hay proveedor SMTP/SMS definido.
3. **Reseñas** enlazadas a datos reales (o integración externa).
