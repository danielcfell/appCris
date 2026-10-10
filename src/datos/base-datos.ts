export type ValorSql = string | number | null;

export interface ResultadoEjecucion {
  cambios: number;
  ultimoId: number;
}

/** Operaciones sobre la base. Los repositorios solo dependen de esto. */
export interface Consultas {
  ejecutar(sql: string, params?: ValorSql[]): Promise<ResultadoEjecucion>;
  consultar<T>(sql: string, params?: ValorSql[]): Promise<T[]>;
  consultarUno<T>(sql: string, params?: ValorSql[]): Promise<T | null>;
  /** Varias sentencias separadas por `;`, sin parámetros (migraciones). */
  ejecutarScript(sql: string): Promise<void>;
}

export interface BaseDatos extends Consultas {
  /**
   * Ejecuta `fn` en una transacción: o se guarda todo o nada (RNF-03).
   * Dentro de `fn` hay que usar solo `tx`; usar la base exterior espera a que termine
   * la transacción y la bloquea para siempre.
   */
  transaccion<T>(fn: (tx: Consultas) => Promise<T>): Promise<T>;
}

/** Lo mínimo que debe ofrecer cada motor (expo-sqlite en el celular, better-sqlite3 en pruebas). */
export interface ConexionSql {
  ejecutar(sql: string, params: ValorSql[]): Promise<ResultadoEjecucion>;
  consultar<T>(sql: string, params: ValorSql[]): Promise<T[]>;
  ejecutarScript(sql: string): Promise<void>;
}

/**
 * Implementación común sobre una sola conexión. Todas las operaciones pasan por una cola,
 * así una transacción nunca se mezcla con otra operación asíncrona.
 *
 * No se usa `withExclusiveTransactionAsync` de expo-sqlite porque abre una conexión nueva
 * en la que `PRAGMA foreign_keys` queda desactivado.
 */
export class BaseDatosSqlite implements BaseDatos {
  private cola: Promise<unknown> = Promise.resolve();
  private readonly directa: Consultas;

  constructor(conexion: ConexionSql) {
    this.directa = {
      ejecutar: (sql, params = []) => conexion.ejecutar(sql, params),
      consultar: (sql, params = []) => conexion.consultar(sql, params),
      consultarUno: async <T>(sql: string, params: ValorSql[] = []) =>
        (await conexion.consultar<T>(sql, params))[0] ?? null,
      ejecutarScript: (sql) => conexion.ejecutarScript(sql),
    };
  }

  /** Configuración por conexión. Debe correr fuera de una transacción. */
  static async abrir(conexion: ConexionSql): Promise<BaseDatosSqlite> {
    await conexion.ejecutarScript('PRAGMA foreign_keys = ON; PRAGMA synchronous = FULL;');
    await conexion.consultar('PRAGMA journal_mode = WAL', []);
    return new BaseDatosSqlite(conexion);
  }

  private enCola<T>(tarea: () => Promise<T>): Promise<T> {
    const resultado = this.cola.then(tarea);
    this.cola = resultado.catch(() => undefined);
    return resultado;
  }

  ejecutar(sql: string, params?: ValorSql[]) {
    return this.enCola(() => this.directa.ejecutar(sql, params));
  }

  consultar<T>(sql: string, params?: ValorSql[]) {
    return this.enCola(() => this.directa.consultar<T>(sql, params));
  }

  consultarUno<T>(sql: string, params?: ValorSql[]) {
    return this.enCola(() => this.directa.consultarUno<T>(sql, params));
  }

  ejecutarScript(sql: string) {
    return this.enCola(() => this.directa.ejecutarScript(sql));
  }

  transaccion<T>(fn: (tx: Consultas) => Promise<T>): Promise<T> {
    return this.enCola(async () => {
      await this.directa.ejecutarScript('BEGIN IMMEDIATE');
      try {
        const resultado = await fn(this.directa);
        await this.directa.ejecutarScript('COMMIT');
        return resultado;
      } catch (error) {
        await this.directa.ejecutarScript('ROLLBACK');
        throw error;
      }
    });
  }
}
