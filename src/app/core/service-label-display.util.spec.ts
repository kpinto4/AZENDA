import {
  effectiveCatalogServicePrice,
  formatServiceForClientMessage,
  isPromoActiveForAppointmentDate,
} from './service-label-display.util';
import { isPromoActiveForDate } from './promo-schedule.util';

describe('service-label-display.util', () => {
  describe('isPromoActiveForAppointmentDate', () => {
    it('activa promo lunes a jueves en miércoles', () => {
      expect(
        isPromoActiveForDate(
          {
            promoEnabled: true,
            promoPrice: 39,
            promoScheduleType: 'weekdays',
            promoDays: [1, 2, 3, 4],
            promoStartDate: null,
            promoEndDate: null,
            promoLabel: 'Lun, Mar, Mié, Jue',
          },
          '2026-05-20T10:00:00',
        ),
      ).toBe(true);
    });

    it('desactiva promo lunes a jueves en viernes', () => {
      expect(
        isPromoActiveForDate(
          {
            promoEnabled: true,
            promoPrice: 39,
            promoScheduleType: 'weekdays',
            promoDays: [1, 2, 3, 4],
            promoStartDate: null,
            promoEndDate: null,
            promoLabel: 'Lun, Mar, Mié, Jue',
          },
          '2026-05-22T10:00:00',
        ),
      ).toBe(false);
    });

    it('activa promo por rango de fechas', () => {
      expect(
        isPromoActiveForDate(
          {
            promoEnabled: true,
            promoPrice: 30,
            promoScheduleType: 'date_range',
            promoDays: [],
            promoStartDate: '2026-05-01',
            promoEndDate: '2026-05-31',
            promoLabel: null,
          },
          '2026-05-15',
        ),
      ).toBe(true);
    });
  });

  describe('formatServiceForClientMessage', () => {
    it('muestra solo precio promo cuando aplica', () => {
      const label =
        'Masaje relajante 60 min · $ 45.000 · Promo $ 39.000 (Lunes a jueves)';
      expect(formatServiceForClientMessage(label, '2026-05-21T10:00:00')).toBe(
        'Masaje relajante 60 min · $ 39.000',
      );
    });

    it('muestra solo precio base cuando la promo no aplica', () => {
      const label =
        'Masaje relajante 60 min · $ 45.000 · Promo $ 39.000 (Lunes a jueves)';
      expect(formatServiceForClientMessage(label, '2026-05-23T10:00:00')).toBe(
        'Masaje relajante 60 min · $ 45.000',
      );
    });

    it('muestra un solo precio si no hay promo', () => {
      expect(formatServiceForClientMessage('Corte clásico · $ 15.000', '2026-05-23T10:00:00')).toBe(
        'Corte clásico · $ 15.000',
      );
    });
  });

  describe('effectiveCatalogServicePrice', () => {
    it('usa promo en catálogo cuando la fecha califica', () => {
      expect(
        effectiveCatalogServicePrice(
          {
            price: 45,
            promoEnabled: true,
            promoPrice: 39,
            promoScheduleType: 'weekdays',
            promoDays: [1, 2, 3, 4],
            promoStartDate: null,
            promoEndDate: null,
            promoLabel: 'Lun, Mar, Mié, Jue',
          },
          '2026-05-20',
        ),
      ).toBe(39);
    });

    it('usa precio base fuera de la promo', () => {
      expect(
        effectiveCatalogServicePrice(
          {
            price: 45,
            promoEnabled: true,
            promoPrice: 39,
            promoScheduleType: 'weekdays',
            promoDays: [1, 2, 3, 4],
            promoStartDate: null,
            promoEndDate: null,
            promoLabel: 'Lun, Mar, Mié, Jue',
          },
          '2026-05-23',
        ),
      ).toBe(45);
    });
  });
});
