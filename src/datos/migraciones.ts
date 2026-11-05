import type { BaseDatos, Consultas } from './base-datos';

/**
 * Migraciones en orden. La posición en la lista es la versión (1, 2, ...).
 * Una migración publicada nunca se edita: los cambios van en una migración nueva.
 */
export const MIGRACIONES: readonly string[] = [
  // 1: esquema inicial
  `
  CREATE TABLE trabajador (
    id        INTEGER PRIMARY KEY,
    nombre    TEXT    NOT NULL CHECK (length(trim(nombre)) > 0),
    telefono  TEXT,
    activo    INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
    creado_en TEXT    NOT NULL
  );

  CREATE TABLE tipo_tarea (
    id                       INTEGER PRIMARY KEY,
    nombre                   TEXT    NOT NULL CHECK (length(trim(nombre)) > 0),
    unidad                   TEXT    NOT NULL CHECK (unidad IN ('dia', 'tarea', 'hora')),
    tarifa_sugerida_centavos INTEGER NOT NULL CHECK (tarifa_sugerida_centavos >= 0),
    activo                   INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1))
  );

  CREATE TABLE actividad (
    id            INTEGER PRIMARY KEY,
    fecha         TEXT    NOT NULL,
    descripcion   TEXT    NOT NULL,
    tipo_tarea_id INTEGER NOT NULL REFERENCES tipo_tarea(id) ON DELETE RESTRICT,
    creado_en     TEXT    NOT NULL
  );

  CREATE TABLE jornal (
    id                  INTEGER PRIMARY KEY,
    actividad_id        INTEGER NOT NULL REFERENCES actividad(id)  ON DELETE RESTRICT,
    trabajador_id       INTEGER NOT NULL REFERENCES trabajador(id) ON DELETE RESTRICT,
    unidad              TEXT    NOT NULL CHECK (unidad IN ('dia', 'tarea', 'hora')),
    cantidad_centesimas INTEGER NOT NULL CHECK (cantidad_centesimas > 0),
    tarifa_centavos     INTEGER NOT NULL CHECK (tarifa_centavos > 0),
    monto_centavos      INTEGER NOT NULL
      CHECK (monto_centavos > 0 AND monto_centavos = (cantidad_centesimas * tarifa_centavos + 50) / 100),
    creado_en           TEXT    NOT NULL,
    UNIQUE (actividad_id, trabajador_id)
  );

  CREATE TABLE pago (
    id             INTEGER PRIMARY KEY,
    jornal_id      INTEGER NOT NULL REFERENCES jornal(id) ON DELETE CASCADE,
    fecha          TEXT    NOT NULL,
    monto_centavos INTEGER NOT NULL CHECK (monto_centavos > 0),
    creado_en      TEXT    NOT NULL
  );

  CREATE TABLE categoria_gasto (
    id     INTEGER PRIMARY KEY,
    nombre TEXT    NOT NULL UNIQUE COLLATE NOCASE CHECK (length(trim(nombre)) > 0),
    activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1))
  );

  CREATE TABLE gasto (
    id             INTEGER PRIMARY KEY,
    fecha          TEXT    NOT NULL,
    monto_centavos INTEGER NOT NULL CHECK (monto_centavos > 0),
    categoria_id   INTEGER NOT NULL REFERENCES categoria_gasto(id) ON DELETE RESTRICT,
    actividad_id   INTEGER REFERENCES actividad(id) ON DELETE RESTRICT,
    nota           TEXT,
    creado_en      TEXT    NOT NULL
  );

  CREATE TABLE config (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
  );

  CREATE VIEW v_jornal_saldo AS
  SELECT j.*,
         COALESCE(SUM(p.monto_centavos), 0)                    AS pagado_centavos,
         j.monto_centavos - COALESCE(SUM(p.monto_centavos), 0) AS saldo_centavos
  FROM jornal j LEFT JOIN pago p ON p.jornal_id = j.id
  GROUP BY j.id;

  CREATE INDEX ix_jornal_trabajador ON jornal(trabajador_id);
  CREATE INDEX ix_jornal_actividad  ON jornal(actividad_id);
  CREATE INDEX ix_pago_jornal       ON pago(jornal_id);
  CREATE INDEX ix_actividad_fecha   ON actividad(fecha);
  CREATE INDEX ix_gasto_fecha       ON gasto(fecha);
  CREATE INDEX ix_gasto_actividad   ON gasto(actividad_id);

  -- RN-02 como respaldo de la validación del dominio: el saldo nunca queda negativo.
  CREATE TRIGGER tr_pago_insert_no_excede BEFORE INSERT ON pago
  BEGIN
    SELECT RAISE(ABORT, 'PAGO_EXCEDE_SALDO')
    WHERE (SELECT COALESCE(SUM(monto_centavos), 0) FROM pago WHERE jornal_id = NEW.jornal_id)
          + NEW.monto_centavos
          > (SELECT monto_centavos FROM jornal WHERE id = NEW.jornal_id);
  END;

  CREATE TRIGGER tr_pago_update_no_excede BEFORE UPDATE OF monto_centavos, jornal_id ON pago
  BEGIN
    SELECT RAISE(ABORT, 'PAGO_EXCEDE_SALDO')
    WHERE (SELECT COALESCE(SUM(monto_centavos), 0) FROM pago
           WHERE jornal_id = NEW.jornal_id AND id <> OLD.id)
          + NEW.monto_centavos
          > (SELECT monto_centavos FROM jornal WHERE id = NEW.jornal_id);
  END;

  CREATE TRIGGER tr_jornal_monto_no_menor_pagado BEFORE UPDATE OF monto_centavos ON jornal
  BEGIN
    SELECT RAISE(ABORT, 'MONTO_MENOR_QUE_PAGADO')
    WHERE NEW.monto_centavos
          < (SELECT COALESCE(SUM(monto_centavos), 0) FROM pago WHERE jornal_id = NEW.id);
  END;

  -- RF-17: categorías iniciales.
  INSERT INTO categoria_gasto (nombre) VALUES
    ('Materiales'), ('Almuerzos'), ('Alquiler de maquinaria'), ('Otros');
  `,
  // 2: cultivos. Datos existentes quedan sin cultivo (RF-26, RF-27).
  `
  CREATE TABLE cultivo (
    id        INTEGER PRIMARY KEY,
    nombre    TEXT    NOT NULL CHECK (length(trim(nombre)) > 0),
    activo    INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
    creado_en TEXT    NOT NULL
  );

  ALTER TABLE actividad ADD COLUMN cultivo_id INTEGER REFERENCES cultivo(id) ON DELETE RESTRICT;
  ALTER TABLE gasto ADD COLUMN cultivo_id INTEGER REFERENCES cultivo(id) ON DELETE RESTRICT;
  CREATE INDEX ix_actividad_cultivo ON actividad(cultivo_id);
  CREATE INDEX ix_gasto_cultivo ON gasto(cultivo_id);
  `,
];

export async function versionEsquema(db: Consultas): Promise<number> {
  const fila = await db.consultarUno<{ user_version: number }>('PRAGMA user_version');
  return fila?.user_version ?? 0;
}

/** Aplica cada migración pendiente en su propia transacción. */
export async function aplicarMigraciones(db: BaseDatos): Promise<void> {
  const actual = await versionEsquema(db);
  for (let version = actual + 1; version <= MIGRACIONES.length; version++) {
    await db.transaccion(async (tx) => {
      await tx.ejecutarScript(MIGRACIONES[version - 1]);
      await tx.ejecutarScript(`PRAGMA user_version = ${version}`);
    });
  }
}
