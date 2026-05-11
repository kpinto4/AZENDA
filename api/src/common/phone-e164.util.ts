/**
 * Normaliza a dígitos E.164 sin prefijo "+" (enlaces wa.me y almacenamiento en cita).
 * Por defecto asume prefijo país `defaultCountryCode` (p. ej. "34") si el usuario introduce 9 dígitos nacionales.
 */
export function normalizePhoneToWaDigits(
  raw: string | undefined | null,
  defaultCountryCode: string,
): string | null {
  if (raw == null) {
    return null;
  }
  let d = raw.replace(/\D/g, '');
  if (!d) {
    return null;
  }
  const cc = defaultCountryCode.replace(/\D/g, '');
  if (d.startsWith('00')) {
    d = d.slice(2);
  }
  if (d.startsWith('0') && cc && d.length >= 9) {
    d = `${cc}${d.replace(/^0+/, '')}`;
  }
  if (cc && d.length === 9 && /^\d{9}$/.test(d)) {
    d = `${cc}${d}`;
  }
  if (d.length < 10 || d.length > 15) {
    return null;
  }
  return d;
}
