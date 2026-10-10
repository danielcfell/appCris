import type { Centavos } from '../dominio/dinero';
import { NoEncontrado } from '../dominio/errores';
import { validarFecha, type Fecha } from '../dominio/fecha';
import { validarPago } from '../dominio/pago';
import type { BaseDatos, Consultas } from '../datos/base-datos';
import { listarPendientesDeActividad, listarPendientesDeTrabajador, obtenerJornal, type JornalDetallado } from '../datos/jornales';
import { insertarPago } from '../datos/pagos';
import { marcaTiempo } from './comun';

/** Pago total o parcial sobre un jornal; nunca mayor al saldo (RF-09, RF-12). */
export async function registrarPago(
  db: BaseDatos,
  datos: { jornalId: number; monto: Centavos; fecha: Fecha },
): Promise<number> {
  const fecha = validarFecha(datos.fecha);
  return db.transaccion(async (tx) => {
    const jornal = await obtenerJornal(tx, datos.jornalId);
    if (!jornal) throw new NoEncontrado('el jornal');
    validarPago(jornal.saldo, datos.monto);
    return insertarPago(tx, { jornalId: jornal.id, fecha, monto: datos.monto }, marcaTiempo());
  });
}

export interface ResultadoPagoTotal {
  pagos: number;
  total: Centavos;
}

async function pagarSaldos(tx: Consultas, jornales: JornalDetallado[], fecha: Fecha): Promise<ResultadoPagoTotal> {
  const creadoEn = marcaTiempo();
  let total = 0;
  for (const j of jornales) {
    await insertarPago(tx, { jornalId: j.id, fecha, monto: j.saldo }, creadoEn);
    total += j.saldo;
  }
  return { pagos: jornales.length, total };
}

/** Paga de una vez todo lo pendiente de un trabajador: un pago por jornal (RF-11). */
export async function pagarPendientesDeTrabajador(
  db: BaseDatos,
  trabajadorId: number,
  fecha: Fecha,
): Promise<ResultadoPagoTotal> {
  validarFecha(fecha);
  return db.transaccion(async (tx) => pagarSaldos(tx, await listarPendientesDeTrabajador(tx, trabajadorId), fecha));
}

/** Paga de una vez todo lo pendiente de una actividad (RF-11). */
export async function pagarPendientesDeActividad(
  db: BaseDatos,
  actividadId: number,
  fecha: Fecha,
): Promise<ResultadoPagoTotal> {
  validarFecha(fecha);
  return db.transaccion(async (tx) => pagarSaldos(tx, await listarPendientesDeActividad(tx, actividadId), fecha));
}
