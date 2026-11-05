import { DatoRequerido, NoEncontrado, OperacionNoPermitida } from '../dominio/errores';
import type { BaseDatos, Consultas } from '../datos/base-datos';
import { guardarConfig, leerConfig } from '../datos/config';
import * as repo from '../datos/cultivos';
import { parsearFiltroCultivo, serializarFiltroCultivo, type FiltroCultivo } from '../datos/filtro-cultivo';
import { marcaTiempo, textoRequerido } from './comun';

async function validarNombre(tx: Consultas, nombre: string, idActual?: number): Promise<string> {
  const limpio = textoRequerido(nombre, 'el nombre del cultivo');
  const existentes = await repo.listarCultivos(tx, { incluirInactivos: true });
  if (existentes.some((c) => c.id !== idActual && c.nombre.toLocaleLowerCase('es') === limpio.toLocaleLowerCase('es'))) {
    throw new OperacionNoPermitida(`Ya existe el cultivo "${limpio}".`);
  }
  return limpio;
}

/** Cada siembra es un cultivo aparte, con su propia contabilidad (RF-26). */
export async function crearCultivo(db: BaseDatos, nombre: string): Promise<number> {
  return db.transaccion(async (tx) => repo.insertarCultivo(tx, await validarNombre(tx, nombre), marcaTiempo()));
}

export async function editarCultivo(db: BaseDatos, id: number, nombre: string): Promise<void> {
  await db.transaccion(async (tx) => {
    if ((await repo.actualizarCultivo(tx, id, await validarNombre(tx, nombre, id))) === 0) {
      throw new NoEncontrado('el cultivo');
    }
  });
}

/** "Cerrar cultivo": ya no se ofrece al registrar, pero conserva su historial (RN-05, RF-26). */
export async function desactivarCultivo(db: BaseDatos, id: number): Promise<void> {
  if ((await repo.cambiarActivoCultivo(db, id, false)) === 0) throw new NoEncontrado('el cultivo');
}

export async function reactivarCultivo(db: BaseDatos, id: number): Promise<void> {
  if ((await repo.cambiarActivoCultivo(db, id, true)) === 0) throw new NoEncontrado('el cultivo');
}

/** El último filtro elegido se recuerda y prellena el alta (RF-28). Un cultivo que ya no existe cuenta como "todos". */
export async function leerFiltroCultivo(db: Consultas): Promise<FiltroCultivo> {
  const filtro = parsearFiltroCultivo(await leerConfig(db, 'filtro_cultivo'));
  if (typeof filtro === 'number' && !(await repo.obtenerCultivo(db, filtro))) return undefined;
  return filtro;
}

export async function guardarFiltroCultivo(db: BaseDatos, filtro: FiltroCultivo): Promise<void> {
  await guardarConfig(db, 'filtro_cultivo', serializarFiltroCultivo(filtro));
}

/**
 * Cultivo con el que se guarda un registro nuevo (RF-27). Si el catálogo está vacío el registro queda sin
 * cultivo; si no, el cultivo es obligatorio y debe estar abierto. `permitidoCerrado` deja conservar el cultivo
 * que el registro ya tenía al editarlo.
 *
 * SQLite no aplica las claves foráneas de columnas añadidas con ALTER TABLE, por eso se comprueba aquí.
 */
export async function resolverCultivo(
  tx: Consultas,
  cultivoId: number | null | undefined,
  permitidoCerrado?: number | null,
): Promise<number | null> {
  if (cultivoId === null || cultivoId === undefined) {
    if ((await repo.listarCultivos(tx, { incluirInactivos: true })).length > 0) throw new DatoRequerido('el cultivo');
    return null;
  }
  const cultivo = await repo.obtenerCultivo(tx, cultivoId);
  if (!cultivo) throw new NoEncontrado('el cultivo');
  if (!cultivo.activo && cultivo.id !== permitidoCerrado) {
    throw new OperacionNoPermitida(`El cultivo "${cultivo.nombre}" está cerrado. Elige otro.`);
  }
  return cultivo.id;
}
