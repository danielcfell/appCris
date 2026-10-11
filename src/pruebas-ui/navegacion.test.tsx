import { fireEvent, screen } from 'expo-router/testing-library';
import { abrirApp } from './app-de-prueba';

jest.mock('../datos/adaptador-expo', () => ({ abrirBaseDatos: jest.fn() }));

test('abre la app en "A quién debo" con las cinco pestañas', async () => {
  await abrirApp();
  expect(await screen.findByText('A quién debo')).toBeTruthy();
  for (const pestana of ['Debo', 'Actividades', 'Gastos', 'Resumen', 'Más']) {
    expect(screen.getAllByText(pestana).length).toBeGreaterThan(0);
  }
});

test('Más lleva a Respaldo', async () => {
  const { app } = await abrirApp('/mas');
  await fireEvent.press(await screen.findByLabelText('Respaldo'));
  expect(app.getPathname()).toBe('/respaldo');
});
