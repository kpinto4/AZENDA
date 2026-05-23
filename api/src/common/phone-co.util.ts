/** Móvil Colombia: 10 dígitos nacionales empezando por 3 → E.164 sin "+" (57…). */
export function normalizeColombiaMobileDigits(
  raw: string | undefined | null,
): string | null {
  if (raw == null) {
    return null;
  }
  let d = raw.replace(/\D/g, '');
  if (!d) {
    return null;
  }
  if (d.startsWith('00')) {
    d = d.slice(2);
  }
  if (d.startsWith('57') && d.length === 12) {
    d = d.slice(2);
  }
  if (!/^3\d{9}$/.test(d)) {
    return null;
  }
  return `57${d}`;
}

export function isValidColombiaMobileInput(raw: string | undefined | null): boolean {
  return normalizeColombiaMobileDigits(raw) != null;
}
