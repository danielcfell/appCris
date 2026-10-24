import { inicioCuentaRecordatorio, registrarPrimeraApertura } from '../casos-uso/respaldo';
import type { BaseDatos } from '../datos/base-datos';
import { instantesRecordatorio } from '../dominio/respaldo';
import { programarRecordatorios } from './notificaciones';

/** Pantalla que abre la notificación del recordatorio. */
export const RUTA_RESPALDO = '/respaldo';

/** Vuelve a programar los recordatorios desde el último respaldo o la instalación (RF-24). */
export async function reprogramarRecordatorios(db: BaseDatos, ahora = new Date()): Promise<void> {
  const desde = await inicioCuentaRecordatorio(db);
  if (desde) await programarRecordatorios(instantesRecordatorio(desde, ahora), RUTA_RESPALDO);
}

/**
 * Al abrir la app: guarda la fecha de la primera apertura y reprograma los recordatorios,
 * por si el sistema los descartó (por ejemplo, al reiniciar o actualizar).
 */
export async function prepararRecordatorios(db: BaseDatos, ahora = new Date()): Promise<void> {
  await registrarPrimeraApertura(db, ahora);
  await reprogramarRecordatorios(db, ahora);
}
