import type { Centavos } from '../dominio/dinero';
import type { Unidad } from '../dominio/jornal';
import type { Consultas } from './base-datos';

export interface TipoTarea {
  id: number;
  nombre: string;
  unidad: Unidad;
  tarifaSugerida: Centavos;
  activo: boolean;
}

interface FilaTipoTarea {
  id: number;
  nombre: string;
  unidad: Unidad;
  tarifaSugerida: number;
  activo: number;
}

const COLUMNAS = 'id, nombre, unidad, tarifa_sugerida_centavos AS tarifaSugerida, activo';
const aTipoTarea = (f: FilaTipoTarea): TipoTarea => ({ ...f, activo: f.activo === 1 });

export interface DatosTipoTarea {
  nombre: string;
  unidad: Unidad;
  tarifaSugerida: Centavos;
}

export async function insertarTipoTarea(db: Consultas, datos: DatosTipoTarea): Promise<number> {
  const r = await db.ejecutar(
    'INSERT INTO tipo_tarea (nombre, unidad, tarifa_sugerida_centavos) VALUES (?, ?, ?)',
    [datos.nombre, datos.unidad, datos.tarifaSugerida],
  );
  return r.ultimoId;
}

/** Cambiar la tarifa sugerida no toca jornales existentes: cada jornal guarda su propia tarifa (RN-04). */
export async function actualizarTipoTarea(db: Consultas, id: number, datos: DatosTipoTarea): Promise<number> {
  const r = await db.ejecutar(
    'UPDATE tipo_tarea SET nombre = ?, unidad = ?, tarifa_sugerida_centavos = ? WHERE id = ?',
    [datos.nombre, datos.unidad, datos.tarifaSugerida, id],
  );
  return r.cambios;
}

export async function cambiarActivoTipoTarea(db: Consultas, id: number, activo: boolean): Promise<number> {
  const r = await db.ejecutar('UPDATE tipo_tarea SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
  return r.cambios;
}

export async function obtenerTipoTarea(db: Consultas, id: number): Promise<TipoTarea | null> {
  const f = await db.consultarUno<FilaTipoTarea>(`SELECT ${COLUMNAS} FROM tipo_tarea WHERE id = ?`, [id]);
  return f && aTipoTarea(f);
}

export async function listarTiposTarea(db: Consultas, { incluirInactivos = false } = {}): Promise<TipoTarea[]> {
  const filtro = incluirInactivos ? '' : 'WHERE activo = 1';
  const filas = await db.consultar<FilaTipoTarea>(
    `SELECT ${COLUMNAS} FROM tipo_tarea ${filtro} ORDER BY nombre COLLATE NOCASE`,
  );
  return filas.map(aTipoTarea);
}
