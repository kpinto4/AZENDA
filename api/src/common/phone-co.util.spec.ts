import {
  isValidColombiaMobileInput,
  normalizeColombiaMobileDigits,
} from './phone-co.util';

describe('phone-co.util', () => {
  it('acepta 10 digitos nacionales', () => {
    expect(normalizeColombiaMobileDigits('3001234567')).toBe('573001234567');
  });

  it('acepta prefijo +57', () => {
    expect(normalizeColombiaMobileDigits('+57 300 123 4567')).toBe('573001234567');
  });

  it('rechaza menos de 10 digitos o sin 3 inicial', () => {
    expect(normalizeColombiaMobileDigits('2001234567')).toBeNull();
    expect(normalizeColombiaMobileDigits('300123456')).toBeNull();
    expect(isValidColombiaMobileInput('')).toBe(false);
  });
});
