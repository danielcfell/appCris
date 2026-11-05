import { esCentavosValidos } from '../dominio/dinero';
import { MontoInvalido, NoEncontrado, OperacionNoPermitida } from '../dominio/errores';
import { validarFecha } from '../dominio/fecha';
import type { BaseDatos, Consultas } from '../datos/base-datos';
import { obtenerActividad } from '../datos/actividades';
import * as repo from '../datos/gastos';
import { marcaTiempo, textoOpcional, textoRequerido } from './comun';
import { resolverCultivo } from './cultivos';

/** El cultivo es opcional aquí: lo exige `validar` si ya hay cultivos y el gasto no tiene actividad (RF-27). */
export type EntradaGasto = Omit<repo.DatosGasto, 'cultivoId'> & { cultivoId?: number | null };

/** `cultivoActual` es el cultivo que ya tenía el gasto al editarlo (`undefined` si es nuevo). */
async function validar(
  tx: Consultas,
  datos: EntradaGasto,
  cultivoActual?: number | null,
): Promise<repo.DatosGasto> {
  if (!esCentavosValidos(datos.monto) || datos.monto === 0) throw new MontoInvalido('El gasto debe ser mayor a cero.');
  const categorias = await repo.listarCategorias(tx, { incluirInactivas: true });
  if (!categorias.some((c) => c.id === datos.categoriaId)) throw new NoEncontrado('la categoría');
  // La actividad es opcional (RF-18). Un gasto ligado a una actividad hereda su cultivo (RF-27).
  let cultivoId: number | null;
  if (datos.actividadId !== null) {
    const actividad = await obtenerActividad(tx, datos.actividadId);
    if (!actividad) throw new NoEncontrado('la actividad');
    cultivoId = actividad.cultivoId;
  } else if (cultivoActual === null && (datos.cultivoId ?? null) === null) {
    // Un gasto anterior a los cultivos puede seguir sin cultivo al editarlo (RF-27).
    cultivoId = null;
  } else {
    cultivoId = await resolverCultivo(tx, datos.cultivoId, cultivoActual);
  }
  return { ...datos, cultivoId, fecha: validarFecha(datos.fecha), nota: textoOpcional(datos.nota) };
}

/** Registra un gasto con categoría, cultivo y, opcionalmente, una actividad (RF-16, RF-18, RF-27). */
export async function registrarGasto(db: BaseDatos, datos: EntradaGasto): Promise<number> {
  return db.transaccion(async (tx) => repo.insertarGasto(tx, await validar(tx, datos), marcaTiempo()));
}

export async function editarGasto(db: BaseDatos, id: number, datos: EntradaGasto): Promise<void> {
  await db.transaccion(async (tx) => {
    const actual = await repo.obtenerGasto(tx, id);
    if (!actual) throw new NoEncontrado('el gasto');
    // Al editar se puede conservar el cultivo que ya tenía, aunque se haya cerrado.
    await repo.actualizarGasto(tx, id, await validar(tx, datos, actual.cultivoId));
  });
}

export async function eliminarGasto(db: BaseDatos, id: number): Promise<void> {
  if ((await repo.eliminarGasto(db, id)) === 0) throw new NoEncontrado('el gasto');
}

async function validarNombreCategoria(tx: Consultas, nombre: string, idActual?: number): Promise<string> {
  const limpio = textoRequerido(nombre, 'el nombre de la categoría');
  const existentes = await repo.listarCategorias(tx, { incluirInactivas: true });
  if (existentes.some((c) => c.id !== idActual && c.nombre.toLocaleLowerCase('es') === limpio.toLocaleLowerCase('es'))) {
    throw new OperacionNoPermitida(`Ya existe la categoría "${limpio}".`);
  }
  return limpio;
}

/** El usuario puede crear más categorías además de las iniciales (RF-17). */
export async function crearCategoria(db: BaseDatos, nombre: string): Promise<number> {
  return db.transaccion(async (tx) => repo.insertarCategoria(tx, await validarNombreCategoria(tx, nombre)));
}

export async function renombrarCategoria(db: BaseDatos, id: number, nombre: string): Promise<void> {
  await db.transaccion(async (tx) => {
    if ((await repo.renombrarCategoria(tx, id, await validarNombreCategoria(tx, nombre, id))) === 0) {
      throw new NoEncontrado('la categoría');
    }
  });
}
