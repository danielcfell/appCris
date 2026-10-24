import type { BaseDatos } from '../datos/base-datos';
import { guardarConfig, guardarConfigSiFalta, leerConfig } from '../datos/config';
import { versionEsquema } from '../datos/migraciones';
import { leerTablas, reemplazarTablas } from '../datos/respaldo';
import { RespaldoInvalido } from '../dominio/errores';
import { FORMATO_RESPALDO, validarRespaldo, VERSION_FORMATO, type Respaldo } from '../dominio/respaldo';

/** Todos los datos, leídos en una sola transacción para que sean consistentes entre sí (RF-22). */
export function generarRespaldo(db: BaseDatos, ahora: Date): Promise<Respaldo> {
  return db.transaccion(async (tx) => ({
    formato: FORMATO_RESPALDO,
    version_formato: VERSION_FORMATO,
    version_esquema: await versionEsquema(tx),
    creado_en: ahora.toISOString(),
    tablas: await leerTablas(tx),
  }));
}

/** Valida el texto de un archivo contra el esquema de esta base (RF-23). */
export async function leerRespaldo(db: BaseDatos, texto: string): Promise<Respaldo> {
  return validarRespaldo(texto, await versionEsquema(db));
}

/** Reemplaza todos los datos por los del respaldo, en una sola transacción: o queda todo o nada (RF-23, RNF-03). */
export async function restaurarRespaldo(db: BaseDatos, respaldo: Respaldo): Promise<void> {
  await db.transaccion(async (tx) => {
    try {
      await reemplazarTablas(tx, respaldo.tablas);
    } catch (error) {
      console.error(error);
      throw new RespaldoInvalido('El respaldo tiene datos inconsistentes y no se restauró. Tus datos no cambiaron.');
    }
  });
}

/** El usuario confirmó que guardó el respaldo (RF-24, RF-25). */
export async function marcarRespaldoGuardado(db: BaseDatos, ahora: Date): Promise<void> {
  await guardarConfig(db, 'ultimo_respaldo_en', ahora.toISOString());
}

/** Guarda la fecha de la primera apertura: si nunca hubo respaldo, el recordatorio cuenta desde ahí (RF-24). */
export async function registrarPrimeraApertura(db: BaseDatos, ahora: Date): Promise<void> {
  await guardarConfigSiFalta(db, 'instalado_en', ahora.toISOString());
}

/** Desde cuándo se cuentan los 30 días del recordatorio: el último respaldo o, si no hubo, la instalación. */
export async function inicioCuentaRecordatorio(db: BaseDatos): Promise<string | null> {
  return (await leerConfig(db, 'ultimo_respaldo_en')) ?? (await leerConfig(db, 'instalado_en'));
}
