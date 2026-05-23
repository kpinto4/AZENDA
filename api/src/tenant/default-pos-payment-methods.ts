export interface PosPaymentMethodConfig {
  id: string;
  label: string;
  enabled: boolean;
  detail: string;
}

export const DEFAULT_POS_PAYMENT_METHODS: PosPaymentMethodConfig[] = [
  { id: 'efectivo', label: 'Efectivo', enabled: true, detail: '' },
  { id: 'tarjeta', label: 'Tarjeta / datáfono', enabled: true, detail: '' },
  { id: 'transferencia', label: 'Transferencia', enabled: false, detail: '' },
  { id: 'nequi', label: 'Nequi', enabled: false, detail: '' },
  { id: 'daviplata', label: 'Daviplata', enabled: false, detail: '' },
];

export function defaultPosPaymentMethodsJson(): string {
  return JSON.stringify(DEFAULT_POS_PAYMENT_METHODS);
}

export function parsePosPaymentMethodsJson(
  raw: string | null | undefined,
): PosPaymentMethodConfig[] {
  if (!raw?.trim()) {
    return [...DEFAULT_POS_PAYMENT_METHODS];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [...DEFAULT_POS_PAYMENT_METHODS];
    }
    const out: PosPaymentMethodConfig[] = [];
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
    return out.length ? out : [...DEFAULT_POS_PAYMENT_METHODS];
  } catch {
    return [...DEFAULT_POS_PAYMENT_METHODS];
  }
}
