import { obtenerJornal, listarJornalesDeActividad } from '../datos/jornales';
import { listarPagosDeTrabajador } from '../datos/pagos';
import { deudasPorTrabajador, saldoDeTrabajador, totalAdeudado } from '../datos/resumenes';
import { MontoMenorQuePagado, PagoExcedeSaldo } from '../dominio/errores';
import { estadoJornal } from '../dominio/jornal';
import { crearActividadConJornales } from './actividades';
import { contar, escenario } from './datos-de-prueba';
import { editarJornal, eliminarJornal } from './jornales';
import { pagarPendientesDeActividad, pagarPendientesDeTrabajador, registrarPago } from './pagos';

const HOY = '2026-10-10';

/** Una actividad de $20 por trabajador con los trabajadores indicados. */
async function actividad(db: Awaited<ReturnType<typeof escenario>>['db'], tipo: number, ids: number[], tarifa = 2000) {
  const id = await crearActividadConJornales(db, {
    fecha: HOY,
    descripcion: 'Fumigación',
    tipoTareaId: tipo,
    cantidadComun: 100,
    tarifaComun: tarifa,
    trabajadores: ids.map((trabajadorId) => ({ trabajadorId })),
  });
  return { id, jornales: await listarJornalesDeActividad(db, id) };
}

async function estado(db: Awaited<ReturnType<typeof escenario>>['db'], jornalId: number) {
  const j = await obtenerJornal(db, jornalId);
  return j && { saldo: j.saldo, estado: estadoJornal(j.monto, j.pagado) };
}

describe('RF-09 / RF-10 / RN-01: pagos y estado del jornal', () => {
  test('un jornal nace pendiente, pasa a parcial y termina pagado', async () => {
    const { db, diario, trabajadores } = await escenario();
    const { jornales } = await actividad(db, diario, [trabajadores[0]]);
    const id = jornales[0].id;
    expect(await estado(db, id)).toEqual({ saldo: 2000, estado: 'pendiente' });

    await registrarPago(db, { jornalId: id, monto: 500, fecha: HOY });
    expect(await estado(db, id)).toEqual({ saldo: 1500, estado: 'parcial' });

    await registrarPago(db, { jornalId: id, monto: 1500, fecha: HOY });
    expect(await estado(db, id)).toEqual({ saldo: 0, estado: 'pagado' });
  });
});

describe('RF-12 / RN-02: no se paga más que el saldo', () => {
  test('rechaza un pago mayor al saldo y no lo guarda', async () => {
    const { db, diario, trabajadores } = await escenario();
    const { jornales } = await actividad(db, diario, [trabajadores[0]]);
    await registrarPago(db, { jornalId: jornales[0].id, monto: 1500, fecha: HOY });
    await expect(registrarPago(db, { jornalId: jornales[0].id, monto: 501, fecha: HOY })).rejects.toThrow(
      PagoExcedeSaldo,
    );
    expect(await contar(db, 'pago')).toBe(1);
  });

  test('dos pagos totales lanzados a la vez: solo uno pasa', async () => {
    const { db, diario, trabajadores } = await escenario();
    const { jornales } = await actividad(db, diario, [trabajadores[0]]);
    const resultados = await Promise.allSettled([
      registrarPago(db, { jornalId: jornales[0].id, monto: 2000, fecha: HOY }),
      registrarPago(db, { jornalId: jornales[0].id, monto: 2000, fecha: HOY }),
    ]);
    expect(resultados.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect((await obtenerJornal(db, jornales[0].id))?.saldo).toBe(0);
  });
});

describe('RN-03 / RF-13 / RF-15: a quién debo', () => {
  test('total adeudado es la suma de saldos y la lista va de mayor a menor', async () => {
    const { db, diario, trabajadores } = await escenario();
    const [juan, maria, pedro] = trabajadores;
    await actividad(db, diario, [juan, maria, pedro]);
    const segunda = await crearActividadConJornales(db, {
      fecha: HOY,
      descripcion: 'Deshierbe',
      tipoTareaId: diario,
      cantidadComun: 100,
      tarifaComun: 2000,
      trabajadores: [{ trabajadorId: maria }],
    });
    const [jornalMaria] = await listarJornalesDeActividad(db, segunda);
    await registrarPago(db, { jornalId: jornalMaria.id, monto: 500, fecha: HOY });

    expect(await totalAdeudado(db)).toBe(2000 + 3500 + 2000);
    expect((await deudasPorTrabajador(db)).map((d) => [d.nombre, d.saldo, d.jornalesPendientes])).toEqual([
      ['María', 3500, 2],
      ['Juan', 2000, 1],
      ['Pedro', 2000, 1],
    ]);
  });

  test('un trabajador sin saldo desaparece de la lista en cuanto se le paga', async () => {
    const { db, diario, trabajadores } = await escenario();
    const { jornales } = await actividad(db, diario, [trabajadores[0]]);
    await registrarPago(db, { jornalId: jornales[0].id, monto: 2000, fecha: HOY });
    expect(await deudasPorTrabajador(db)).toEqual([]);
    expect(await totalAdeudado(db)).toBe(0);
  });
});

describe('RF-11: pagar todo de una vez', () => {
  test('todo lo pendiente de un trabajador, respetando pagos parciales previos', async () => {
    const { db, diario, trabajadores } = await escenario();
    const juan = trabajadores[0];
    const a = await actividad(db, diario, [juan]);
    await actividad(db, diario, [juan], 2500);
    await registrarPago(db, { jornalId: a.jornales[0].id, monto: 500, fecha: HOY });

    const resultado = await pagarPendientesDeTrabajador(db, juan, HOY);
    expect(resultado).toEqual({ pagos: 2, total: 1500 + 2500 });
    expect(await saldoDeTrabajador(db, juan)).toBe(0);
    expect(await listarPagosDeTrabajador(db, juan)).toHaveLength(3);
  });

  test('todo lo pendiente de una actividad, sin tocar otras', async () => {
    const { db, diario, trabajadores } = await escenario();
    const a = await actividad(db, diario, trabajadores.slice(0, 3));
    await actividad(db, diario, [trabajadores[0]]);
    expect(await pagarPendientesDeActividad(db, a.id, HOY)).toEqual({ pagos: 3, total: 6000 });
    expect(await totalAdeudado(db)).toBe(2000);
  });

  test('sin pendientes no registra nada', async () => {
    const { db, trabajadores } = await escenario();
    expect(await pagarPendientesDeTrabajador(db, trabajadores[0], HOY)).toEqual({ pagos: 0, total: 0 });
  });
});

describe('RF-08: editar y eliminar jornales con pagos', () => {
  test('editar recalcula el monto pero no lo deja por debajo de lo pagado', async () => {
    const { db, diario, trabajadores } = await escenario();
    const { jornales } = await actividad(db, diario, [trabajadores[0]]);
    const id = jornales[0].id;
    await registrarPago(db, { jornalId: id, monto: 1500, fecha: HOY });

    await editarJornal(db, id, { cantidad: 100, tarifa: 2500 });
    expect(await estado(db, id)).toEqual({ saldo: 1000, estado: 'parcial' });

    await expect(editarJornal(db, id, { cantidad: 50, tarifa: 2000 })).rejects.toThrow(MontoMenorQuePagado);
    expect((await obtenerJornal(db, id))?.monto).toBe(2500);
  });

  test('eliminar un jornal elimina también sus pagos', async () => {
    const { db, diario, trabajadores } = await escenario();
    const { jornales } = await actividad(db, diario, [trabajadores[0], trabajadores[1]]);
    await registrarPago(db, { jornalId: jornales[0].id, monto: 1000, fecha: HOY });
    await registrarPago(db, { jornalId: jornales[1].id, monto: 1000, fecha: HOY });
    await eliminarJornal(db, jornales[0].id);
    expect(await contar(db, 'jornal')).toBe(1);
    expect(await contar(db, 'pago')).toBe(1);
  });
});
