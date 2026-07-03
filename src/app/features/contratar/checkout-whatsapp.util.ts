import { CommercialPlanKey, CHECKOUT_MANUAL_PAYMENT } from './checkout.config';

/** Soporte Azenda (Colombia +57). */
export const AZENDA_WHATSAPP_E164 = '573245667724';

export const AZENDA_WHATSAPP_DISPLAY = '324 566 7724';

export function buildWhatsAppSupportUrl(message: string): string {
  return `https://wa.me/${AZENDA_WHATSAPP_E164}?text=${encodeURIComponent(message)}`;
}

function buildManualPaymentLines(): string {
  return CHECKOUT_MANUAL_PAYMENT.methods
    .map((m) => {
      const holder = m.holder ? ` (${m.holder})` : '';
      const note = m.note ? ` — ${m.note}` : '';
      return `• ${m.label}: ${m.accountDisplay}${holder}${note}`;
    })
    .join('\n');
}

export function buildRegistrationWhatsAppMessage(params: {
  business: string;
  email: string;
  plan: CommercialPlanKey | string;
  priceMonthly?: number;
}): string {
  const priceLine =
    params.priceMonthly != null && params.priceMonthly > 0
      ? `\nValor referencia plan: $${params.priceMonthly.toLocaleString('es-CO')} COP/mes`
      : '';
  return (
    `Hola, acabo de registrarme en Azenda.\n\n` +
    `Negocio: ${params.business}\n` +
    `Correo: ${params.email}\n` +
    `Plan elegido: ${params.plan}` +
    priceLine +
    `\n\nMedios de pago:\n${buildManualPaymentLines()}\n\n` +
    `Quiero confirmar el valor, coordinar el pago y activar mi panel. ` +
    `Adjuntaré el comprobante cuando realice el pago. Gracias.`
  );
}
