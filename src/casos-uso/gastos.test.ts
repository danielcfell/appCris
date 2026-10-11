import { listarCategorias, listarGastos, listarGastosDeActividad, obtenerGasto } from '../datos/gastos';
import { listarJornalesDeActividad } from '../datos/jornales';
import { costoDeActividad, resumenDePeriodo } from '../datos/resumenes';
import { MontoInvalido, NoEncontrado, OperacionNoPermitida } from '../dominio/errores';
import { crearActividadConJornales } from './actividades';
import { escenario } from './datos-de-prueba';
import { crearCategoria, editarGasto, eliminarGasto, registrarGasto, renombrarCategoria } from './gastos';
import { registrarPago } from './pagos';

async function categoria(db: Awaited<ReturnType<typeof escenario>>['db'], nombre: string) {
  const c = (await listarCategorias(db)).find((x) => x.nombre === nombre);
  if (!c) throw new Error(`falta categoría ${nombre}`);
  return c.id;
}

describe('RF-16 / RF-18: gastos', () => {
  test('con y sin actividad asociada', async () => {
    const { db, diario, trabajadores } = await escenario();
    const actividadId = await crearActividadConJornales(db, {
      fecha: '2026-10-10',
      descripcion: 'Fumigación',
      tipoTareaId: diario,
      cantidadComun: 100,
      tarifaComun: 2000,
      trabajadores: [{ trabajadorId: trabajadores[0] }],
    });
    const almuerzos = await categoria(db, 'Almuerzos');
    const materiales = await categoria(db, 'Materiales');
    await registrarGasto(db, { fecha: '2026-10-10', monto: 1800, categoriaId: almuerzos, actividadId, nota: ' 5 almuerzos ' });
    await registrarGasto(db, { fecha: '2026-10-09', monto: 25000, categoriaId: materiales, actividadId: null, nota: '' });

    const gastos = await listarGastos(db, '2026-10-01', '2026-10-31');
    expect(gastos.map((g) => [g.categoria, g.monto, g.nota])).toEqual([
      ['Almuerzos', 1800, '5 almuerzos'],
      ['Materiales', 25000, null],
    ]);
    expect(await listarGastosDeActividad(db, actividadId)).toHaveLength(1);
    expect(await obtenerGasto(db, gastos[0].id)).toMatchObject({ categoria: 'Almuerzos', actividadId, monto: 1800 });
    expect(await obtenerGasto(db, 999)).toBeNull();
  });

  test('valida monto, categoría y actividad', async () => {
    const { db } = await escenario();
    const otros = await categoria(db, 'Otros');
    const base = { fecha: '2026-10-10', monto: 100, categoriaId: otros, actividadId: null, nota: null };
    await expect(registrarGasto(db, { ...base, monto: 0 })).rejects.toThrow(MontoInvalido);
    await expect(registrarGasto(db, { ...base, categoriaId: 999 })).rejects.toThrow(NoEncontrado);
    await expect(registrarGasto(db, { ...base, actividadId: 999 })).rejects.toThrow(NoEncontrado);
  });

  test('editar y eliminar', async () => {
    const { db } = await escenario();
    const otros = await categoria(db, 'Otros');
    const id = await registrarGasto(db, { fecha: '2026-10-10', monto: 100, categoriaId: otros, actividadId: null, nota: null });
    await editarGasto(db, id, { fecha: '2026-10-11', monto: 300, categoriaId: otros, actividadId: null, nota: 'x' });
    expect((await listarGastos(db, '2026-10-11', '2026-10-11'))[0]).toMatchObject({ monto: 300, nota: 'x' });
    await eliminarGasto(db, id);
    expect(await listarGastos(db, '2026-01-01', '2026-12-31')).toEqual([]);
  });
});

describe('RF-17: categorías', () => {
  test('el usuario crea y renombra categorías; no se repiten nombres', async () => {
    const { db } = await escenario();
    const id = await crearCategoria(db, 'Combustible');
    expect((await listarCategorias(db)).map((c) => c.nombre)).toContain('Combustible');
    await expect(crearCategoria(db, 'almuerzos')).rejects.toThrow(OperacionNoPermitida);
    await renombrarCategoria(db, id, 'Diésel');
    await renombrarCategoria(db, id, 'diésel');
    expect((await listarCategorias(db)).map((c) => c.nombre)).toContain('diésel');
  });
});

describe('resúmenes', () => {
  test('RF-21: costo de una actividad = jornales + gastos, con pagado y pendiente', async () => {
    const { db, diario, trabajadores } = await escenario();
    const actividadId = await crearActividadConJornales(db, {
      fecha: '2026-10-10',
      descripcion: 'Fumigación',
      tipoTareaId: diario,
      cantidadComun: 100,
      tarifaComun: 2000,
      trabajadores: trabajadores.map((trabajadorId) => ({ trabajadorId })),
    });
    const [primero] = await listarJornalesDeActividad(db, actividadId);
    await registrarPago(db, { jornalId: primero.id, monto: 2000, fecha: '2026-10-10' });
    await registrarGasto(db, {
      fecha: '2026-10-10',
      monto: 1800,
      categoriaId: await categoria(db, 'Almuerzos'),
      actividadId,
      nota: null,
    });
    expect(await costoDeActividad(db, actividadId)).toEqual({
      jornales: 10000,
      gastos: 1800,
      total: 11800,
      pagado: 2000,
      pendiente: 8000,
    });
  });

  test('RF-20: resumen del período con mano de obra devengada y total por categoría', async () => {
    const { db, diario, trabajadores } = await escenario();
    const base = { descripcion: 'x', tipoTareaId: diario, cantidadComun: 100, tarifaComun: 2000 };
    const octubre = await crearActividadConJornales(db, {
      ...base,
      fecha: '2026-10-05',
      trabajadores: trabajadores.slice(0, 2).map((trabajadorId) => ({ trabajadorId })),
    });
    await crearActividadConJornales(db, {
      ...base,
      fecha: '2026-09-30',
      trabajadores: [{ trabajadorId: trabajadores[0] }],
    });
    const [jornal] = await listarJornalesDeActividad(db, octubre);
    await registrarPago(db, { jornalId: jornal.id, monto: 2000, fecha: '2026-11-02' });
    const materiales = await categoria(db, 'Materiales');
    const almuerzos = await categoria(db, 'Almuerzos');
    await registrarGasto(db, { fecha: '2026-10-09', monto: 25000, categoriaId: materiales, actividadId: null, nota: null });
    await registrarGasto(db, { fecha: '2026-10-31', monto: 4400, categoriaId: almuerzos, actividadId: null, nota: null });
    await registrarGasto(db, { fecha: '2026-11-01', monto: 999, categoriaId: almuerzos, actividadId: null, nota: null });

    const r = await resumenDePeriodo(db, '2026-10-01', '2026-10-31');
    expect(r.manoDeObra).toBe(4000);
    expect(r.manoDeObraPagada).toBe(2000);
    expect(r.manoDeObraPendiente).toBe(2000);
    expect(r.porCategoria.map((c) => [c.nombre, c.total])).toEqual([
      ['Materiales', 25000],
      ['Almuerzos', 4400],
      ['Alquiler de maquinaria', 0],
      ['Otros', 0],
    ]);
    expect(r.total).toBe(4000 + 25000 + 4400);
  });
});
