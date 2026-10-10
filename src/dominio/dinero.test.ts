import { formatearCantidad, formatearMonto, parsearCantidad, parsearMonto } from './dinero';
import { CantidadInvalida, MontoInvalido } from './errores';

describe('RNF-02: dinero en centavos enteros', () => {
  test.each([
    ['20', 2000],
    ['20,5', 2050],
    ['20,50', 2050],
    ['20.50', 2050],
    [' 7,05 ', 705],
    ['0', 0],
    ['0,01', 1],
  ])('parsearMonto(%p) = %p centavos', (texto, esperado) => {
    expect(parsearMonto(texto)).toBe(esperado);
  });

  test.each(['', '-1', '20,505', 'abc', '1.234,50', '20,', ',5', '1e3'])(
    'parsearMonto rechaza %p',
    (texto) => {
      expect(() => parsearMonto(texto)).toThrow(MontoInvalido);
    },
  );

  test('nunca produce decimales flotantes (0,1 + 0,2)', () => {
    expect(parsearMonto('0,10') + parsearMonto('0,20')).toBe(parsearMonto('0,30'));
  });

  test.each([
    [0, '$0,00'],
    [5, '$0,05'],
    [2050, '$20,50'],
    [123450, '$1.234,50'],
    [100000000, '$1.000.000,00'],
  ])('formatearMonto(%p) = %p', (centavos, esperado) => {
    expect(formatearMonto(centavos)).toBe(esperado);
  });

  test('formatearMonto rechaza negativos y decimales', () => {
    expect(() => formatearMonto(-1)).toThrow(MontoInvalido);
    expect(() => formatearMonto(1.5)).toThrow(MontoInvalido);
  });
});

describe('cantidades en centésimas', () => {
  test.each([
    ['1', 100],
    ['1,5', 150],
    ['0,5', 50],
    ['3', 300],
  ])('parsearCantidad(%p) = %p', (texto, esperado) => {
    expect(parsearCantidad(texto)).toBe(esperado);
  });

  test.each(['0', '0,00', '-1', ''])('parsearCantidad rechaza %p', (texto) => {
    expect(() => parsearCantidad(texto)).toThrow(CantidadInvalida);
  });

  test.each([
    [100, '1'],
    [150, '1,5'],
    [125, '1,25'],
  ])('formatearCantidad(%p) = %p', (centesimas, esperado) => {
    expect(formatearCantidad(centesimas)).toBe(esperado);
  });
});
