import { formatCop } from './format-currency';
import {
  effectiveCatalogPrice,
  isPromoActiveForDate,
  type CatalogPromoFields,
} from './promo-schedule.util';

const COP_LABEL_RE = /^\$\s*[\d.,]+$/;
const PROMO_IN_LABEL_RE = /\s*·\s*Promo\s+(\$\s*[\d.,]+)(?:\s*\(([^)]+)\))?/i;

export type CatalogServicePriceInput = CatalogPromoFields & {
  price: number;
};

interface ParsedServiceSegment {
  name: string;
  basePrice: string | null;
  promoPrice: string | null;
  promoConditions: string | null;
}

export function effectiveCatalogServicePrice(
  service: CatalogServicePriceInput,
  when: string,
): number {
  return effectiveCatalogPrice(service.price, service, when);
}

function serviceNameOnly(rawName: string): string {
  const dash = rawName.indexOf(' — ');
  return (dash >= 0 ? rawName.slice(0, dash) : rawName).trim();
}

function parseServiceSegment(raw: string): ParsedServiceSegment {
  let segment = raw.replace(/\s*·\s*EmpleadoId:[A-Za-z0-9_-]+/g, '').trim();
  let promoPrice: string | null = null;
  let promoConditions: string | null = null;

  const promoMatch = PROMO_IN_LABEL_RE.exec(segment);
  if (promoMatch) {
    promoPrice = promoMatch[1].trim();
    promoConditions = promoMatch[2]?.trim() || null;
    segment = segment.slice(0, promoMatch.index).trim();
  }

  const parts = segment.split(' · ').map((p) => p.trim()).filter(Boolean);
  const name = serviceNameOnly(parts[0] ?? segment);
  let basePrice: string | null = null;
  for (let i = parts.length - 1; i >= 1; i--) {
    if (COP_LABEL_RE.test(parts[i])) {
      basePrice = parts[i];
      break;
    }
  }

  return { name, basePrice, promoPrice, promoConditions };
}

function parseCopLabel(label: string): number | null {
  const digits = label.replace(/[^\d]/g, '');
  if (!digits) {
    return null;
  }
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

function applicablePriceForLegacySegment(parsed: ParsedServiceSegment, when: string): string | null {
  if (parsed.promoPrice) {
    const promoAmount = parseCopLabel(parsed.promoPrice);
    const legacyFields: CatalogPromoFields = {
      promoEnabled: true,
      promoPrice: promoAmount,
      promoScheduleType: parsed.promoConditions ? 'weekdays' : 'always',
      promoDays: [],
      promoStartDate: null,
      promoEndDate: null,
      promoLabel: parsed.promoConditions,
    };
    if (promoAmount != null && isPromoActiveForDate(legacyFields, when)) {
      return parsed.promoPrice;
    }
  }
  return parsed.basePrice;
}

/**
 * Nombre del servicio y un solo precio aplicable (promo solo si corresponde a la fecha).
 */
export function formatServiceForClientMessage(service: string, when: string): string {
  const withoutEmp = service.replace(/\s*·\s*EmpleadoId:[A-Za-z0-9_-]+/g, '').trim();
  if (!withoutEmp) {
    return '';
  }

  const segments = withoutEmp.includes(' || ')
    ? withoutEmp.split(' || ').map((part) => part.trim()).filter(Boolean)
    : [withoutEmp];

  return segments
    .map((segment) => {
      const parsed = parseServiceSegment(segment);
      const price = applicablePriceForLegacySegment(parsed, when);
      return price ? `${parsed.name} · ${price}` : parsed.name;
    })
    .filter(Boolean)
    .join(' + ');
}

/** Precio formateado para fila de catálogo según fecha elegida. */
export function formatCatalogServicePriceLabel(
  service: CatalogServicePriceInput,
  when: string,
): string {
  return formatCop(effectiveCatalogServicePrice(service, when));
}

// Re-export for specs and callers
export { isPromoActiveForDate as isPromoActiveForAppointmentDate } from './promo-schedule.util';
