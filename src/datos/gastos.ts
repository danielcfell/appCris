import type { Centavos } from '../dominio/dinero';
import type { Fecha } from '../dominio/fecha';
import type { Consultas } from './base-datos';

export interface CategoriaGasto {
  id: number;
  nombre: string;
  activo: boolean;
}

export interface Gasto {
  id: number;
  fecha: Fecha;
  monto: Centavos;
  categoriaId: number;
  categoria: string;
  actividadId: number | null;
  nota: string | null;
}

export interface DatosGasto {
  fecha: Fecha;
  monto: Centavos;
  categoriaId: number;
  actividadId: number | null;
  nota: string | null;
}

const SELECT_GASTO = `SELECT g.id, g.fecha, g.monto_centavos AS monto, g.categoria_id AS categoriaId,
    c.nombre AS categoria, g.actividad_id AS actividadId, g.nota
  FROM gasto g JOIN categoria_gasto c ON c.id = g.categoria_id`;

export async function insertarGasto(db: Consultas, datos: DatosGasto, creadoEn: string): Promise<number> {
  const r = await db.ejecutar(
    `INSERT INTO gasto (fecha, monto_centavos, categoria_id, actividad_id, nota, creado_en)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [datos.fecha, datos.monto, datos.categoriaId, datos.actividadId, datos.nota, creadoEn],
  );
  return r.ultimoId;
}

export async function actualizarGasto(db: Consultas, id: number, datos: DatosGasto): Promise<number> {
  const r = await db.ejecutar(
    `UPDATE gasto SET fecha = ?, monto_centavos = ?, categoria_id = ?, actividad_id = ?, nota = ?
     WHERE id = ?`,
    [datos.fecha, datos.monto, datos.categoriaId, datos.actividadId, datos.nota, id],
  );
  return r.cambios;
}

export async function eliminarGasto(db: Consultas, id: number): Promise<number> {
  const r = await db.ejecutar('DELETE FROM gasto WHERE id = ?', [id]);
  return r.cambios;
}

export async function obtenerGasto(db: Consultas, id: number): Promise<Gasto | null> {
  return db.consultarUno<Gasto>(`${SELECT_GASTO} WHERE g.id = ?`, [id]);
}

export async function listarGastos(db: Consultas, desde: Fecha, hasta: Fecha): Promise<Gasto[]> {
  return db.consultar<Gasto>(`${SELECT_GASTO} WHERE g.fecha BETWEEN ? AND ? ORDER BY g.fecha DESC, g.id DESC`, [
    desde,
    hasta,
  ]);
}

export async function listarGastosDeActividad(db: Consultas, actividadId: number): Promise<Gasto[]> {
  return db.consultar<Gasto>(`${SELECT_GASTO} WHERE g.actividad_id = ? ORDER BY g.fecha, g.id`, [actividadId]);
}

export async function contarGastosDeActividad(db: Consultas, actividadId: number): Promise<number> {
  const f = await db.consultarUno<{ n: number }>('SELECT COUNT(*) AS n FROM gasto WHERE actividad_id = ?', [
    actividadId,
  ]);
  return f?.n ?? 0;
}

export async function insertarCategoria(db: Consultas, nombre: string): Promise<number> {
  const r = await db.ejecutar('INSERT INTO categoria_gasto (nombre) VALUES (?)', [nombre]);
  return r.ultimoId;
}

export async function renombrarCategoria(db: Consultas, id: number, nombre: string): Promise<number> {
  const r = await db.ejecutar('UPDATE categoria_gasto SET nombre = ? WHERE id = ?', [nombre, id]);
  return r.cambios;
}

export async function listarCategorias(db: Consultas, { incluirInactivas = false } = {}): Promise<CategoriaGasto[]> {
  const filtro = incluirInactivas ? '' : 'WHERE activo = 1';
  const filas = await db.consultar<{ id: number; nombre: string; activo: number }>(
    `SELECT id, nombre, activo FROM categoria_gasto ${filtro} ORDER BY id`,
  );
  return filas.map((f) => ({ ...f, activo: f.activo === 1 }));
}
