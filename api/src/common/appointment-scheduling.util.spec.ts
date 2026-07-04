import {
  appointmentInterval,
  employeesBlockedInRange,
  isSlotAvailableForEmployee,
  resolveDurationForServiceLabel,
} from './appointment-scheduling.util';
import type { TenantServiceEntity } from '../infrastructure/sql-db/sql-db.types';

const catalog: TenantServiceEntity[] = [
  {
    id: 's1',
    tenantId: 't1',
    name: 'Masaje descontracturante',
    description: null,
    price: 50,
    promoPrice: null,
    promoLabel: null,
    durationMinutes: 45,
    catalogOrder: 0,
  },
];

describe('appointment-scheduling.util', () => {
  it('resuelve duracion desde catalogo', () => {
    expect(
      resolveDurationForServiceLabel(
        'Masaje descontracturante · $ 50.000',
        catalog,
      ),
    ).toBe(45);
  });

  it('bloquea segundo hueco cuando la cita ocupa 45 min', () => {
    const intervals = [
      appointmentInterval(
        {
          when: '2026-05-23 09:30',
          service: 'Masaje descontracturante · EmpleadoId:emp1',
          durationMinutes: 45,
        },
        catalog,
      )!,
    ];
    const employeeIds = ['emp1'];
    const blocked0930 = employeesBlockedInRange(
      appointmentInterval(
        { when: '2026-05-23 09:30', service: 'x', durationMinutes: 45 },
        catalog,
      )!.startMs,
      appointmentInterval(
        { when: '2026-05-23 09:30', service: 'x', durationMinutes: 45 },
        catalog,
      )!.endMs,
      employeeIds,
      intervals,
    );
    expect(blocked0930.has('emp1')).toBe(true);

    expect(
      isSlotAvailableForEmployee(
        '2026-05-23',
        '10:00',
        45,
        'emp1',
        employeeIds,
        intervals,
        20 * 60,
      ),
    ).toBe(false);

    expect(
      isSlotAvailableForEmployee(
        '2026-05-23',
        '10:30',
        45,
        'emp1',
        employeeIds,
        intervals,
        20 * 60,
      ),
    ).toBe(true);
  });

  it('bloquea 09:30 cuando hay cita de 60 min a las 09:00', () => {
    const catalog60: TenantServiceEntity[] = [
      {
        id: 's2',
        tenantId: 't1',
        name: 'Masaje relajante 60 min',
        description: null,
        price: 45,
        promoPrice: null,
        promoLabel: null,
        durationMinutes: 30,
        catalogOrder: 0,
      },
    ];
    const intervals = [
      appointmentInterval(
        {
          when: '2026-05-23 09:00',
          service: 'Masaje relajante 60 min · $ 45.000 · EmpleadoId:emp1',
          durationMinutes: null,
        },
        catalog60,
      )!,
    ];
    expect(intervals[0]!.endMs - intervals[0]!.startMs).toBe(60 * 60_000);
    expect(
      isSlotAvailableForEmployee(
        '2026-05-23',
        '09:30',
        45,
        'emp1',
        ['emp1'],
        intervals,
        20 * 60,
      ),
    ).toBe(false);
  });

  it('bloquea 09:00 para servicio de 70 min si hay cita a las 10:00', () => {
    const intervals = [
      appointmentInterval(
        {
          when: '2026-05-23 10:00',
          service: 'Masaje · EmpleadoId:emp1',
          durationMinutes: 60,
        },
        catalog,
      )!,
    ];
    expect(
      isSlotAvailableForEmployee(
        '2026-05-23',
        '09:00',
        70,
        'emp1',
        ['emp1'],
        intervals,
        20 * 60,
      ),
    ).toBe(false);
  });

  it('suma duracion de varios servicios en una cita', () => {
    const multiCatalog: TenantServiceEntity[] = [
      ...catalog,
      {
        id: 's3',
        tenantId: 't1',
        name: 'Facial express',
        description: null,
        price: 40,
        promoPrice: null,
        promoLabel: null,
        durationMinutes: 25,
        catalogOrder: 1,
      },
    ];
    const label = `Masaje descontracturante · $ 50.000 || Facial express · $ 40.000`;
    expect(resolveDurationForServiceLabel(label, multiCatalog)).toBe(70);
  });
});
