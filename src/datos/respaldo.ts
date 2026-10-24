import { NOMBRES_TABLAS, TABLAS_RESPALDO, type FilaRespaldo, type TablasRespaldo } from '../dominio/respaldo';
import type { Consultas } from './base-datos';

/** Todas las filas de las tablas del respaldo, con sus columnas explícitas. */
export async function leerTablas(db: Consultas): Promise<TablasRespaldo> {
  const tablas = {} as TablasRespaldo;
  for (const tabla of NOMBRES_TABLAS) {
    tablas[tabla] = await db.consultar<FilaRespaldo>(`SELECT ${TABLAS_RESPALDO[tabla].join(', ')} FROM ${tabla} ORDER BY id`);
  }
  return tablas;
}

/**
 * Borra los datos actuales e inserta los del respaldo. Debe correr dentro de una transacción:
 * si una fila viola una regla de la base (montos, saldos, referencias), no queda nada a medias.
 */
export async function reemplazarTablas(tx: Consultas, tablas: TablasRespaldo): Promise<void> {
  for (const tabla of [...NOMBRES_TABLAS].reverse()) await tx.ejecutar(`DELETE FROM ${tabla}`);
  for (const tabla of NOMBRES_TABLAS) {
    const columnas = TABLAS_RESPALDO[tabla];
    const sql = `INSERT INTO ${tabla} (${columnas.join(', ')}) VALUES (${columnas.map(() => '?').join(', ')})`;
    for (const fila of tablas[tabla]) await tx.ejecutar(sql, columnas.map((c) => fila[c]));
  }
}
