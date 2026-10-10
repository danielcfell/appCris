import type { Centavos, Centesimas } from '../dominio/dinero';
import { DatoRequerido, NoEncontrado, OperacionNoPermitida } from '../dominio/errores';
import { validarFecha, type Fecha } from '../dominio/fecha';
import { calcularMonto, type Unidad } from '../dominio/jornal';
import type { BaseDatos, Consultas } from '../datos/base-datos';
import * as actividades from '../datos/actividades';
import { contarGastosDeActividad } from '../datos/gastos';
import { insertarJornal, listarJornalesDeActividad } from '../datos/jornales';
import { obtenerTipoTarea } from '../datos/tipos-tarea';
import { obtenerTrabajador } from '../datos/trabajadores';
import { marcaTiempo } from './comun';

/** Trabajador a agregar. Sin cantidad o tarifa propias, toma las comunes (RF-06). */
export interface TrabajadorEnActividad {
  trabajadorId: number;
  cantidad?: Centesimas;
  tarifa?: Centavos;
}

export interface JornalesNuevos {
  /** Cantidad y tarifa aplicadas a todos en un solo paso (RF-06). */
  cantidadComun: Centesimas;
  tarifaComun: Centavos;
  trabajadores: TrabajadorEnActividad[];
}

export interface DatosActividad extends JornalesNuevos {
  fecha: Fecha;
  /** Si queda vacía se usa el nombre del tipo de tarea. */
  descripcion: string;
  tipoTareaId: number;
}

async function insertarJornales(
  tx: Consultas,
  actividadId: number,
  unidad: Unidad,
  datos: JornalesNuevos,
  creadoEn: string,
): Promise<number[]> {
  if (datos.trabajadores.length === 0) throw new DatoRequerido('al menos un trabajador');
  const yaEnActividad = new Set((await listarJornalesDeActividad(tx, actividadId)).map((j) => j.trabajadorId));
  const ids: number[] = [];
  for (const t of datos.trabajadores) {
    if (yaEnActividad.has(t.trabajadorId)) {
      throw new OperacionNoPermitida('Un trabajador aparece dos veces en la actividad. Aumenta su cantidad.');
    }
    yaEnActividad.add(t.trabajadorId);
    const trabajador = await obtenerTrabajador(tx, t.trabajadorId);
    if (!trabajador) throw new NoEncontrado('el trabajador');
    if (!trabajador.activo) {
      throw new OperacionNoPermitida(`${trabajador.nombre} está desactivado y no se le pueden asignar jornales.`);
    }
    const cantidad = t.cantidad ?? datos.cantidadComun;
    const tarifa = t.tarifa ?? datos.tarifaComun;
    // La tarifa se copia al jornal: cambios posteriores al tipo de tarea no lo afectan (RN-04).
    const monto = calcularMonto(cantidad, tarifa);
    ids.push(
      await insertarJornal(tx, { actividadId, trabajadorId: t.trabajadorId, unidad, cantidad, tarifa, monto }, creadoEn),
    );
  }
  return ids;
}

/** Crea la actividad y todos sus jornales en una sola transacción (RF-05, RF-06, RNF-03). */
export async function crearActividadConJornales(db: BaseDatos, datos: DatosActividad): Promise<number> {
  const fecha = validarFecha(datos.fecha);
  return db.transaccion(async (tx) => {
    const tipo = await obtenerTipoTarea(tx, datos.tipoTareaId);
    if (!tipo) throw new NoEncontrado('el tipo de tarea');
    const creadoEn = marcaTiempo();
    const descripcion = datos.descripcion.trim() || tipo.nombre;
    const actividadId = await actividades.insertarActividad(
      tx,
      { fecha, descripcion, tipoTareaId: tipo.id },
      creadoEn,
    );
    await insertarJornales(tx, actividadId, tipo.unidad, datos, creadoEn);
    return actividadId;
  });
}

/** Agrega trabajadores a una actividad ya registrada (por ejemplo, alguien que se olvidó). */
export async function agregarJornales(db: BaseDatos, actividadId: number, datos: JornalesNuevos): Promise<number[]> {
  return db.transaccion(async (tx) => {
    const actividad = await actividades.obtenerActividad(tx, actividadId);
    if (!actividad) throw new NoEncontrado('la actividad');
    const tipo = await obtenerTipoTarea(tx, actividad.tipoTareaId);
    if (!tipo) throw new NoEncontrado('el tipo de tarea');
    return insertarJornales(tx, actividadId, tipo.unidad, datos, marcaTiempo());
  });
}

/** Solo se elimina una actividad vacía: sin jornales ni gastos. */
export async function eliminarActividad(db: BaseDatos, actividadId: number): Promise<void> {
  await db.transaccion(async (tx) => {
    if ((await listarJornalesDeActividad(tx, actividadId)).length > 0 || (await contarGastosDeActividad(tx, actividadId)) > 0) {
      throw new OperacionNoPermitida('Primero elimina los jornales y gastos de la actividad.');
    }
    if ((await actividades.eliminarActividad(tx, actividadId)) === 0) throw new NoEncontrado('la actividad');
  });
}
