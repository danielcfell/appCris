import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Alert } from 'react-native';
import { listarTiposTarea } from '../datos/tipos-tarea';
import { listarTrabajadores } from '../datos/trabajadores';
import { abrirApp } from './app-de-prueba';

jest.mock('../datos/adaptador-expo', () => ({ abrirBaseDatos: jest.fn() }));

afterEach(() => jest.restoreAllMocks());

test('RF-01 / RF-19: crear un trabajador (el tractor es uno más)', async () => {
  const { db, app } = await abrirApp('/trabajadores/nuevo');
  await fireEvent.changeText(await screen.findByLabelText('Nombre'), 'Tractor Don Luis');
  await fireEvent.press(screen.getByLabelText('Guardar'));
  await waitFor(() => expect(app.getPathname()).toBe('/trabajadores'));
  expect((await listarTrabajadores(db)).map((t) => t.nombre)).toContain('Tractor Don Luis');
});

test('RF-02: desactivar pide confirmación y oculta al trabajador de los activos', async () => {
  const { db, app } = await abrirApp('/trabajadores');
  // En el diálogo se elige "Desactivar" (el segundo botón).
  const alerta = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, botones) => botones?.[1]?.onPress?.());
  await fireEvent.press(await screen.findByLabelText('Juan'));
  await fireEvent.press(await screen.findByLabelText('Desactivar'));
  await waitFor(() => expect(app.getPathname()).toBe('/trabajadores'));
  expect(alerta).toHaveBeenCalledTimes(1);
  expect((await listarTrabajadores(db)).map((t) => t.nombre)).not.toContain('Juan');
  expect((await listarTrabajadores(db, { incluirInactivos: true })).map((t) => t.nombre)).toContain('Juan');
});

test('RF-03: crear tipo de tarea por hora con tarifa en coma decimal', async () => {
  const { db, app } = await abrirApp('/tipos-tarea/nuevo');
  await fireEvent.changeText(await screen.findByLabelText('Nombre'), 'Fumigación');
  await fireEvent.press(screen.getByText('hora'));
  await fireEvent.changeText(screen.getByLabelText('Tarifa sugerida por hora'), '12,50');
  await fireEvent.press(screen.getByLabelText('Guardar'));
  await waitFor(() => expect(app.getPathname()).toBe('/tipos-tarea'));
  expect((await listarTiposTarea(db)).find((t) => t.nombre === 'Fumigación')).toMatchObject({
    unidad: 'hora',
    tarifaSugerida: 1250,
  });
});

test('tarifa inválida muestra el error y no guarda', async () => {
  const { db } = await abrirApp('/tipos-tarea/nuevo');
  await fireEvent.changeText(await screen.findByLabelText('Nombre'), 'Deshierbe');
  await fireEvent.changeText(screen.getByLabelText('Tarifa sugerida por día'), '20,505');
  await fireEvent.press(screen.getByLabelText('Guardar'));
  expect(await screen.findByText('"20,505" no es un monto válido.')).toBeTruthy();
  expect((await listarTiposTarea(db)).map((t) => t.nombre)).not.toContain('Deshierbe');
});
