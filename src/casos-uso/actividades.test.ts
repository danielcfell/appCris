import { listarJornalesDeActividad } from '../datos/jornales';
import { obtenerActividad } from '../datos/actividades';
import { listarTrabajadores } from '../datos/trabajadores';
import { CantidadInvalida, DatoRequerido, NoEncontrado, OperacionNoPermitida } from '../dominio/errores';
import { agregarJornales, crearActividadConJornales, eliminarActividad } from './actividades';
import { contar, escenario } from './datos-de-prueba';
import { eliminarJornal } from './jornales';
import { editarTipoTarea } from './tipos-tarea';
import { crearTrabajador, desactivarTrabajador } from './trabajadores';

const HOY = '2026-10-10';

describe('crearActividadConJornales', () => {
  test('RF-06: mismo monto a 5 trabajadores en un solo paso', async () => {
    const { db, diario, trabajadores } = await escenario();
    const id = await crearActividadConJornales(db, {
      fecha: HOY,
      descripcion: 'Fumigación lote norte',
      tipoTareaId: diario,
      cantidadComun: 100,
      tarifaComun: 2000,
      trabajadores: trabajadores.map((trabajadorId) => ({ trabajadorId })),
    });
    const jornales = await listarJornalesDeActividad(db, id);
    expect(jornales).toHaveLength(5);
    expect(jornales.every((j) => j.monto === 2000 && j.unidad === 'dia' && j.saldo === 2000)).toBe(true);
  });

  test('RF-06: ajustes individuales de cantidad y tarifa', async () => {
    const { db, diario, trabajadores } = await escenario();
    const [juan, maria, pedro] = trabajadores;
    const id = await crearActividadConJornales(db, {
      fecha: HOY,
      descripcion: 'Deshierbe',
      tipoTareaId: diario,
      cantidadComun: 100,
      tarifaComun: 2000,
      trabajadores: [{ trabajadorId: juan }, { trabajadorId: maria, tarifa: 2500 }, { trabajadorId: pedro, cantidad: 50 }],
    });
    const montos = Object.fromEntries((await listarJornalesDeActividad(db, id)).map((j) => [j.trabajadorId, j.monto]));
    expect(montos).toEqual({ [juan]: 2000, [maria]: 2500, [pedro]: 1000 });
  });

  test('RF-19: el tractor es un trabajador con jornal por hora (3 h × $15 = $45)', async () => {
    const { db, tractor } = await escenario();
    const donLuis = await crearTrabajador(db, { nombre: 'Tractor Don Luis' });
    const id = await crearActividadConJornales(db, {
      fecha: HOY,
      descripcion: 'Arado',
      tipoTareaId: tractor,
      cantidadComun: 300,
      tarifaComun: 1500,
      trabajadores: [{ trabajadorId: donLuis }],
    });
    const [jornal] = await listarJornalesDeActividad(db, id);
    expect(jornal).toMatchObject({ unidad: 'hora', cantidad: 300, tarifa: 1500, monto: 4500 });
  });

  test('RNF-03: si un jornal es inválido, no se guarda ni la actividad ni los demás jornales', async () => {
    const { db, diario, trabajadores } = await escenario();
    await desactivarTrabajador(db, trabajadores[4]);
    await expect(
      crearActividadConJornales(db, {
        fecha: HOY,
        descripcion: 'Fumigación',
        tipoTareaId: diario,
        cantidadComun: 100,
        tarifaComun: 2000,
        trabajadores: trabajadores.map((trabajadorId) => ({ trabajadorId })),
      }),
    ).rejects.toThrow(OperacionNoPermitida);
    expect(await contar(db, 'actividad')).toBe(0);
    expect(await contar(db, 'jornal')).toBe(0);
  });

  test('RNF-03: una cantidad inválida a mitad de la lista tampoco deja nada', async () => {
    const { db, diario, trabajadores } = await escenario();
    await expect(
      crearActividadConJornales(db, {
        fecha: HOY,
        descripcion: 'Fumigación',
        tipoTareaId: diario,
        cantidadComun: 100,
        tarifaComun: 2000,
        trabajadores: [{ trabajadorId: trabajadores[0] }, { trabajadorId: trabajadores[1], cantidad: 0 }],
      }),
    ).rejects.toThrow(CantidadInvalida);
    expect(await contar(db, 'actividad')).toBe(0);
    expect(await contar(db, 'jornal')).toBe(0);
  });

  test('un trabajador no puede aparecer dos veces en la misma actividad', async () => {
    const { db, diario, trabajadores } = await escenario();
    await expect(
      crearActividadConJornales(db, {
        fecha: HOY,
        descripcion: 'x',
        tipoTareaId: diario,
        cantidadComun: 100,
        tarifaComun: 2000,
        trabajadores: [{ trabajadorId: trabajadores[0] }, { trabajadorId: trabajadores[0] }],
      }),
    ).rejects.toThrow(OperacionNoPermitida);
  });

  test('exige al menos un trabajador, un tipo de tarea existente y una fecha válida', async () => {
    const { db, diario, trabajadores } = await escenario();
    const base = { fecha: HOY, descripcion: 'x', tipoTareaId: diario, cantidadComun: 100, tarifaComun: 2000 };
    await expect(crearActividadConJornales(db, { ...base, trabajadores: [] })).rejects.toThrow(DatoRequerido);
    await expect(
      crearActividadConJornales(db, { ...base, tipoTareaId: 999, trabajadores: [{ trabajadorId: trabajadores[0] }] }),
    ).rejects.toThrow(NoEncontrado);
    await expect(
      crearActividadConJornales(db, { ...base, fecha: '2026-02-30', trabajadores: [{ trabajadorId: trabajadores[0] }] }),
    ).rejects.toThrow('no es válida');
  });

  test('sin descripción se usa el nombre del tipo de tarea', async () => {
    const { db, diario, trabajadores } = await escenario();
    const id = await crearActividadConJornales(db, {
      fecha: HOY,
      descripcion: '   ',
      tipoTareaId: diario,
      cantidadComun: 100,
      tarifaComun: 2000,
      trabajadores: [{ trabajadorId: trabajadores[0] }],
    });
    expect((await obtenerActividad(db, id))?.descripcion).toBe('Diario');
  });
});

test('RN-04: cambiar la tarifa sugerida no altera jornales ya creados', async () => {
  const { db, diario, trabajadores } = await escenario();
  const id = await crearActividadConJornales(db, {
    fecha: HOY,
    descripcion: 'x',
    tipoTareaId: diario,
    cantidadComun: 100,
    tarifaComun: 2000,
    trabajadores: [{ trabajadorId: trabajadores[0] }],
  });
  await editarTipoTarea(db, diario, { nombre: 'Diario', unidad: 'dia', tarifaSugerida: 2500 });
  const [jornal] = await listarJornalesDeActividad(db, id);
  expect(jornal).toMatchObject({ tarifa: 2000, monto: 2000 });
});

describe('RF-02 / RN-05: trabajadores desactivados', () => {
  test('no se ofrecen al crear actividades pero conservan su historial', async () => {
    const { db, diario, trabajadores } = await escenario();
    const juan = trabajadores[0];
    const id = await crearActividadConJornales(db, {
      fecha: HOY,
      descripcion: 'x',
      tipoTareaId: diario,
      cantidadComun: 100,
      tarifaComun: 2000,
      trabajadores: [{ trabajadorId: juan }],
    });
    await desactivarTrabajador(db, juan);
    expect((await listarTrabajadores(db)).map((t) => t.id)).not.toContain(juan);
    expect((await listarTrabajadores(db, { incluirInactivos: true })).map((t) => t.id)).toContain(juan);
    expect(await listarJornalesDeActividad(db, id)).toHaveLength(1);
  });
});

describe('agregarJornales y eliminarActividad', () => {
  test('se puede agregar un trabajador olvidado a una actividad existente', async () => {
    const { db, diario, trabajadores } = await escenario();
    const id = await crearActividadConJornales(db, {
      fecha: HOY,
      descripcion: 'x',
      tipoTareaId: diario,
      cantidadComun: 100,
      tarifaComun: 2000,
      trabajadores: [{ trabajadorId: trabajadores[0] }],
    });
    await agregarJornales(db, id, { cantidadComun: 100, tarifaComun: 2000, trabajadores: [{ trabajadorId: trabajadores[1] }] });
    expect(await listarJornalesDeActividad(db, id)).toHaveLength(2);
    await expect(
      agregarJornales(db, id, { cantidadComun: 100, tarifaComun: 2000, trabajadores: [{ trabajadorId: trabajadores[1] }] }),
    ).rejects.toThrow(OperacionNoPermitida);
  });

  test('solo se elimina una actividad sin jornales ni gastos', async () => {
    const { db, diario, trabajadores } = await escenario();
    const id = await crearActividadConJornales(db, {
      fecha: HOY,
      descripcion: 'x',
      tipoTareaId: diario,
      cantidadComun: 100,
      tarifaComun: 2000,
      trabajadores: [{ trabajadorId: trabajadores[0] }],
    });
    await expect(eliminarActividad(db, id)).rejects.toThrow(OperacionNoPermitida);
    const [jornal] = await listarJornalesDeActividad(db, id);
    await eliminarJornal(db, jornal.id);
    await eliminarActividad(db, id);
    expect(await contar(db, 'actividad')).toBe(0);
  });
});
