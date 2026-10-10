import { baseDePrueba, conexionNode } from './adaptador-node';
import { BaseDatosSqlite } from './base-datos';
import { MIGRACIONES, aplicarMigraciones, versionEsquema } from './migraciones';
import { listarCategorias } from './gastos';

async function conJornal() {
  const db = await baseDePrueba();
  await db.ejecutarScript(`
    INSERT INTO trabajador (id, nombre, creado_en) VALUES (1, 'Juan', 'x');
    INSERT INTO tipo_tarea (id, nombre, unidad, tarifa_sugerida_centavos) VALUES (1, 'Diario', 'dia', 2000);
    INSERT INTO actividad (id, fecha, descripcion, tipo_tarea_id, creado_en) VALUES (1, '2026-10-10', 'x', 1, 'x');
    INSERT INTO jornal (id, actividad_id, trabajador_id, unidad, cantidad_centesimas, tarifa_centavos, monto_centavos, creado_en)
      VALUES (1, 1, 1, 'dia', 100, 2000, 2000, 'x');
  `);
  return db;
}

describe('migraciones', () => {
  test('crean el esquema desde cero y dejan la versión actual', async () => {
    const db = await baseDePrueba();
    expect(await versionEsquema(db)).toBe(MIGRACIONES.length);
  });

  test('aplicarlas otra vez no hace nada', async () => {
    const db = await baseDePrueba();
    await aplicarMigraciones(db);
    expect(await versionEsquema(db)).toBe(MIGRACIONES.length);
    expect(await listarCategorias(db)).toHaveLength(4);
  });

  test('RF-17: categorías iniciales', async () => {
    const db = await baseDePrueba();
    expect((await listarCategorias(db)).map((c) => c.nombre)).toEqual([
      'Materiales',
      'Almuerzos',
      'Alquiler de maquinaria',
      'Otros',
    ]);
  });

  test('las claves foráneas están activas', async () => {
    const db = await baseDePrueba();
    expect(await db.consultarUno('PRAGMA foreign_keys')).toEqual({ foreign_keys: 1 });
  });
});

describe('restricciones de la base (respaldo del dominio)', () => {
  test('RN-02: el disparador rechaza un pago que excede el saldo', async () => {
    const db = await conJornal();
    await db.ejecutar("INSERT INTO pago (jornal_id, fecha, monto_centavos, creado_en) VALUES (1, '2026-10-10', 1500, 'x')");
    await expect(
      db.ejecutar("INSERT INTO pago (jornal_id, fecha, monto_centavos, creado_en) VALUES (1, '2026-10-10', 501, 'x')"),
    ).rejects.toThrow('PAGO_EXCEDE_SALDO');
  });

  test('RN-02: el disparador rechaza bajar el monto por debajo de lo pagado', async () => {
    const db = await conJornal();
    await db.ejecutar("INSERT INTO pago (jornal_id, fecha, monto_centavos, creado_en) VALUES (1, '2026-10-10', 1500, 'x')");
    await expect(
      db.ejecutar('UPDATE jornal SET cantidad_centesimas = 50, monto_centavos = 1000 WHERE id = 1'),
    ).rejects.toThrow('MONTO_MENOR_QUE_PAGADO');
  });

  test('RF-07: el CHECK rechaza un monto distinto de cantidad × tarifa', async () => {
    const db = await conJornal();
    await expect(db.ejecutar('UPDATE jornal SET monto_centavos = 2500 WHERE id = 1')).rejects.toThrow(/CHECK/);
  });

  test('RN-05: no se puede borrar un trabajador con jornales', async () => {
    const db = await conJornal();
    await expect(db.ejecutar('DELETE FROM trabajador WHERE id = 1')).rejects.toThrow(/FOREIGN KEY/);
  });

  test('RNF-02: los montos negativos se rechazan', async () => {
    const db = await conJornal();
    await expect(
      db.ejecutar("INSERT INTO pago (jornal_id, fecha, monto_centavos, creado_en) VALUES (1, '2026-10-10', -1, 'x')"),
    ).rejects.toThrow(/CHECK/);
  });
});

describe('RNF-03: transacciones', () => {
  test('si algo falla, no se guarda nada', async () => {
    const db = await baseDePrueba();
    await expect(
      db.transaccion(async (tx) => {
        await tx.ejecutar("INSERT INTO trabajador (nombre, creado_en) VALUES ('Juan', 'x')");
        throw new Error('falla a mitad');
      }),
    ).rejects.toThrow('falla a mitad');
    expect(await db.consultar('SELECT * FROM trabajador')).toEqual([]);
  });

  test('las operaciones lanzadas a la vez no se mezclan con una transacción', async () => {
    const db = await BaseDatosSqlite.abrir(conexionNode());
    await aplicarMigraciones(db);
    const transaccion = db.transaccion(async (tx) => {
      await tx.ejecutar("INSERT INTO trabajador (nombre, creado_en) VALUES ('Juan', 'x')");
      await new Promise((r) => setTimeout(r, 10));
      throw new Error('revertir');
    });
    const insercionAparte = db.ejecutar("INSERT INTO trabajador (nombre, creado_en) VALUES ('María', 'x')");
    await expect(transaccion).rejects.toThrow('revertir');
    await insercionAparte;
    expect(await db.consultar('SELECT nombre FROM trabajador')).toEqual([{ nombre: 'María' }]);
  });
});
