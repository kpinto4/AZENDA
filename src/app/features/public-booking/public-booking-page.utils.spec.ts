import {
  tabFromQuery,
  canClientRescheduleLookupAppointment,
  splitLookupYmdHhmm,
  LOOKUP_RESCHEDULE_MIN_LEAD_MS,
  normalizeColombiaMobileDigits,
  isValidColombiaMobileInput,
} from './public-booking-page.utils';

describe('public-booking-page.utils', () => {
  describe('tabFromQuery', () => {
    it('mapea tienda a catalogo', () => {
      expect(tabFromQuery('tienda')).toBe('catalogo');
    });
    it('por defecto reserva', () => {
      expect(tabFromQuery(null)).toBe('reserva');
      expect(tabFromQuery('')).toBe('reserva');
    });
  });

  describe('splitLookupYmdHhmm', () => {
    it('parsea fecha y franja', () => {
      expect(splitLookupYmdHhmm('2026-05-20 9:30')).toEqual({
        date: '2026-05-20',
        slot: '09:30',
      });
    });
    it('devuelve null si no coincide', () => {
      expect(splitLookupYmdHhmm('invalid')).toBeNull();
    });
  });

  describe('canClientRescheduleLookupAppointment', () => {
    it('permite si la cita esta lo bastante lejos', () => {
      const far = new Date(Date.now() + LOOKUP_RESCHEDULE_MIN_LEAD_MS + 60 * 60 * 1000);
      const y = far.getFullYear();
      const m = String(far.getMonth() + 1).padStart(2, '0');
      const d = String(far.getDate()).padStart(2, '0');
      const h = String(far.getHours()).padStart(2, '0');
      const min = String(far.getMinutes()).padStart(2, '0');
      expect(canClientRescheduleLookupAppointment(`${y}-${m}-${d} ${h}:${min}`)).toBe(true);
    });

    it('no permite si la cita es demasiado pronto', () => {
      const soon = new Date(Date.now() + 30 * 60 * 1000);
      const y = soon.getFullYear();
      const m = String(soon.getMonth() + 1).padStart(2, '0');
      const d = String(soon.getDate()).padStart(2, '0');
      const h = String(soon.getHours()).padStart(2, '0');
      const min = String(soon.getMinutes()).padStart(2, '0');
      expect(canClientRescheduleLookupAppointment(`${y}-${m}-${d} ${h}:${min}`)).toBe(false);
    });
  });

  describe('normalizeColombiaMobileDigits', () => {
    it('acepta movil nacional', () => {
      expect(normalizeColombiaMobileDigits('3001234567')).toBe('573001234567');
      expect(isValidColombiaMobileInput('+57 300 123 4567')).toBe(true);
    });

    it('rechaza numeros invalidos', () => {
      expect(normalizeColombiaMobileDigits('2001234567')).toBeNull();
    });
  });
});
