import Database from 'better-sqlite3';
import { BaseDatosSqlite, type ConexionSql } from './base-datos';
import { aplicarMigraciones } from './migraciones';

/** Solo para pruebas en Node: mismo SQL y misma lógica de transacciones que en el celular. */
export function conexionNode(ruta = ':memory:'): ConexionSql {
  const db = new Database(ruta);
  return {
    ejecutar: async (sql, params) => {
      const r = db.prepare(sql).run(...params);
      return { cambios: r.changes, ultimoId: Number(r.lastInsertRowid) };
    },
    consultar: async <T>(sql: string, params: (string | number | null)[]) => {
      const sentencia = db.prepare(sql);
      return (sentencia.reader ? sentencia.all(...params) : (sentencia.run(...params), [])) as T[];
    },
    ejecutarScript: async (sql) => {
      db.exec(sql);
    },
  };
}

/** Base en memoria, nueva y migrada, para cada prueba. */
export async function baseDePrueba(): Promise<BaseDatosSqlite> {
  const db = await BaseDatosSqlite.abrir(conexionNode());
  await aplicarMigraciones(db);
  return db;
}
