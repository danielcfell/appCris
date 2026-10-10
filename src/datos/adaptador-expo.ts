import * as SQLite from 'expo-sqlite';
import { BaseDatosSqlite } from './base-datos';
import { aplicarMigraciones } from './migraciones';

const NOMBRE_ARCHIVO = 'jornales.db';

/** Abre la base del celular, la configura y aplica las migraciones pendientes. */
export async function abrirBaseDatos(): Promise<BaseDatosSqlite> {
  const nativa = await SQLite.openDatabaseAsync(NOMBRE_ARCHIVO);
  const db = await BaseDatosSqlite.abrir({
    ejecutar: async (sql, params) => {
      const r = await nativa.runAsync(sql, params);
      return { cambios: r.changes, ultimoId: r.lastInsertRowId };
    },
    consultar: (sql, params) => nativa.getAllAsync(sql, params),
    ejecutarScript: (sql) => nativa.execAsync(sql),
  });
  await aplicarMigraciones(db);
  return db;
}
