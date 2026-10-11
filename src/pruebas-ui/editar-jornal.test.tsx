import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { registrarPago } from '../casos-uso/pagos';
import { listarJornalesDeActividad } from '../datos/jornales';
import { abrirApp, conActividad } from './app-de-prueba';

jest.mock('../datos/adaptador-expo', () => ({ abrirBaseDatos: jest.fn() }));

test('RF-08 / RN-02: editar un jornal por debajo de lo pagado muestra el error', async () => {
  const datos = await conActividad();
  const juan = datos.jornales.find((j) => j.trabajador === 'Juan')!;
  await registrarPago(datos.db, { jornalId: juan.id, monto: 1500, fecha: '2026-10-09' });
  await abrirApp(`/jornal/${juan.id}`, datos);
  await fireEvent.changeText(await screen.findByLabelText('Cantidad'), '0,5');
  expect(screen.getByText('$10,00')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Guardar'));
  expect(await screen.findByText('El monto no puede ser menor a lo ya pagado ($15,00).')).toBeTruthy();
});

test('RF-06: ajustar la tarifa de un jornal recalcula el monto', async () => {
  const datos = await conActividad();
  const maria = datos.jornales.find((j) => j.trabajador === 'María')!;
  const { app } = await abrirApp(`/jornal/${maria.id}`, datos);
  await fireEvent.changeText(await screen.findByLabelText('Tarifa'), '25,50');
  await fireEvent.press(screen.getByLabelText('Guardar'));
  await waitFor(() => expect(app.getPathname()).toBe(`/actividad/${datos.actividadId}`));
  expect((await listarJornalesDeActividad(datos.db, datos.actividadId)).find((j) => j.id === maria.id)?.monto).toBe(2550);
});
