import { MontoInvalido, PagoExcedeSaldo } from './errores';
import { type Centavos, esCentavosValidos, formatearMonto } from './dinero';

/** Un pago debe ser positivo y no superar el saldo pendiente del jornal (RF-09, RF-12, RN-02). */
export function validarPago(saldo: Centavos, montoPago: Centavos): void {
  if (!esCentavosValidos(montoPago) || montoPago === 0) {
    throw new MontoInvalido('El pago debe ser mayor a cero.');
  }
  if (montoPago > saldo) throw new PagoExcedeSaldo(formatearMonto(saldo));
}
