import { listarActividades } from '../datos/actividades';
import { listarCultivos, hayRegistrosSinCultivo } from '../datos/cultivos';
import { listarCategorias, listarGastos, obtenerGasto } from '../datos/gastos';
import { listarPagosDeTrabajador } from '../datos/pagos';
import { deudasPorTrabajador, resumenDePeriodo, saldoDeTrabajador, totalAdeudado } from '../datos/resumenes';
import { DatoRequerido, NoEncontrado, OperacionNoPermitida } from '../dominio/errores';
import { crearActividadConJornales } from './actividades';
import { crearCultivo, desactivarCultivo, editarCultivo, guardarFiltroCultivo, leerFiltroCultivo, reactivarCultivo } from './cultivos';
import { escenario } from './datos-de-prueba';
import { editarGasto, registrarGasto } from './gastos';
import { pagarPendientesDeTrabajador } from './pagos';

type Escenario = Awaited<ReturnType<typeof escenario>>;

/** Una actividad de un día a $20 para los trabajadores indicados (por posición en `e.trabajadores`). */
function actividad(e: Escenario, cultivoId: number | null | undefined, quienes: number[], fecha = '2026-10-08') {
  return crearActividadConJornales(e.db, {
    fecha,
    descripcion: 'Deshierbe',
    tipoTareaId: e.diario,
    cultivoId,
    cantidadComun: 100,
    tarifaComun: 2000,
    trabajadores: quienes.map((i) => ({ trabajadorId: e.trabajadores[i] })),
  });
}

const categoria = async (e: Escenario, nombre: string) =>
  (await listarCategorias(e.db)).find((c) => c.nombre === nombre)!.id;

describe('RF-26: cultivos', () => {
  test('se crean, se editan y no admiten nombres repetidos', async () => {
    const { db } = await escenario();
    const papas = await crearCultivo(db, '  Papas 2026 ');
    await crearCultivo(db, 'Arveja');
    await expect(crearCultivo(db, 'papas 2026')).rejects.toThrow(OperacionNoPermitida);
    await expect(crearCultivo(db, '   ')).rejects.toThrow(DatoRequerido);
    await editarCultivo(db, papas, 'Papas — lote norte');
    expect((await listarCultivos(db)).map((c) => c.nombre)).toEqual(['Arveja', 'Papas — lote norte']);
    await expect(editarCultivo(db, 999, 'X')).rejects.toThrow(NoEncontrado);
  });

  test('RN-05: cerrar un cultivo conserva su historial y deja de ofrecerse', async () => {
    const e = await escenario();
    const papas = await crearCultivo(e.db, 'Papas');
    await crearCultivo(e.db, 'Arveja');
    await actividad(e, papas, [0]);
    await desactivarCultivo(e.db, papas);

    expect((await listarCultivos(e.db)).map((c) => c.nombre)).toEqual(['Arveja']);
    expect(await listarCultivos(e.db, { incluirInactivos: true })).toHaveLength(2);
    expect(await totalAdeudado(e.db, papas)).toBe(2000);
    await expect(actividad(e, papas, [1])).rejects.toThrow(OperacionNoPermitida);

    await reactivarCultivo(e.db, papas);
    await expect(actividad(e, papas, [1])).resolves.toBeGreaterThan(0);
  });
});

describe('RF-27: toda actividad y gasto suelto lleva cultivo', () => {
  test('sin cultivos en el catálogo se puede registrar sin cultivo', async () => {
    const e = await escenario();
    await expect(actividad(e, undefined, [0])).resolves.toBeGreaterThan(0);
    expect(await hayRegistrosSinCultivo(e.db)).toBe(true);
  });

  test('con cultivos, la actividad y el gasto suelto lo exigen', async () => {
    const e = await escenario();
    await crearCultivo(e.db, 'Papas');
    await expect(actividad(e, null, [0])).rejects.toThrow(DatoRequerido);
    await expect(actividad(e, 999, [0])).rejects.toThrow(NoEncontrado);
    const materiales = await categoria(e, 'Materiales');
    await expect(
      registrarGasto(e.db, { fecha: '2026-10-09', monto: 500, categoriaId: materiales, actividadId: null, nota: null }),
    ).rejects.toThrow(DatoRequerido);
  });

  test('un gasto ligado a una actividad hereda el cultivo de la actividad', async () => {
    const e = await escenario();
    const papas = await crearCultivo(e.db, 'Papas');
    const arveja = await crearCultivo(e.db, 'Arveja');
    const actividadId = await actividad(e, papas, [0]);
    const almuerzos = await categoria(e, 'Almuerzos');
    // Aunque se indique otro cultivo, manda el de la actividad.
    const id = await registrarGasto(e.db, {
      fecha: '2026-10-08',
      monto: 900,
      categoriaId: almuerzos,
      actividadId,
      cultivoId: arveja,
      nota: null,
    });
    expect(await obtenerGasto(e.db, id)).toMatchObject({ cultivoId: papas, cultivo: 'Papas' });
  });

  test('un gasto anterior a los cultivos se puede editar sin asignarle cultivo', async () => {
    const e = await escenario();
    const materiales = await categoria(e, 'Materiales');
    const datos = { fecha: '2026-10-09', monto: 500, categoriaId: materiales, actividadId: null, nota: null };
    const id = await registrarGasto(e.db, datos);
    await crearCultivo(e.db, 'Papas');
    await editarGasto(e.db, id, { ...datos, monto: 800 });
    expect(await obtenerGasto(e.db, id)).toMatchObject({ monto: 800, cultivoId: null });
    await expect(registrarGasto(e.db, datos)).rejects.toThrow(DatoRequerido);
  });

  test('al editar un gasto se conserva su cultivo aunque se haya cerrado', async () => {
    const e = await escenario();
    const papas = await crearCultivo(e.db, 'Papas');
    const materiales = await categoria(e, 'Materiales');
    const datos = { fecha: '2026-10-09', monto: 500, categoriaId: materiales, actividadId: null, cultivoId: papas, nota: null };
    const id = await registrarGasto(e.db, datos);
    await desactivarCultivo(e.db, papas);
    await editarGasto(e.db, id, { ...datos, monto: 700 });
    expect(await obtenerGasto(e.db, id)).toMatchObject({ monto: 700, cultivoId: papas });
    await expect(registrarGasto(e.db, datos)).rejects.toThrow(OperacionNoPermitida);
  });
});

describe('RF-28 / RN-03: las cuentas de cada cultivo no se mezclan', () => {
  /** Juan y María trabajan en papas; María también en arveja; una actividad vieja quedó sin cultivo. */
  async function dosCultivos() {
    const e = await escenario();
    await actividad(e, undefined, [2], '2026-09-01'); // Pedro, sin cultivo
    const papas = await crearCultivo(e.db, 'Papas');
    const arveja = await crearCultivo(e.db, 'Arveja');
    await actividad(e, papas, [0, 1]); // Juan y María: $20 c/u
    await actividad(e, arveja, [1], '2026-10-09'); // María: $20
    return { ...e, papas, arveja };
  }

  test('el total adeudado de cada cultivo suma solo sus jornales', async () => {
    const e = await dosCultivos();
    expect(await totalAdeudado(e.db, e.papas)).toBe(4000);
    expect(await totalAdeudado(e.db, e.arveja)).toBe(2000);
    expect(await totalAdeudado(e.db, null)).toBe(2000);
    expect(await totalAdeudado(e.db)).toBe(8000);
  });

  test('"A quién debo" separa la deuda de la misma persona en cada cultivo', async () => {
    const e = await dosCultivos();
    const maria = e.trabajadores[1];
    const enPapas = await deudasPorTrabajador(e.db, e.papas);
    const enArveja = await deudasPorTrabajador(e.db, e.arveja);
    expect(enPapas.map((d) => [d.trabajadorId, d.saldo])).toEqual([
      [e.trabajadores[0], 2000],
      [maria, 2000],
    ]);
    expect(enArveja.map((d) => [d.trabajadorId, d.saldo])).toEqual([[maria, 2000]]);
    expect((await deudasPorTrabajador(e.db)).find((d) => d.trabajadorId === maria)?.saldo).toBe(4000);
    expect(await saldoDeTrabajador(e.db, maria, e.arveja)).toBe(2000);
  });

  test('las actividades y los gastos se filtran por cultivo, incluido "sin cultivo"', async () => {
    const e = await dosCultivos();
    const materiales = await categoria(e, 'Materiales');
    await registrarGasto(e.db, { fecha: '2026-10-09', monto: 1500, categoriaId: materiales, actividadId: null, cultivoId: e.papas, nota: null });
    await registrarGasto(e.db, { fecha: '2026-10-09', monto: 300, categoriaId: materiales, actividadId: null, cultivoId: e.arveja, nota: null });

    const rango = ['2026-01-01', '2026-12-31'] as const;
    expect(await listarActividades(e.db, ...rango, e.papas)).toHaveLength(1);
    expect(await listarActividades(e.db, ...rango, null)).toHaveLength(1);
    expect(await listarActividades(e.db, ...rango)).toHaveLength(3);
    expect((await listarGastos(e.db, ...rango, e.papas)).map((g) => g.monto)).toEqual([1500]);
    expect((await listarGastos(e.db, ...rango, e.arveja)).map((g) => g.monto)).toEqual([300]);
    expect(await listarGastos(e.db, ...rango)).toHaveLength(2);
  });

  test('RF-20: el resumen de un cultivo no mezcla mano de obra ni gastos de otro', async () => {
    const e = await dosCultivos();
    const materiales = await categoria(e, 'Materiales');
    await registrarGasto(e.db, { fecha: '2026-10-09', monto: 1500, categoriaId: materiales, actividadId: null, cultivoId: e.papas, nota: null });

    const papas = await resumenDePeriodo(e.db, '2026-01-01', '2026-12-31', e.papas);
    expect(papas).toMatchObject({ manoDeObra: 4000, total: 5500 });
    expect(papas.porCategoria.find((c) => c.nombre === 'Materiales')?.total).toBe(1500);

    const arveja = await resumenDePeriodo(e.db, '2026-01-01', '2026-12-31', e.arveja);
    expect(arveja).toMatchObject({ manoDeObra: 2000, total: 2000 });
    expect(arveja.porCategoria.find((c) => c.nombre === 'Materiales')?.total).toBe(0);

    expect((await resumenDePeriodo(e.db, '2026-01-01', '2026-12-31')).total).toBe(8000 + 1500);
  });
});

describe('RF-29: pagar todo cubre solo el cultivo que se está viendo', () => {
  test('el pago total de un trabajador filtrado deja intacto el otro cultivo', async () => {
    const e = await escenario();
    const papas = await crearCultivo(e.db, 'Papas');
    const arveja = await crearCultivo(e.db, 'Arveja');
    await actividad(e, papas, [1]);
    await actividad(e, arveja, [1], '2026-10-09');
    const maria = e.trabajadores[1];

    const r = await pagarPendientesDeTrabajador(e.db, maria, '2026-10-10', papas);
    expect(r).toEqual({ pagos: 1, total: 2000 });
    expect(await saldoDeTrabajador(e.db, maria, papas)).toBe(0);
    expect(await saldoDeTrabajador(e.db, maria, arveja)).toBe(2000);
    expect(await listarPagosDeTrabajador(e.db, maria, papas)).toHaveLength(1);
    expect(await listarPagosDeTrabajador(e.db, maria, arveja)).toHaveLength(0);

    // Sin filtro paga lo que quede.
    expect(await pagarPendientesDeTrabajador(e.db, maria, '2026-10-11')).toEqual({ pagos: 1, total: 2000 });
  });
});

describe('RF-28: el último filtro se recuerda', () => {
  test('guarda todos, sin cultivo o un cultivo, y olvida uno que ya no existe', async () => {
    const { db } = await escenario();
    const papas = await crearCultivo(db, 'Papas');
    expect(await leerFiltroCultivo(db)).toBeUndefined();
    await guardarFiltroCultivo(db, papas);
    expect(await leerFiltroCultivo(db)).toBe(papas);
    await guardarFiltroCultivo(db, null);
    expect(await leerFiltroCultivo(db)).toBeNull();
    await guardarFiltroCultivo(db, 999);
    expect(await leerFiltroCultivo(db)).toBeUndefined();
    await guardarFiltroCultivo(db, undefined);
    expect(await leerFiltroCultivo(db)).toBeUndefined();
  });
});
