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
      { label: 'Equipo', value: 'Hasta 4 empleados' },
      { label: 'Catálogo', value: 'Servicios y productos' },
    ],
  },
  {
    key: 'Negocio',
    tagline: 'Operación completa',
    features: [
      { label: 'Precio mensual', value: '—' },
      { label: 'Módulos', value: 'Citas + ventas + inventario' },
      { label: 'Equipo', value: 'Hasta 8 empleados' },
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

/** Pago en línea con links de Wompi (un link por plan, monto fijo). */
export const CHECKOUT_PASARELA_ENABLED = true;

export interface ManualPaymentMethod {
  id: string;
  label: string;
  accountDisplay: string;
  holder: string;
  note?: string;
}

/** Medios de pago alternativos (personalización o si Wompi no aplica). */
export const CHECKOUT_MANUAL_PAYMENT = {
  afterPayNote:
    'Si pagaste por otro medio, envía el comprobante por WhatsApp para activar tu panel.',
  methods: [
    {
      id: 'nequi',
      label: 'Nequi / Daviplata',
      accountDisplay: '324 566 7724',
      holder: 'Azenda',
    },
    {
      id: 'bancolombia',
      label: 'Transferencia Bancolombia',
      accountDisplay: 'Te confirmamos el número de cuenta por WhatsApp',
      holder: 'Azenda',
      note: 'Cuenta de ahorros',
    },
  ] satisfies ManualPaymentMethod[],
};

/**
 * Link de pago Wompi por plan (monto fijo en el panel de Wompi).
 * Un solo enlace acepta los medios que configures en Wompi.
 */
export const PLAN_WOMPI_LINKS: Record<CommercialPlanKey, string> = {
  Básico: 'https://checkout.wompi.co/l/MJJ4K7',
  Pro: 'https://checkout.wompi.co/l/7ojDEk',
  Negocio: 'https://checkout.wompi.co/l/u6ZpcG',
};

/** @deprecated Usar PLAN_WOMPI_LINKS. Se mantiene por compatibilidad. */
export const PLAN_PAYMENT_LINKS: Record<
  CommercialPlanKey,
  Partial<Record<CheckoutPaymentMethodId, string>>
> = {
  Básico: { tarjeta: PLAN_WOMPI_LINKS.Básico },
  Pro: { tarjeta: PLAN_WOMPI_LINKS.Pro },
  Negocio: { tarjeta: PLAN_WOMPI_LINKS.Negocio },
};

export function wompiLinkForPlan(plan: CommercialPlanKey | string | null | undefined): string | undefined {
  if (!plan) {
    return undefined;
  }
  return PLAN_WOMPI_LINKS[plan as CommercialPlanKey];
}
