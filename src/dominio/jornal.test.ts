import { calcularMonto, calcularSaldo, estadoJornal, validarNuevoMonto } from './jornal';
import { CantidadInvalida, MontoInvalido, MontoMenorQuePagado } from './errores';

describe('RF-07: monto = cantidad × tarifa', () => {
  test.each([
    [100, 2000, 2000], // 1 día × $20 = $20
    [300, 1500, 4500], // 3 horas × $15 = $45
    [150, 1500, 2250], // 1,5 horas × $15 = $22,50
    [50, 1500, 750], // 0,5 horas × $15 = $7,50
    [33, 2000, 660], // 0,33 días × $20 = $6,60
    [50, 1, 1], // 0,5 × $0,01 = $0,005 → redondea a $0,01 (half-up)
    [149, 1, 1], // 1,49 × $0,01 = $0,0149 → $0,01
    [151, 1, 2], // 1,51 × $0,01 = $0,0151 → $0,02
  ])('cantidad %p centésimas × %p centavos = %p centavos', (cantidad, tarifa, esperado) => {
    expect(calcularMonto(cantidad, tarifa)).toBe(esperado);
  });

  test('rechaza cantidad cero o negativa', () => {
    expect(() => calcularMonto(0, 2000)).toThrow(CantidadInvalida);
    expect(() => calcularMonto(-100, 2000)).toThrow(CantidadInvalida);
  });

  test('rechaza tarifa cero, negativa o con decimales', () => {
    expect(() => calcularMonto(100, 0)).toThrow(MontoInvalido);
    expect(() => calcularMonto(100, -1)).toThrow(MontoInvalido);
    expect(() => calcularMonto(100, 20.5)).toThrow(MontoInvalido);
  });

  test('rechaza un monto que redondea a cero', () => {
    expect(() => calcularMonto(1, 1)).toThrow(MontoInvalido);
  });
});

describe('RN-02: saldo = monto − pagado, nunca negativo', () => {
  test('saldo sin pagos es el monto completo', () => {
    expect(calcularSaldo(2000, 0)).toBe(2000);
  });

  test('saldo con pago parcial', () => {
    expect(calcularSaldo(2000, 500)).toBe(1500);
  });

  test('saldo cero cuando está pagado', () => {
    expect(calcularSaldo(2000, 2000)).toBe(0);
  });

  test('un pagado mayor al monto es inconsistente', () => {
    expect(() => calcularSaldo(2000, 2001)).toThrow(MontoMenorQuePagado);
  });

  test('al editar, el monto nuevo no puede ser menor a lo pagado', () => {
    expect(() => validarNuevoMonto(999, 1000)).toThrow(MontoMenorQuePagado);
    expect(() => validarNuevoMonto(1000, 1000)).not.toThrow();
  });
});

describe('RN-01 / RF-10: estado derivado de los pagos', () => {
  test('sin pagos: pendiente', () => {
    expect(estadoJornal(2000, 0)).toBe('pendiente');
  });

  test('pagado menos que el monto: parcial', () => {
    expect(estadoJornal(2000, 1)).toBe('parcial');
    expect(estadoJornal(2000, 1999)).toBe('parcial');
  });

  test('pagado igual al monto: pagado', () => {
    expect(estadoJornal(2000, 2000)).toBe('pagado');
  });
});
