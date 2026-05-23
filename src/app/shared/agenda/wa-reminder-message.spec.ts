import {
  buildWaReminderMessage,
  formatWhenForWaReminder,
  isTechnicalEmployeeLabel,
} from './agenda-calendar.utils';

describe('wa reminder message', () => {
  it('formatea hoy y mañana de forma clara', () => {
    const now = new Date(2026, 4, 22, 8, 0, 0);
    expect(formatWhenForWaReminder('2026-05-22T10:00:00', now)).toBe(
      'hoy, vie 22 de mayo a las 10:00',
    );
    expect(formatWhenForWaReminder('2026-05-23T15:30:00', now)).toBe(
      'mañana, sáb 23 de mayo a las 15:30',
    );
  });

  it('arma un recordatorio amigable sin referencia técnica', () => {
    const text = buildWaReminderMessage({
      customerName: 'María López',
      service: 'Masaje relajante 60 min · EmpleadoId:abc123xyz',
      when: '2026-05-23T10:00:00',
      businessName: 'Spa Azenda',
      employeeName: 'abc123xyz789012',
    });
    expect(text).toContain('¡Hola, María!');
    expect(text).toContain('Spa Azenda');
    expect(text).toContain('Masaje relajante 60 min');
    expect(text).toContain('mañana, sáb 23 de mayo a las 10:00');
    expect(text).not.toContain('Ref:');
    expect(text).not.toContain('EmpleadoId');
    expect(text).not.toContain('abc123xyz');
  });

  it('incluye profesional si el nombre es legible', () => {
    const text = buildWaReminderMessage({
      customerName: 'Juan',
      service: 'Corte de cabello',
      when: '2026-05-25T09:00:00',
      businessName: 'Barbería Centro',
      employeeName: 'Laura Gómez',
    });
    expect(text).toContain('Profesional: Laura Gómez');
  });

  it('muestra un solo precio en el servicio según promo y fecha', () => {
    const text = buildWaReminderMessage({
      customerName: 'María',
      service: 'Masaje relajante 60 min · $ 45.000 · Promo $ 39.000 (Lunes a jueves)',
      when: '2026-05-21T10:00:00',
      businessName: 'Spa Azenda',
    });
    expect(text).toContain('Servicio: Masaje relajante 60 min · $ 39.000');
    expect(text).not.toContain('Promo');
    expect(text).not.toContain('$ 45.000');
  });

  it('usa precio base en fin de semana si la promo es lunes a jueves', () => {
    const text = buildWaReminderMessage({
      customerName: 'María',
      service: 'Masaje relajante 60 min · $ 45.000 · Promo $ 39.000 (Lunes a jueves)',
      when: '2026-05-23T10:00:00',
      businessName: 'Spa Azenda',
    });
    expect(text).toContain('Servicio: Masaje relajante 60 min · $ 45.000');
    expect(text).not.toContain('Promo');
    expect(text).not.toContain('$ 39.000');
  });

  it('detecta ids técnicos de empleado', () => {
    expect(isTechnicalEmployeeLabel('usr_8f3k2m9x1qwe')).toBe(true);
    expect(isTechnicalEmployeeLabel('Laura')).toBe(false);
  });
});
