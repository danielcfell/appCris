import type { Centavos, Centesimas } from '../dominio/dinero';
import type { Fecha } from '../dominio/fecha';
import type { Unidad } from '../dominio/jornal';
import type { Consultas } from './base-datos';
import { clausulaCultivo, type FiltroCultivo } from './filtro-cultivo';

export interface Jornal {
  id: number;
  actividadId: number;
  trabajadorId: number;
  unidad: Unidad;
  cantidad: Centesimas;
  tarifa: Centavos;
  monto: Centavos;
  pagado: Centavos;
  saldo: Centavos;
}

/** Jornal con los datos de su actividad y trabajador, para mostrarlo en listas. */
export interface JornalDetallado extends Jornal {
  fecha: Fecha;
  descripcion: string;
  trabajador: string;
}

const COLUMNAS = `j.id, j.actividad_id AS actividadId, j.trabajador_id AS trabajadorId, j.unidad,
  j.cantidad_centesimas AS cantidad, j.tarifa_centavos AS tarifa, j.monto_centavos AS monto,
  j.pagado_centavos AS pagado, j.saldo_centavos AS saldo`;

const DETALLADO = `SELECT ${COLUMNAS}, a.fecha, a.descripcion, t.nombre AS trabajador
  FROM v_jornal_saldo j
  JOIN actividad a  ON a.id = j.actividad_id
  JOIN trabajador t ON t.id = j.trabajador_id`;

export interface DatosJornal {
  actividadId: number;
  trabajadorId: number;
  unidad: Unidad;
  cantidad: Centesimas;
  tarifa: Centavos;
  monto: Centavos;
}

export async function insertarJornal(db: Consultas, datos: DatosJornal, creadoEn: string): Promise<number> {
  const r = await db.ejecutar(
    `INSERT INTO jornal (actividad_id, trabajador_id, unidad, cantidad_centesimas, tarifa_centavos,
                         monto_centavos, creado_en)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [datos.actividadId, datos.trabajadorId, datos.unidad, datos.cantidad, datos.tarifa, datos.monto, creadoEn],
  );
  return r.ultimoId;
}

export async function actualizarCantidadTarifa(
  db: Consultas,
  id: number,
  datos: { cantidad: Centesimas; tarifa: Centavos; monto: Centavos },
): Promise<number> {
  const r = await db.ejecutar(
    'UPDATE jornal SET cantidad_centesimas = ?, tarifa_centavos = ?, monto_centavos = ? WHERE id = ?',
    [datos.cantidad, datos.tarifa, datos.monto, id],
  );
  return r.cambios;
}

/** Borra el jornal; sus pagos se borran en cascada (RF-08). */
export async function eliminarJornal(db: Consultas, id: number): Promise<number> {
  const r = await db.ejecutar('DELETE FROM jornal WHERE id = ?', [id]);
  return r.cambios;
}

export async function obtenerJornal(db: Consultas, id: number): Promise<JornalDetallado | null> {
  return db.consultarUno<JornalDetallado>(`${DETALLADO} WHERE j.id = ?`, [id]);
}

export async function listarJornalesDeActividad(db: Consultas, actividadId: number): Promise<JornalDetallado[]> {
  return db.consultar<JornalDetallado>(`${DETALLADO} WHERE j.actividad_id = ? ORDER BY t.nombre COLLATE NOCASE`, [
    actividadId,
  ]);
}

/**
 * Jornales con saldo de un trabajador, del más antiguo al más reciente (RF-14).
 * Con filtro de cultivo solo entran los de ese cultivo (RF-29).
 */
export async function listarPendientesDeTrabajador(
  db: Consultas,
  trabajadorId: number,
  filtro: FiltroCultivo = undefined,
): Promise<JornalDetallado[]> {
  const cultivo = clausulaCultivo('a.cultivo_id', filtro);
  return db.consultar<JornalDetallado>(
    `${DETALLADO} WHERE j.trabajador_id = ? AND j.saldo_centavos > 0${cultivo.sql} ORDER BY a.fecha, j.id`,
    [trabajadorId, ...cultivo.params],
  );
}

export async function listarPendientesDeActividad(db: Consultas, actividadId: number): Promise<JornalDetallado[]> {
  return db.consultar<JornalDetallado>(
    `${DETALLADO} WHERE j.actividad_id = ? AND j.saldo_centavos > 0 ORDER BY j.id`,
    [actividadId],
  );
}

export async function contarJornalesDeTrabajador(db: Consultas, trabajadorId: number): Promise<number> {
  const f = await db.consultarUno<{ n: number }>('SELECT COUNT(*) AS n FROM jornal WHERE trabajador_id = ?', [
    trabajadorId,
  ]);
  return f?.n ?? 0;
}
