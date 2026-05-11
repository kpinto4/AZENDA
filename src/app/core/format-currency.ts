/**
 * Moneda por defecto en la app (Colombia).
 * Los importes numéricos en API/catálogo se interpretan como COP.
 */
const COP_FORMAT = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export function formatCop(amount: number): string {
  const n = Math.round(Number(amount));
  if (!Number.isFinite(n)) {
    return '—';
  }
  return COP_FORMAT.format(n);
}
