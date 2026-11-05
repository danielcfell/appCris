import type { Centavos } from '../dominio/dinero';
import type { Fecha } from '../dominio/fecha';
import type { Consultas } from './base-datos';
import { clausulaCultivo, type FiltroCultivo } from './filtro-cultivo';

export interface Deuda {
  trabajadorId: number;
  nombre: string;
  saldo: Centavos;
  jornalesPendientes: number;
}

/**
 * "A quién debo": trabajadores con saldo, de mayor a menor (RF-13). Con filtro de cultivo, el saldo de
 * cada trabajador cuenta solo los jornales de ese cultivo (RF-28, RF-29).
 */
export async function deudasPorTrabajador(db: Consultas, filtro: FiltroCultivo = undefined): Promise<Deuda[]> {
  const cultivo = clausulaCultivo('a.cultivo_id', filtro);
  return db.consultar<Deuda>(
    `SELECT t.id AS trabajadorId, t.nombre,
            SUM(j.saldo_centavos) AS saldo,
            COUNT(*)              AS jornalesPendientes
     FROM v_jornal_saldo j
     JOIN trabajador t ON t.id = j.trabajador_id
     JOIN actividad a  ON a.id = j.actividad_id
     WHERE j.saldo_centavos > 0${cultivo.sql}
     GROUP BY t.id
     ORDER BY saldo DESC, t.nombre COLLATE NOCASE`,
    cultivo.params,
  );
}

/**
 * Total adeudado = suma de los saldos de los jornales (RN-03). Con filtro, solo los de actividades
 * de ese cultivo.
 */
export async function totalAdeudado(db: Consultas, filtro: FiltroCultivo = undefined): Promise<Centavos> {
  const cultivo = clausulaCultivo('a.cultivo_id', filtro);
  const f = await db.consultarUno<{ total: number }>(
    `SELECT COALESCE(SUM(j.saldo_centavos), 0) AS total
     FROM v_jornal_saldo j JOIN actividad a ON a.id = j.actividad_id
     WHERE 1 = 1${cultivo.sql}`,
    cultivo.params,
  );
  return f?.total ?? 0;
}

export async function saldoDeTrabajador(
  db: Consultas,
  trabajadorId: number,
  filtro: FiltroCultivo = undefined,
): Promise<Centavos> {
  const cultivo = clausulaCultivo('a.cultivo_id', filtro);
  const f = await db.consultarUno<{ total: number }>(
    `SELECT COALESCE(SUM(j.saldo_centavos), 0) AS total
     FROM v_jornal_saldo j JOIN actividad a ON a.id = j.actividad_id
     WHERE j.trabajador_id = ?${cultivo.sql}`,
    [trabajadorId, ...cultivo.params],
  );
  return f?.total ?? 0;
}

export interface CostoActividad {
  jornales: Centavos;
  gastos: Centavos;
  total: Centavos;
  pagado: Centavos;
  pendiente: Centavos;
}

/** Costo de una actividad: jornales + gastos asociados, y cuánto se ha pagado de los jornales (RF-21). */
export async function costoDeActividad(db: Consultas, actividadId: number): Promise<CostoActividad> {
  const j = await db.consultarUno<{ monto: number; pagado: number; saldo: number }>(
    `SELECT COALESCE(SUM(monto_centavos), 0) AS monto, COALESCE(SUM(pagado_centavos), 0) AS pagado,
            COALESCE(SUM(saldo_centavos), 0) AS saldo
     FROM v_jornal_saldo WHERE actividad_id = ?`,
    [actividadId],
  );
  const g = await db.consultarUno<{ total: number }>(
    'SELECT COALESCE(SUM(monto_centavos), 0) AS total FROM gasto WHERE actividad_id = ?',
    [actividadId],
  );
  const jornales = j?.monto ?? 0;
  const gastos = g?.total ?? 0;
  return { jornales, gastos, total: jornales + gastos, pagado: j?.pagado ?? 0, pendiente: j?.saldo ?? 0 };
}

export interface ResumenPeriodo {
  manoDeObra: Centavos;
  manoDeObraPagada: Centavos;
  manoDeObraPendiente: Centavos;
  porCategoria: { categoriaId: number; nombre: string; total: Centavos }[];
  total: Centavos;
}

/**
 * Gasto de un período (RF-20). La mano de obra es lo devengado: jornales de actividades con
 * fecha en el período, pagados o no. Incluye todas las categorías activas, aunque sumen cero.
 * Con filtro de cultivo, todo se acota a ese cultivo (RF-28).
 */
export async function resumenDePeriodo(
  db: Consultas,
  desde: Fecha,
  hasta: Fecha,
  filtro: FiltroCultivo = undefined,
): Promise<ResumenPeriodo> {
  const deActividad = clausulaCultivo('a.cultivo_id', filtro);
  const deGasto = clausulaCultivo('g.cultivo_id', filtro);
  const mo = await db.consultarUno<{ monto: number; pagado: number; saldo: number }>(
    `SELECT COALESCE(SUM(j.monto_centavos), 0) AS monto, COALESCE(SUM(j.pagado_centavos), 0) AS pagado,
            COALESCE(SUM(j.saldo_centavos), 0) AS saldo
     FROM v_jornal_saldo j JOIN actividad a ON a.id = j.actividad_id
     WHERE a.fecha BETWEEN ? AND ?${deActividad.sql}`,
    [desde, hasta, ...deActividad.params],
  );
  const porCategoria = await db.consultar<{ categoriaId: number; nombre: string; total: number }>(
    `SELECT c.id AS categoriaId, c.nombre, COALESCE(SUM(g.monto_centavos), 0) AS total
     FROM categoria_gasto c
     LEFT JOIN gasto g ON g.categoria_id = c.id AND g.fecha BETWEEN ? AND ?${deGasto.sql}
     GROUP BY c.id
     HAVING c.activo = 1 OR total > 0
     ORDER BY total DESC, c.id`,
    [desde, hasta, ...deGasto.params],
  );
  const manoDeObra = mo?.monto ?? 0;
  const gastos = porCategoria.reduce((suma, c) => suma + c.total, 0);
  return {
    manoDeObra,
    manoDeObraPagada: mo?.pagado ?? 0,
    manoDeObraPendiente: mo?.saldo ?? 0,
    porCategoria,
    total: manoDeObra + gastos,
  };
}
