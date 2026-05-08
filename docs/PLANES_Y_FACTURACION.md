# Planes y facturación (tenant)

Documento operativo: **qué endpoints existen**, **qué devuelven** y **qué campos** en base los sustentan.

---

## Objetivo del módulo

| Qué resuelve | Descripción breve |
| --- | --- |
| Ciclo de facturación | Periodo actual del tenant (mensual o anual) con fechas de inicio/fin. |
| Contador de tiempo | Días transcurridos y restantes del periodo (para UI y lógica). |
| Simulación de upgrade | Cálculo de prorrateo **sin cobrar**; sirve para mostrar “cuánto pagaría ahora” antes de pasarela. |

---

## Endpoints

### `GET /api/tenant/billing/status`

| Pregunta | Respuesta |
| --- | --- |
| **Qué hace** | Devuelve el estado de facturación del tenant del usuario autenticado. |
| **Quién puede** | Usuario con rol de administración del tenant (según reglas del API). |
| **Para qué sirve en la app** | Mostrar plan, fechas del ciclo, progreso y precios vigentes. |

Campos típicos en la respuesta (nombres pueden variar según DTO): plan, estado del tenant, ciclo (`MONTHLY` / `YEARLY`), fechas de periodo, días totales/transcurridos/restantes, porcentaje de progreso, precios mensual/anual.

---

### `POST /api/tenant/billing/upgrade-quote`

| Pregunta | Respuesta |
| --- | --- |
| **Qué hace** | Calcula una **cotización** de cambio de plan/ciclo usando prorrateo sobre el tiempo restante del periodo actual. |
| **Qué no hace** | **No** cobra, **no** cambia el plan en base; es solo simulación. |
| **Quién puede** | Usuario admin del tenant (según API). |

Body mínimo de ejemplo:

```json
{
  "targetPlan": "Pro",
  "targetCycle": "MONTHLY"
}
```

| Campo del body | Significado |
| --- | --- |
| `targetPlan` | Plan al que se quiere migrar (debe existir en catálogo / reglas del sistema). |
| `targetCycle` | `MONTHLY` o `YEARLY` para el plan destino. |

Respuesta útil (conceptos): crédito por tiempo no usado, costo del nuevo plan en el tiempo restante, monto a pagar ahora si aplica, saldo a favor si aplica, y detalle de días del periodo.

---

## Campos en tabla `tenants` (referencia)

| Campo | Qué representa |
| --- | --- |
| `billing_cycle` | `MONTHLY` o `YEARLY`: ritmo de facturación del tenant. |
| `plan_price_monthly` | Precio mensual vigente del plan actual (según catálogo/sincronización). |
| `plan_price_yearly` | Precio anual vigente del plan actual. |
| `subscription_started_at` | Marca de inicio histórico de la suscripción. |
| `current_period_start` | Inicio del periodo de facturación actual. |
| `current_period_end` | Fin del periodo actual. |
| `next_renewal_at` | Próxima renovación (suele alinearse con fin de periodo). |

---

## Regla de prorrateo (resumen)

Se usa el **tiempo restante** del periodo actual frente al **precio del ciclo** actual y del destino:

1. `ratioRemaining = remainingDays / totalDays`
2. `creditAmount = precioCicloActual * ratioRemaining`
3. `targetCostForRemaining = precioCicloDestino * ratioRemaining`
4. `amountDueNow = max(0, targetCostForRemaining - creditAmount)`
5. `carryOverBalance = max(0, creditAmount - targetCostForRemaining)`

Si el periodo está desfasado, el backend puede **normalizar** fechas antes de calcular (comportamiento implementado en servicio de BD).

---

## Flujo recomendado (producto)

1. Pantalla llama `GET /api/tenant/billing/status` y muestra estado del ciclo.
2. Usuario elige nuevo plan/ciclo; la UI llama `POST /api/tenant/billing/upgrade-quote` y muestra números.
3. Tras pasarela de pago (futuro / integración externa), el backend aplicaría el cambio real de plan y periodo (fuera del alcance de solo “quote”).

---

## Más ayuda operativa

Comandos, despliegue y pruebas: [PRUEBAS_SISTEMA.md](PRUEBAS_SISTEMA.md).
