import { esCentavosValidos } from '../dominio/dinero';
import { DatoRequerido, MontoInvalido, NoEncontrado } from '../dominio/errores';
import { UNIDADES } from '../dominio/jornal';
import type { BaseDatos } from '../datos/base-datos';
import * as repo from '../datos/tipos-tarea';
import { textoRequerido } from './comun';

function validar(datos: repo.DatosTipoTarea): repo.DatosTipoTarea {
  if (!UNIDADES.includes(datos.unidad)) throw new DatoRequerido('la unidad (día, tarea u hora)');
  if (!esCentavosValidos(datos.tarifaSugerida)) throw new MontoInvalido('La tarifa sugerida no es válida.');
  return { ...datos, nombre: textoRequerido(datos.nombre, 'el nombre') };
}

export async function crearTipoTarea(db: BaseDatos, datos: repo.DatosTipoTarea): Promise<number> {
  return repo.insertarTipoTarea(db, validar(datos));
}

/** Cambiar la tarifa sugerida no altera jornales ya creados (RN-04). */
export async function editarTipoTarea(db: BaseDatos, id: number, datos: repo.DatosTipoTarea): Promise<void> {
  if ((await repo.actualizarTipoTarea(db, id, validar(datos))) === 0) throw new NoEncontrado('el tipo de tarea');
}

export async function desactivarTipoTarea(db: BaseDatos, id: number): Promise<void> {
  if ((await repo.cambiarActivoTipoTarea(db, id, false)) === 0) throw new NoEncontrado('el tipo de tarea');
}
