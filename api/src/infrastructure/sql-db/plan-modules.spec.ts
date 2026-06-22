import { defaultModulesForPlan } from './plan-modules';

describe('defaultModulesForPlan', () => {
  it('Trial solo incluye citas', () => {
    expect(defaultModulesForPlan('Trial')).toEqual({
      citas: true,
      ventas: false,
      inventario: false,
    });
  });

  it('Básico incluye citas y ventas', () => {
    expect(defaultModulesForPlan('Básico')).toEqual({
      citas: true,
      ventas: true,
      inventario: false,
    });
  });

  it('Pro y Negocio incluyen todos los módulos', () => {
    const all = { citas: true, ventas: true, inventario: true };
    expect(defaultModulesForPlan('Pro')).toEqual(all);
    expect(defaultModulesForPlan('Negocio')).toEqual(all);
  });
});
