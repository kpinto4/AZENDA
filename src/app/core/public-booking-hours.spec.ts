import { parseWeeklyHoursJson, weeklyHoursToJson } from './public-booking-hours';

describe('public-booking-hours', () => {
  it('parsea JSON valido con un dia', () => {
    const raw = JSON.stringify({
      mon: [{ open: '09:00', close: '13:00' }],
    });
    const h = parseWeeklyHoursJson(raw);
    expect(h?.mon?.length).toBe(1);
    expect(h?.mon?.[0]).toEqual({ open: '09:00', close: '13:00' });
  });

  it('rechaza JSON invalido', () => {
    expect(parseWeeklyHoursJson('')).toBeNull();
    expect(parseWeeklyHoursJson('[]')).toBeNull();
    expect(parseWeeklyHoursJson('{"mon":[{"open":"99:00","close":"10:00"}]}')).toBeNull();
  });

  it('weeklyHoursToJson es inversa estable', () => {
    const h = { tue: [{ open: '10:00', close: '11:00' }] };
    expect(parseWeeklyHoursJson(weeklyHoursToJson(h))).toEqual(h);
  });
});
