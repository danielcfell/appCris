import type { Consultas } from './base-datos';

export interface Cultivo {
  id: number;
  nombre: string;
  activo: boolean;
}

interface FilaCultivo {
  id: number;
  nombre: string;
  activo: number;
}

const COLUMNAS = 'id, nombre, activo';
const aCultivo = (f: FilaCultivo): Cultivo => ({ ...f, activo: f.activo === 1 });

export async function insertarCultivo(db: Consultas, nombre: string, creadoEn: string): Promise<number> {
  const r = await db.ejecutar('INSERT INTO cultivo (nombre, creado_en) VALUES (?, ?)', [nombre, creadoEn]);
  return r.ultimoId;
}

export async function actualizarCultivo(db: Consultas, id: number, nombre: string): Promise<number> {
  const r = await db.ejecutar('UPDATE cultivo SET nombre = ? WHERE id = ?', [nombre, id]);
  return r.cambios;
}

export async function cambiarActivoCultivo(db: Consultas, id: number, activo: boolean): Promise<number> {
  const r = await db.ejecutar('UPDATE cultivo SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
  return r.cambios;
}

export async function obtenerCultivo(db: Consultas, id: number): Promise<Cultivo | null> {
  const f = await db.consultarUno<FilaCultivo>(`SELECT ${COLUMNAS} FROM cultivo WHERE id = ?`, [id]);
  return f && aCultivo(f);
}

/** Por defecto solo activos: los inactivos no se ofrecen al registrar (RF-26). */
export async function listarCultivos(db: Consultas, { incluirInactivos = false } = {}): Promise<Cultivo[]> {
  const filtro = incluirInactivos ? '' : 'WHERE activo = 1';
  const filas = await db.consultar<FilaCultivo>(
    `SELECT ${COLUMNAS} FROM cultivo ${filtro} ORDER BY nombre COLLATE NOCASE`,
  );
  return filas.map(aCultivo);
}

export async function hayRegistrosSinCultivo(db: Consultas): Promise<boolean> {
  const f = await db.consultarUno<{ n: number }>(
    `SELECT EXISTS(
       SELECT 1 FROM actividad WHERE cultivo_id IS NULL
       UNION ALL
       SELECT 1 FROM gasto WHERE cultivo_id IS NULL
     ) AS n`,
  );
  return (f?.n ?? 0) === 1;
}

export async function contarUsoDeCultivo(db: Consultas, cultivoId: number): Promise<number> {
  const a = await db.consultarUno<{ n: number }>('SELECT COUNT(*) AS n FROM actividad WHERE cultivo_id = ?', [
    cultivoId,
  ]);
  const g = await db.consultarUno<{ n: number }>('SELECT COUNT(*) AS n FROM gasto WHERE cultivo_id = ?', [cultivoId]);
  return (a?.n ?? 0) + (g?.n ?? 0);
}
