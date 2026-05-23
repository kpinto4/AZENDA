export interface PosPaymentMethod {
  id: string;
  label: string;
  enabled: boolean;
  detail: string;
}

export const DEFAULT_POS_PAYMENT_METHODS: PosPaymentMethod[] = [
  { id: 'efectivo', label: 'Efectivo', enabled: true, detail: '' },
  { id: 'tarjeta', label: 'Tarjeta / datáfono', enabled: true, detail: '' },
  { id: 'transferencia', label: 'Transferencia', enabled: false, detail: '' },
  { id: 'nequi', label: 'Nequi', enabled: false, detail: '' },
  { id: 'daviplata', label: 'Daviplata', enabled: false, detail: '' },
];

export function parsePosPaymentMethodsJson(
  raw: string | null | undefined,
): PosPaymentMethod[] {
  if (!raw?.trim()) {
    return DEFAULT_POS_PAYMENT_METHODS.map((m) => ({ ...m }));
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return DEFAULT_POS_PAYMENT_METHODS.map((m) => ({ ...m }));
    }
    const out: PosPaymentMethod[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') {
        continue;
      }
      const o = item as Record<string, unknown>;
      const id = String(o['id'] ?? '').trim();
      const label = String(o['label'] ?? '').trim();
      if (!id || !label) {
        continue;
      }
      out.push({
        id,
        label,
        enabled: o['enabled'] !== false,
        detail: String(o['detail'] ?? '').trim(),
      });
    }
    return out.length ? out : DEFAULT_POS_PAYMENT_METHODS.map((m) => ({ ...m }));
  } catch {
    return DEFAULT_POS_PAYMENT_METHODS.map((m) => ({ ...m }));
  }
}

export function serializePosPaymentMethods(methods: PosPaymentMethod[]): string {
  return JSON.stringify(
    methods.map((m) => ({
      id: m.id,
      label: m.label.trim(),
      enabled: !!m.enabled,
      detail: m.detail.trim(),
    })),
  );
}

export function enabledPaymentMethodLabels(methods: PosPaymentMethod[]): string[] {
  return methods.filter((m) => m.enabled && m.label.trim()).map((m) => m.label.trim());
}

/** Solo efectivo no lleva cuenta/enlace; tarjeta puede tener link de pago. */
export function paymentMethodNeedsDetail(id: string): boolean {
  return id !== 'efectivo';
}

export function normalizeExternalUrl(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) {
    return null;
  }
  if (/^https?:\/\//i.test(t)) {
    return t;
  }
  if (/^(g\.page|maps\.|www\.)/i.test(t) || t.includes('google')) {
    return `https://${t.replace(/^\/+/, '')}`;
  }
  return null;
}
