import { NoEncontrado } from '../dominio/errores';
import type { BaseDatos } from '../datos/base-datos';
import * as repo from '../datos/trabajadores';
import { marcaTiempo, textoOpcional, textoRequerido } from './comun';

export interface DatosTrabajador {
  nombre: string;
  telefono?: string | null;
}

const limpiar = (datos: DatosTrabajador) => ({
  nombre: textoRequerido(datos.nombre, 'el nombre'),
  telefono: textoOpcional(datos.telefono),
});

/** Un servicio por horas, como un tractor, también se crea como trabajador (RF-19). */
export async function crearTrabajador(db: BaseDatos, datos: DatosTrabajador): Promise<number> {
  return repo.insertarTrabajador(db, limpiar(datos), marcaTiempo());
}

export async function editarTrabajador(db: BaseDatos, id: number, datos: DatosTrabajador): Promise<void> {
  if ((await repo.actualizarTrabajador(db, id, limpiar(datos))) === 0) throw new NoEncontrado('el trabajador');
}

/** Los trabajadores no se eliminan: se desactivan y conservan su historial (RN-05, RF-02). */
export async function desactivarTrabajador(db: BaseDatos, id: number): Promise<void> {
  if ((await repo.cambiarActivoTrabajador(db, id, false)) === 0) throw new NoEncontrado('el trabajador');
}

export async function reactivarTrabajador(db: BaseDatos, id: number): Promise<void> {
  if ((await repo.cambiarActivoTrabajador(db, id, true)) === 0) throw new NoEncontrado('el trabajador');
}
