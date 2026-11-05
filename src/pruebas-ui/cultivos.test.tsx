import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Alert } from 'react-native';
import { crearActividadConJornales } from '../casos-uso/actividades';
import { crearCultivo, guardarFiltroCultivo, leerFiltroCultivo } from '../casos-uso/cultivos';
import { escenario } from '../casos-uso/datos-de-prueba';
import { listarCultivos } from '../datos/cultivos';
import { saldoDeTrabajador } from '../datos/resumenes';
import { abrirApp } from './app-de-prueba';

jest.mock('../datos/adaptador-expo', () => ({ abrirBaseDatos: jest.fn() }));

afterEach(() => jest.restoreAllMocks());

/** Juan y María en papas ($20 c/u); María también en arveja ($20). */
async function conDosCultivos() {
  const e = await escenario();
  const papas = await crearCultivo(e.db, 'Papas');
  const arveja = await crearCultivo(e.db, 'Arveja');
  const actividad = (cultivoId: number, quienes: number[], fecha: string) =>
    crearActividadConJornales(e.db, {
      fecha,
      descripcion: 'Deshierbe',
      tipoTareaId: e.diario,
      cultivoId,
      cantidadComun: 100,
      tarifaComun: 2000,
      trabajadores: quienes.map((i) => ({ trabajadorId: e.trabajadores[i] })),
    });
  await actividad(papas, [0, 1], '2026-10-05');
  await actividad(arveja, [1], '2026-10-06');
  return { ...e, papas, arveja };
}

test('RF-26: crear un cultivo', async () => {
  const { db, app } = await abrirApp('/cultivos/nuevo');
  await fireEvent.changeText(await screen.findByLabelText('Nombre'), 'Papas 2026');
  await fireEvent.press(screen.getByLabelText('Guardar'));
  await waitFor(() => expect(app.getPathname()).toBe('/cultivos'));
  expect((await listarCultivos(db)).map((c) => c.nombre)).toEqual(['Papas 2026']);
});

test('RF-26 / RN-05: cerrar un cultivo pide confirmación y deja de ofrecerse, sin borrar su historial', async () => {
  const datos = await conDosCultivos();
  const { db, app } = await abrirApp('/cultivos', datos);
  // En el diálogo se elige "Cerrar cultivo" (el segundo botón).
  const alerta = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, botones) => botones?.[1]?.onPress?.());
  await fireEvent.press(await screen.findByLabelText('Papas'));
  await fireEvent.press(await screen.findByLabelText('Cerrar cultivo'));
  await waitFor(() => expect(app.getPathname()).toBe('/cultivos'));
  expect(alerta).toHaveBeenCalledTimes(1);
  expect((await listarCultivos(db)).map((c) => c.nombre)).toEqual(['Arveja']);
  expect(await listarCultivos(db, { incluirInactivos: true })).toHaveLength(2);
  expect(await saldoDeTrabajador(db, datos.trabajadores[0], datos.papas)).toBe(2000);
});

describe('RF-27: nueva actividad', () => {
  test('con varios cultivos hay que elegir uno antes de seguir', async () => {
    const datos = await conDosCultivos();
    await abrirApp('/actividad/nueva', datos);
    await fireEvent.press(await screen.findByText('Diario $20,00/día'));
    expect(screen.getByLabelText('Siguiente')).toBeDisabled();
    await fireEvent.press(screen.getByText('Papas'));
    expect(screen.getByLabelText('Siguiente')).not.toBeDisabled();
  });

  test('con un solo cultivo abierto viene elegido (RNF-05: sin toques de más)', async () => {
    const e = await escenario();
    await crearCultivo(e.db, 'Papas');
    await abrirApp('/actividad/nueva', e);
    expect(await screen.findByText('✓ Papas')).toBeTruthy();
    await fireEvent.press(screen.getByText('Diario $20,00/día'));
    expect(screen.getByLabelText('Siguiente')).not.toBeDisabled();
  });

  test('RF-28: viene elegido el cultivo que se estaba viendo', async () => {
    const datos = await conDosCultivos();
    await guardarFiltroCultivo(datos.db, datos.arveja);
    await abrirApp('/actividad/nueva', datos);
    expect(await screen.findByText('✓ Arveja')).toBeTruthy();
  });
});

describe('RF-28 / RF-29: "A quién debo" por cultivo', () => {
  test('cada cultivo muestra solo su total y sus deudas, y el filtro se recuerda', async () => {
    const datos = await conDosCultivos();
    await abrirApp('/', datos);
    expect(await screen.findByLabelText('Total que debo: $60,00')).toBeTruthy();

    await fireEvent.press(screen.getByText('Arveja'));
    expect(await screen.findByLabelText('Total que debo: $20,00')).toBeTruthy();
    expect(screen.getAllByLabelText(/le debo/).map((f) => f.props.accessibilityLabel)).toEqual(['María, le debo $20,00']);

    await fireEvent.press(screen.getByText('Todos'));
    expect(await screen.findByLabelText('Total que debo: $60,00')).toBeTruthy();
  });

  test('el filtro elegido queda guardado para la próxima vez', async () => {
    const datos = await conDosCultivos();
    await abrirApp('/', datos);
    expect(await screen.findByLabelText('Total que debo: $60,00')).toBeTruthy();
    await fireEvent.press(screen.getByText('Papas'));
    expect(await screen.findByLabelText('Total que debo: $40,00')).toBeTruthy();
    expect(await leerFiltroCultivo(datos.db)).toBe(datos.papas);
  });

  test('"Pagar todo" del trabajador cubre solo el cultivo que se está viendo', async () => {
    const datos = await conDosCultivos();
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, botones) => botones?.[1]?.onPress?.());
    await abrirApp('/', datos);
    expect(await screen.findByLabelText('Total que debo: $60,00')).toBeTruthy();
    await fireEvent.press(screen.getByText('Arveja'));
    await fireEvent.press(await screen.findByLabelText('María, le debo $20,00'));
    expect(await screen.findByText('LE DEBO · ARVEJA')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Pagar todo $20,00'));
    expect(alerta.mock.calls[0][1]).toBe('Registrar pago de $20,00 a María (1 jornal).');

    const maria = datos.trabajadores[1];
    await waitFor(async () => expect(await saldoDeTrabajador(datos.db, maria, datos.arveja)).toBe(0));
    expect(await saldoDeTrabajador(datos.db, maria, datos.papas)).toBe(2000);
  });
});
