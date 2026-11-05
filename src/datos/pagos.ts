import type { Centavos } from '../dominio/dinero';
import type { Fecha } from '../dominio/fecha';
import type { Consultas } from './base-datos';
import { clausulaCultivo, type FiltroCultivo } from './filtro-cultivo';

export interface Pago {
  id: number;
  jornalId: number;
  fecha: Fecha;
  monto: Centavos;
}

/** Pago con la actividad a la que corresponde, para el historial (RF-14). */
export interface PagoDetallado extends Pago {
  descripcion: string;
  fechaActividad: Fecha;
}

export async function insertarPago(
  db: Consultas,
  datos: { jornalId: number; fecha: Fecha; monto: Centavos },
  creadoEn: string,
): Promise<number> {
  const r = await db.ejecutar('INSERT INTO pago (jornal_id, fecha, monto_centavos, creado_en) VALUES (?, ?, ?, ?)', [
    datos.jornalId,
    datos.fecha,
    datos.monto,
    creadoEn,
  ]);
  return r.ultimoId;
}

export async function listarPagosDeJornal(db: Consultas, jornalId: number): Promise<Pago[]> {
  return db.consultar<Pago>(
    `SELECT id, jornal_id AS jornalId, fecha, monto_centavos AS monto
     FROM pago WHERE jornal_id = ? ORDER BY fecha, id`,
    [jornalId],
  );
}

/** Historial de pagos de un trabajador, del más reciente al más antiguo. Se puede acotar a un cultivo (RF-29). */
export async function listarPagosDeTrabajador(
  db: Consultas,
  trabajadorId: number,
  filtro: FiltroCultivo = undefined,
): Promise<PagoDetallado[]> {
  const cultivo = clausulaCultivo('a.cultivo_id', filtro);
  return db.consultar<PagoDetallado>(
    `SELECT p.id, p.jornal_id AS jornalId, p.fecha, p.monto_centavos AS monto,
            a.descripcion, a.fecha AS fechaActividad
     FROM pago p
     JOIN jornal j    ON j.id = p.jornal_id
     JOIN actividad a ON a.id = j.actividad_id
     WHERE j.trabajador_id = ?${cultivo.sql}
     ORDER BY p.fecha DESC, p.id DESC`,
    [trabajadorId, ...cultivo.params],
  );
}
