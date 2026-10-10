import type { Centavos, Centesimas } from '../dominio/dinero';
import { NoEncontrado } from '../dominio/errores';
import { calcularMonto, validarNuevoMonto } from '../dominio/jornal';
import type { BaseDatos } from '../datos/base-datos';
import * as repo from '../datos/jornales';

/**
 * Ajusta la cantidad o la tarifa de un jornal; el monto se recalcula (RF-06, RF-07, RF-08).
 * El monto nuevo no puede quedar por debajo de lo ya pagado (RN-02).
 */
export async function editarJornal(
  db: BaseDatos,
  jornalId: number,
  datos: { cantidad: Centesimas; tarifa: Centavos },
): Promise<void> {
  await db.transaccion(async (tx) => {
    const jornal = await repo.obtenerJornal(tx, jornalId);
    if (!jornal) throw new NoEncontrado('el jornal');
    const monto = calcularMonto(datos.cantidad, datos.tarifa);
    validarNuevoMonto(monto, jornal.pagado);
    await repo.actualizarCantidadTarifa(tx, jornalId, { ...datos, monto });
  });
}

/**
 * Elimina un jornal junto con sus pagos (RF-08). La interfaz debe pedir confirmación
 * antes de llamar a esto si el jornal tiene pagos.
 */
export async function eliminarJornal(db: BaseDatos, jornalId: number): Promise<void> {
  await db.transaccion(async (tx) => {
    if ((await repo.eliminarJornal(tx, jornalId)) === 0) throw new NoEncontrado('el jornal');
  });
}
