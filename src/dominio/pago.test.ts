import { validarPago } from './pago';
import { MontoInvalido, PagoExcedeSaldo } from './errores';

describe('RF-12: un pago no puede superar el saldo', () => {
  test('pago total es válido', () => {
    expect(() => validarPago(2000, 2000)).not.toThrow();
  });

  test('pago parcial es válido', () => {
    expect(() => validarPago(2000, 1)).not.toThrow();
  });

  test('pago mayor al saldo se rechaza con el saldo en el mensaje', () => {
    expect(() => validarPago(1000, 1001)).toThrow(PagoExcedeSaldo);
    expect(() => validarPago(1000, 1001)).toThrow('El pago no puede ser mayor a $10,00.');
  });

  test('pago sobre un jornal ya pagado se rechaza', () => {
    expect(() => validarPago(0, 1)).toThrow(PagoExcedeSaldo);
  });

  test.each([0, -100, 10.5])('pago de %p se rechaza', (monto) => {
    expect(() => validarPago(2000, monto)).toThrow(MontoInvalido);
  });
});
