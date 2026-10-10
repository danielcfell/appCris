import type { Consultas } from './base-datos';

export interface Trabajador {
  id: number;
  nombre: string;
  telefono: string | null;
  activo: boolean;
}

interface FilaTrabajador {
  id: number;
  nombre: string;
  telefono: string | null;
  activo: number;
}

const COLUMNAS = 'id, nombre, telefono, activo';
const aTrabajador = (f: FilaTrabajador): Trabajador => ({ ...f, activo: f.activo === 1 });

export async function insertarTrabajador(
  db: Consultas,
  datos: { nombre: string; telefono: string | null },
  creadoEn: string,
): Promise<number> {
  const r = await db.ejecutar('INSERT INTO trabajador (nombre, telefono, creado_en) VALUES (?, ?, ?)', [
    datos.nombre,
    datos.telefono,
    creadoEn,
  ]);
  return r.ultimoId;
}

export async function actualizarTrabajador(
  db: Consultas,
  id: number,
  datos: { nombre: string; telefono: string | null },
): Promise<number> {
  const r = await db.ejecutar('UPDATE trabajador SET nombre = ?, telefono = ? WHERE id = ?', [
    datos.nombre,
    datos.telefono,
    id,
  ]);
  return r.cambios;
}

export async function cambiarActivoTrabajador(db: Consultas, id: number, activo: boolean): Promise<number> {
  const r = await db.ejecutar('UPDATE trabajador SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
  return r.cambios;
}

export async function obtenerTrabajador(db: Consultas, id: number): Promise<Trabajador | null> {
  const f = await db.consultarUno<FilaTrabajador>(`SELECT ${COLUMNAS} FROM trabajador WHERE id = ?`, [id]);
  return f && aTrabajador(f);
}

/** Por defecto solo activos: los inactivos no se ofrecen al crear actividades (RF-02). */
export async function listarTrabajadores(db: Consultas, { incluirInactivos = false } = {}): Promise<Trabajador[]> {
  const filtro = incluirInactivos ? '' : 'WHERE activo = 1';
  const filas = await db.consultar<FilaTrabajador>(
    `SELECT ${COLUMNAS} FROM trabajador ${filtro} ORDER BY nombre COLLATE NOCASE`,
  );
  return filas.map(aTrabajador);
}
