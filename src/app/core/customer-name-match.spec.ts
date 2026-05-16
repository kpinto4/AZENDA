import { publicCustomerNameMatches } from './customer-name-match';

describe('publicCustomerNameMatches', () => {
  it('coincide con el nombre exacto', () => {
    expect(publicCustomerNameMatches('Ana G.', 'ana g.')).toBe(true);
  });

  it('coincide con la parte antes del separador ·', () => {
    expect(publicCustomerNameMatches('Ana G. · +57 300', 'Ana G.')).toBe(true);
  });

  it('no coincide si el input no es el prefijo', () => {
    expect(publicCustomerNameMatches('Ana G.', 'Luis')).toBe(false);
  });
});
