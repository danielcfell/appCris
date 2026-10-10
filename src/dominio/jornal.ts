import { CantidadInvalida, MontoInvalido, MontoMenorQuePagado } from './errores';
import { type Centavos, type Centesimas, esCentavosValidos, formatearMonto } from './dinero';

export type Unidad = 'dia' | 'tarea' | 'hora';
export const UNIDADES: readonly Unidad[] = ['dia', 'tarea', 'hora'];

export type EstadoJornal = 'pendiente' | 'parcial' | 'pagado';

/**
 * Monto del jornal = cantidad × tarifa, redondeado al centavo (half-up) (RF-07).
 * La misma fórmula está en el CHECK de la tabla `jornal`; si cambia aquí, cambia allá.
 */
export function calcularMonto(cantidad: Centesimas, tarifa: Centavos): Centavos {
  if (!Number.isSafeInteger(cantidad) || cantidad <= 0) throw new CantidadInvalida();
  if (!esCentavosValidos(tarifa) || tarifa === 0) throw new MontoInvalido('La tarifa debe ser mayor a cero.');
  const producto = cantidad * tarifa;
  if (!Number.isSafeInteger(producto)) throw new MontoInvalido('El monto es demasiado grande.');
  const monto = Math.floor((producto + 50) / 100);
  if (monto === 0) throw new MontoInvalido('El monto resultante es cero.');
  return monto;
}

/** Saldo = monto − pagado (RN-02). Un saldo negativo indica datos inconsistentes. */
export function calcularSaldo(monto: Centavos, pagado: Centavos): Centavos {
  const saldo = monto - pagado;
  if (saldo < 0) throw new MontoMenorQuePagado(formatearMonto(pagado));
  return saldo;
}

/** El estado no se guarda: se deriva de lo pagado (RN-01, RF-10). */
export function estadoJornal(monto: Centavos, pagado: Centavos): EstadoJornal {
  const saldo = calcularSaldo(monto, pagado);
  if (saldo === 0) return 'pagado';
  return pagado === 0 ? 'pendiente' : 'parcial';
}

/** Al editar un jornal, el monto nuevo no puede quedar por debajo de lo pagado (RN-02, RF-08). */
export function validarNuevoMonto(nuevoMonto: Centavos, pagado: Centavos): void {
  if (nuevoMonto < pagado) throw new MontoMenorQuePagado(formatearMonto(pagado));
}
