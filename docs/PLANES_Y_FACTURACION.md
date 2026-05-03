# Planes y Facturacion de Tenants

Este documento describe la logica implementada para controlar ciclos de plan, contador de tiempo y prorrateo de upgrade.

## Objetivo

- Tener ciclo mensual o anual por tenant.
- Mostrar cuanto tiempo lleva/queda del ciclo actual.
- Simular upgrade justo (prorrateado) para cobrar solo la diferencia.

## Campos nuevos en `tenants`

- `billing_cycle`: `MONTHLY | YEARLY`
- `plan_price_monthly`: precio mensual vigente del plan actual
- `plan_price_yearly`: precio anual vigente del plan actual
- `subscription_started_at`: inicio historico de la suscripcion
- `current_period_start`: inicio del ciclo actual
- `current_period_end`: fin del ciclo actual
- `next_renewal_at`: siguiente fecha de renovacion (normalmente igual a `current_period_end`)

Notas:
- Se agregan automaticamente por migracion si no existen.
- Si hay datos viejos/invalidos, se normaliza el periodo al siguiente ciclo valido.

## Endpoints nuevos

### 1) Estado de facturacion (contador)

`GET /api/tenant/billing/status`

Requiere usuario `ADMIN` del tenant.

Respuesta principal:
- `plan`
- `status`
- `billing.cycle`
- `billing.currentPeriodStart`
- `billing.currentPeriodEnd`
- `billing.nextRenewalAt`
- `billing.daysTotal`
- `billing.daysElapsed`
- `billing.daysRemaining`
- `billing.progressPct`
- `billing.monthlyPrice`
- `billing.yearlyPrice`

### 2) Simulacion de upgrade con prorrateo

`POST /api/tenant/billing/upgrade-quote`

Body:

```json
{
  "targetPlan": "Pro",
  "targetCycle": "MONTHLY",
  "targetMonthlyPrice": 59,
  "targetYearlyPrice": 590
}
```

Respuesta:
- `creditAmount`: credito por tiempo no usado del plan actual
- `targetCostForRemaining`: costo del nuevo plan para el tiempo restante
- `amountDueNow`: monto a cobrar ahora (si es positivo)
- `carryOverBalance`: saldo a favor (si la diferencia es negativa)
- `period.remainingDays`, `period.totalDays`

## Formula de prorrateo

1. `ratioRemaining = remainingDays / totalDays`
2. `creditAmount = precioCicloActual * ratioRemaining`
3. `targetCostForRemaining = precioCicloDestino * ratioRemaining`
4. `amountDueNow = max(0, targetCostForRemaining - creditAmount)`
5. `carryOverBalance = max(0, creditAmount - targetCostForRemaining)`

## Reglas actuales

- El calculo usa el ciclo actual guardado en el tenant (`MONTHLY` o `YEARLY`).
- Si el ciclo esta vencido, el sistema mueve el periodo al ciclo vigente antes de calcular.
- Este paso implementa **simulacion** (quote), no cobra automaticamente.

## Flujo recomendado para produccion

1. Mostrar `GET /billing/status` en panel tenant.
2. Cuando el cliente quiera cambiar plan, llamar `POST /billing/upgrade-quote`.
3. Confirmar pago en pasarela.
4. Aplicar cambio real de plan/ciclo/precio y abrir nuevo periodo.
5. Guardar transaccion en tabla de movimientos (siguiente fase).

## Siguiente fase sugerida

- Tabla `billing_transactions` para auditoria.
- Job diario de renovaciones (`PAST_DUE`, gracia, bloqueo).
- Integracion pasarela (Stripe/MercadoPago/etc).

