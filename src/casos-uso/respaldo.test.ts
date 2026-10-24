import { baseDePrueba } from '../datos/adaptador-node';
import { leerConfig } from '../datos/config';
import { listarCategorias } from '../datos/gastos';
import { listarJornalesDeActividad } from '../datos/jornales';
import { MIGRACIONES } from '../datos/migraciones';
import { leerTablas } from '../datos/respaldo';
import { totalAdeudado } from '../datos/resumenes';
import { RespaldoInvalido } from '../dominio/errores';
import { crearActividadConJornales } from './actividades';
import { contar, escenario } from './datos-de-prueba';
import { registrarGasto } from './gastos';
import { registrarPago } from './pagos';
import {
  generarRespaldo,
  inicioCuentaRecordatorio,
  leerRespaldo,
  marcarRespaldoGuardado,
  registrarPrimeraApertura,
  restaurarRespaldo,
} from './respaldo';

const AHORA = new Date(2026, 9, 10, 18, 30);

// Restaurar un respaldo inconsistente registra el error de SQLite antes de rechazarlo.
beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => undefined));
afterEach(() => jest.restoreAllMocks());

/** Escenario con una actividad de 3 trabajadores, un pago parcial, un gasto y una categoría nueva. */
async function conDatos() {
  const e = await escenario();
  const actividadId = await crearActividadConJornales(e.db, {
    fecha: '2026-10-08',
    descripcion: 'Fumigación lote norte',
    tipoTareaId: e.diario,
    cantidadComun: 100,
    tarifaComun: 2000,
    trabajadores: e.trabajadores.slice(0, 3).map((trabajadorId) => ({ trabajadorId })),
  });
  const [jornal] = await listarJornalesDeActividad(e.db, actividadId);
  await registrarPago(e.db, { jornalId: jornal.id, monto: 500, fecha: '2026-10-09' });
  const almuerzos = (await listarCategorias(e.db)).find((c) => c.nombre === 'Almuerzos')!;
  await registrarGasto(e.db, { fecha: '2026-10-08', monto: 1800, categoriaId: almuerzos.id, actividadId, nota: 'Ñaño' });
  return { ...e, actividadId };
}

describe('RF-22 / RF-23: exportar y restaurar', () => {
  test('ida y vuelta: otra base queda con los mismos datos y los mismos saldos', async () => {
    const origen = await conDatos();
    const texto = JSON.stringify(await generarRespaldo(origen.db, AHORA));

    const destino = await baseDePrueba();
    await restaurarRespaldo(destino, await leerRespaldo(destino, texto));

    expect(await leerTablas(destino)).toEqual(await leerTablas(origen.db));
    expect(await totalAdeudado(destino)).toBe(6000 - 500);
  });

  test('el respaldo lleva formato, versiones y fecha', async () => {
    const { db } = await escenario();
    const r = await generarRespaldo(db, AHORA);
    expect(r).toMatchObject({
      formato: 'appcris-respaldo',
      version_formato: 1,
      version_esquema: MIGRACIONES.length,
      creado_en: AHORA.toISOString(),
    });
    expect(r.tablas.trabajador).toHaveLength(5);
  });

  test('restaurar reemplaza los datos actuales, no los mezcla', async () => {
    const { db } = await escenario();
    const vacio = JSON.stringify(await generarRespaldo(await baseDePrueba(), AHORA));
    const otro = await conDatos();
    await restaurarRespaldo(otro.db, await leerRespaldo(otro.db, vacio));
    for (const tabla of ['trabajador', 'actividad', 'jornal', 'pago', 'gasto']) expect(await contar(otro.db, tabla)).toBe(0);
    expect(await contar(otro.db, 'categoria_gasto')).toBe(4);
    expect(await contar(db, 'trabajador')).toBe(5);
  });

  test('RNF-03 / RN-02: un respaldo con datos inconsistentes no cambia nada', async () => {
    const origen = await conDatos();
    const r = await generarRespaldo(origen.db, AHORA);
    // Un pago mayor al monto del jornal: el disparador de RN-02 lo rechaza al insertar.
    r.tablas.pago[0].monto_centavos = 999_999;
    const destino = await conDatos();
    const antes = await leerTablas(destino.db);
    const error = restaurarRespaldo(destino.db, await leerRespaldo(destino.db, JSON.stringify(r)));
    await expect(error).rejects.toThrow(RespaldoInvalido);
    await expect(error).rejects.toThrow('Tus datos no cambiaron');
    expect(await leerTablas(destino.db)).toEqual(antes);
  });

  test('un jornal que apunta a un trabajador inexistente se rechaza', async () => {
    const origen = await conDatos();
    const r = await generarRespaldo(origen.db, AHORA);
    r.tablas.jornal[0].trabajador_id = 999;
    const destino = await baseDePrueba();
    await expect(restaurarRespaldo(destino, await leerRespaldo(destino, JSON.stringify(r)))).rejects.toThrow(
      RespaldoInvalido,
    );
    expect(await contar(destino, 'trabajador')).toBe(0);
  });

  test('restaurar no toca la configuración de este celular', async () => {
    const { db } = await escenario();
    await marcarRespaldoGuardado(db, AHORA);
    const vacio = JSON.stringify(await generarRespaldo(await baseDePrueba(), new Date(2026, 0, 1)));
    await restaurarRespaldo(db, await leerRespaldo(db, vacio));
    expect(await leerConfig(db, 'ultimo_respaldo_en')).toBe(AHORA.toISOString());
  });
});

describe('RF-24 / RF-25: fechas del recordatorio', () => {
  test('sin respaldo cuenta desde la primera apertura, que no se sobrescribe', async () => {
    const { db } = await escenario();
    expect(await inicioCuentaRecordatorio(db)).toBeNull();
    await registrarPrimeraApertura(db, new Date(2026, 9, 1));
    await registrarPrimeraApertura(db, new Date(2026, 9, 5));
    expect(await inicioCuentaRecordatorio(db)).toBe(new Date(2026, 9, 1).toISOString());
  });

  test('con respaldo cuenta desde el último', async () => {
    const { db } = await escenario();
    await registrarPrimeraApertura(db, new Date(2026, 9, 1));
    await marcarRespaldoGuardado(db, new Date(2026, 9, 3));
    await marcarRespaldoGuardado(db, AHORA);
    expect(await inicioCuentaRecordatorio(db)).toBe(AHORA.toISOString());
    expect(await leerConfig(db, 'ultimo_respaldo_en')).toBe(AHORA.toISOString());
  });
});
