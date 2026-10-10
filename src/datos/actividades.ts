import type { Centavos } from '../dominio/dinero';
import type { Fecha } from '../dominio/fecha';
import type { Consultas } from './base-datos';

export interface Actividad {
  id: number;
  fecha: Fecha;
  descripcion: string;
  tipoTareaId: number;
}

/** Fila de la lista de actividades, con sus totales de jornales. */
export interface ResumenActividad extends Actividad {
  tipoTarea: string;
  trabajadores: number;
  totalJornales: Centavos;
  pendiente: Centavos;
}

const COLUMNAS = 'a.id, a.fecha, a.descripcion, a.tipo_tarea_id AS tipoTareaId';

export async function insertarActividad(
  db: Consultas,
  datos: { fecha: Fecha; descripcion: string; tipoTareaId: number },
  creadoEn: string,
): Promise<number> {
  const r = await db.ejecutar(
    'INSERT INTO actividad (fecha, descripcion, tipo_tarea_id, creado_en) VALUES (?, ?, ?, ?)',
    [datos.fecha, datos.descripcion, datos.tipoTareaId, creadoEn],
  );
  return r.ultimoId;
}

export async function obtenerActividad(db: Consultas, id: number): Promise<Actividad | null> {
  return db.consultarUno<Actividad>(`SELECT ${COLUMNAS} FROM actividad a WHERE a.id = ?`, [id]);
}

/** Actividades con fecha en [desde, hasta], de la más reciente a la más antigua. */
export async function listarActividades(db: Consultas, desde: Fecha, hasta: Fecha): Promise<ResumenActividad[]> {
  return db.consultar<ResumenActividad>(
    `SELECT ${COLUMNAS}, t.nombre AS tipoTarea,
            COUNT(j.id)                         AS trabajadores,
            COALESCE(SUM(j.monto_centavos), 0)  AS totalJornales,
            COALESCE(SUM(j.saldo_centavos), 0)  AS pendiente
     FROM actividad a
     JOIN tipo_tarea t ON t.id = a.tipo_tarea_id
     LEFT JOIN v_jornal_saldo j ON j.actividad_id = a.id
     WHERE a.fecha BETWEEN ? AND ?
     GROUP BY a.id
     ORDER BY a.fecha DESC, a.id DESC`,
    [desde, hasta],
  );
}

export async function eliminarActividad(db: Consultas, id: number): Promise<number> {
  const r = await db.ejecutar('DELETE FROM actividad WHERE id = ?', [id]);
  return r.cambios;
}
