import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import { Alert } from 'react-native';
import { crearActividadConJornales } from '../casos-uso/actividades';
import { escenario } from '../casos-uso/datos-de-prueba';
import { listarJornalesDeActividad, obtenerJornal } from '../datos/jornales';
import { listarPagosDeTrabajador } from '../datos/pagos';
import { abrirApp } from './app-de-prueba';

jest.mock('../datos/adaptador-expo', () => ({ abrirBaseDatos: jest.fn() }));

afterEach(() => jest.restoreAllMocks());

/** Escenario con una actividad: Juan y María, 1 día × $20. */
async function conDeudas() {
  const e = await escenario();
  const actividadId = await crearActividadConJornales(e.db, {
    fecha: '2026-10-05',
    descripcion: 'Deshierbe',
    tipoTareaId: e.diario,
    cantidadComun: 100,
    tarifaComun: 2000,
    trabajadores: [{ trabajadorId: e.trabajadores[0] }, { trabajadorId: e.trabajadores[1], tarifa: 3000 }],
  });
  const juan = (await listarJornalesDeActividad(e.db, actividadId)).find((j) => j.trabajador === 'Juan')!;
  return { ...e, actividadId, jornalJuan: juan.id };
}

test('RF-05 / RF-06 / RNF-05: nueva actividad con 5 trabajadores y un ajuste individual', async () => {
  const { db, app } = await abrirApp('/');
  let toques = 0;
  const tocar = async (elemento: Parameters<typeof fireEvent.press>[0]) => {
    toques++;
    await fireEvent.press(elemento);
  };

  await tocar(await screen.findByLabelText('Nueva actividad'));
  // Paso 1: tipo de tarea (la fecha de hoy viene prellenada).
  await tocar(await screen.findByText('Diario $20,00/día'));
  await tocar(screen.getByLabelText('Siguiente'));
  // Paso 2: marcar a los 5; cantidad 1 y tarifa $20 vienen del tipo de tarea (RF-04).
  for (const nombre of ['Juan', 'María', 'Pedro', 'Rosa', 'Luis']) await tocar(await screen.findByLabelText(nombre));
  expect(screen.getByLabelText('Resumen de la selección')).toHaveTextContent('5 trabajadores · $100,00');
  await tocar(screen.getByLabelText('Siguiente'));
  // Paso 3: el caso común es guardar directo. Aquí además se le paga $25 a Pedro (RF-06).
  await fireEvent.press(await screen.findByLabelText('Ajustar Pedro'));
  await fireEvent.changeText(screen.getByLabelText('Tarifa de Pedro'), '25');
  await fireEvent.press(screen.getByLabelText('Listo'));
  expect(screen.getByText('$105,00')).toBeTruthy();
  await tocar(screen.getByLabelText('Guardar'));

  await waitFor(() => expect(app.getPathname()).toMatch(/^\/actividad\/\d+$/));
  const actividadId = Number(app.getPathname().split('/').pop());
  const jornales = await listarJornalesDeActividad(db, actividadId);
  expect(jornales.map((j) => [j.trabajador, j.monto])).toEqual([
    ['Juan', 2000],
    ['Luis', 2000],
    ['María', 2000],
    ['Pedro', 2500],
    ['Rosa', 2000],
  ]);
  // Flujo 4.1 del diseño: 10 toques sin contar la descripción.
  expect(toques).toBe(10);
  // El detalle muestra el costo total.
  expect(await screen.findByText('COSTO TOTAL')).toBeTruthy();
});

test('RF-13: "A quién debo" ordena por saldo y muestra el total (RN-03)', async () => {
  await abrirApp('/', await conDeudas());
  expect(await screen.findByLabelText('Total que debo: $50,00')).toBeTruthy();
  const filas = screen.getAllByLabelText(/le debo/);
  expect(filas.map((f) => f.props.accessibilityLabel)).toEqual(['María, le debo $30,00', 'Juan, le debo $20,00']);
});

test('RF-09 / RF-10 / RF-15: pago parcial cambia el estado a parcial y el saldo al instante', async () => {
  const datos = await conDeudas();
  const { db, app } = await abrirApp(`/trabajador/${datos.trabajadores[0]}`, datos);
  expect(await screen.findByText('PENDIENTE')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Pagar Deshierbe del 05/10'));
  // El monto viene prellenado con el saldo; se baja a un pago parcial.
  const monto = await screen.findByLabelText('Monto');
  expect(monto.props.value).toBe('20,00');
  await fireEvent.changeText(monto, '8,50');
  await fireEvent.press(screen.getByLabelText('Registrar pago'));

  await waitFor(() => expect(app.getPathname()).toBe(`/trabajador/${datos.trabajadores[0]}`));
  expect(await screen.findByText('PARCIAL')).toBeTruthy();
  expect(screen.getByText('Pagó $8,50 · falta $11,50')).toBeTruthy();
  expect(screen.getAllByText('$11,50').length).toBeGreaterThan(0);
  expect((await obtenerJornal(db, datos.jornalJuan))?.saldo).toBe(1150);
});

test('RF-12: un pago mayor al saldo muestra el error y no se guarda', async () => {
  const datos = await conDeudas();
  const { db } = await abrirApp(`/pago/${datos.jornalJuan}`, datos);
  await fireEvent.changeText(await screen.findByLabelText('Monto'), '25');
  expect(await screen.findByText('El pago no puede ser mayor a $20,00.')).toBeTruthy();
  const boton = screen.getByLabelText('Registrar pago');
  expect(boton).toBeDisabled();
  await fireEvent.press(boton);
  expect(await listarPagosDeTrabajador(db, datos.trabajadores[0])).toHaveLength(0);
});

test('RF-11: pagar todo a un trabajador pide confirmación y deja su saldo en cero', async () => {
  const datos = await conDeudas();
  const alerta = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, botones) => botones?.[1]?.onPress?.());
  await abrirApp(`/trabajador/${datos.trabajadores[1]}`, datos);
  await fireEvent.press(await screen.findByLabelText('Pagar todo $30,00'));
  expect(alerta.mock.calls[0][1]).toBe('Registrar pago de $30,00 a María (1 jornal).');
  const tarjeta = await screen.findByText('LE DEBO');
  await waitFor(() => expect(within(tarjeta.parent!).getByText('$0,00')).toBeTruthy());
  expect(await listarPagosDeTrabajador(datos.db, datos.trabajadores[1])).toHaveLength(1);
});
