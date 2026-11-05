import type { Centavos } from '../dominio/dinero';
import type { Fecha } from '../dominio/fecha';
import type { Consultas } from './base-datos';
import { clausulaCultivo, type FiltroCultivo } from './filtro-cultivo';

export interface Actividad {
  id: number;
  fecha: Fecha;
  descripcion: string;
  tipoTareaId: number;
  cultivoId: number | null;
}

/** Fila de la lista de actividades, con sus totales de jornales. */
export interface ResumenActividad extends Actividad {
  tipoTarea: string;
  cultivo: string | null;
  trabajadores: number;
  totalJornales: Centavos;
  pendiente: Centavos;
}

const COLUMNAS = 'a.id, a.fecha, a.descripcion, a.tipo_tarea_id AS tipoTareaId, a.cultivo_id AS cultivoId';

export async function insertarActividad(
  db: Consultas,
  datos: { fecha: Fecha; descripcion: string; tipoTareaId: number; cultivoId: number | null },
  creadoEn: string,
): Promise<number> {
  const r = await db.ejecutar(
    'INSERT INTO actividad (fecha, descripcion, tipo_tarea_id, cultivo_id, creado_en) VALUES (?, ?, ?, ?, ?)',
    [datos.fecha, datos.descripcion, datos.tipoTareaId, datos.cultivoId, creadoEn],
  );
  return r.ultimoId;
}

export async function obtenerActividad(db: Consultas, id: number): Promise<Actividad | null> {
  return db.consultarUno<Actividad>(`SELECT ${COLUMNAS} FROM actividad a WHERE a.id = ?`, [id]);
}

/** Actividades con fecha en [desde, hasta], de la más reciente a la más antigua. */
export async function listarActividades(
  db: Consultas,
  desde: Fecha,
  hasta: Fecha,
  filtro: FiltroCultivo = undefined,
): Promise<ResumenActividad[]> {
  const cultivo = clausulaCultivo('a.cultivo_id', filtro);
  return db.consultar<ResumenActividad>(
    `SELECT ${COLUMNAS}, t.nombre AS tipoTarea, cu.nombre AS cultivo,
            COUNT(j.id)                         AS trabajadores,
            COALESCE(SUM(j.monto_centavos), 0)  AS totalJornales,
            COALESCE(SUM(j.saldo_centavos), 0)  AS pendiente
     FROM actividad a
     JOIN tipo_tarea t ON t.id = a.tipo_tarea_id
     LEFT JOIN cultivo cu ON cu.id = a.cultivo_id
     LEFT JOIN v_jornal_saldo j ON j.actividad_id = a.id
     WHERE a.fecha BETWEEN ? AND ?${cultivo.sql}
     GROUP BY a.id
     ORDER BY a.fecha DESC, a.id DESC`,
    [desde, hasta, ...cultivo.params],
  );
}

export async function eliminarActividad(db: Consultas, id: number): Promise<number> {
  const r = await db.ejecutar('DELETE FROM actividad WHERE id = ?', [id]);
  return r.cambios;
}
