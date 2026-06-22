export type CommercialPlanKey = 'Básico' | 'Pro' | 'Negocio';

export type CheckoutPaymentMethodId =
  | 'tarjeta'
  | 'nequi'
  | 'transferencia'
  | 'efecty';

export interface PlanCheckoutFeature {
  label: string;
  value: string;
}

export interface PlanCheckoutMeta {
  key: CommercialPlanKey;
  tagline: string;
  features: PlanCheckoutFeature[];
  popular?: boolean;
}

export interface CheckoutPaymentMethod {
  id: CheckoutPaymentMethodId;
  label: string;
  hint?: string;
}

/** Metadatos de planes para el comparador estilo Netflix. */
export const CHECKOUT_PLANS: PlanCheckoutMeta[] = [
  {
    key: 'Básico',
    tagline: 'Citas y reservas',
    features: [
      { label: 'Precio mensual', value: '—' },
      { label: 'Módulos', value: 'Citas + reserva pública' },
      { label: 'Equipo', value: '1 empleado' },
      { label: 'Recordatorios', value: 'Enlaces WhatsApp' },
    ],
  },
  {
    key: 'Pro',
    tagline: 'Ventas y equipo',
    popular: true,
    features: [
      { label: 'Precio mensual', value: '—' },
      { label: 'Módulos', value: 'Citas + ventas POS' },
      { label: 'Equipo', value: 'Hasta 10 empleados' },
      { label: 'Catálogo', value: 'Servicios y productos' },
    ],
  },
  {
    key: 'Negocio',
    tagline: 'Operación completa',
    features: [
      { label: 'Precio mensual', value: '—' },
      { label: 'Módulos', value: 'Citas + ventas + inventario' },
      { label: 'Equipo', value: 'Uso amplio del equipo' },
      { label: 'Soporte', value: 'Prioritario' },
    ],
  },
];

export const CHECKOUT_PAYMENT_METHODS: CheckoutPaymentMethod[] = [
  {
    id: 'tarjeta',
    label: 'Tarjeta de crédito o débito',
    hint: 'Visa, Mastercard, PSE',
  },
  {
    id: 'nequi',
    label: 'Nequi / Daviplata',
    hint: 'Pago móvil en Colombia',
  },
  {
    id: 'transferencia',
    label: 'Transferencia bancaria',
    hint: 'Bancolombia, Davivienda…',
  },
  {
    id: 'efecty',
    label: 'Efecty u otros corresponsales',
    hint: 'Pago en efectivo con referencia',
  },
];

/** Activar en `true` cuando la pasarela (Wompi/PayU) esté aprobada e integrada. */
export const CHECKOUT_PASARELA_ENABLED = false;

/**
 * Enlaces de pago por plan y método. Solo se usan si CHECKOUT_PASARELA_ENABLED es true.
 */
export const PLAN_PAYMENT_LINKS: Record<
  CommercialPlanKey,
  Partial<Record<CheckoutPaymentMethodId, string>>
> = {
  Básico: {
    tarjeta: 'https://checkout.wompi.co/l/azenda-basico-tarjeta',
    nequi: 'https://checkout.wompi.co/l/azenda-basico-nequi',
    transferencia: 'https://checkout.wompi.co/l/azenda-basico-transferencia',
    efecty: 'https://checkout.wompi.co/l/azenda-basico-efecty',
  },
  Pro: {
    tarjeta: 'https://checkout.wompi.co/l/azenda-pro-tarjeta',
    nequi: 'https://checkout.wompi.co/l/azenda-pro-nequi',
    transferencia: 'https://checkout.wompi.co/l/azenda-pro-transferencia',
    efecty: 'https://checkout.wompi.co/l/azenda-pro-efecty',
  },
  Negocio: {
    tarjeta: 'https://checkout.wompi.co/l/azenda-negocio-tarjeta',
    nequi: 'https://checkout.wompi.co/l/azenda-negocio-nequi',
    transferencia: 'https://checkout.wompi.co/l/azenda-negocio-transferencia',
    efecty: 'https://checkout.wompi.co/l/azenda-negocio-efecty',
  },
};
