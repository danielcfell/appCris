import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Alert } from 'react-native';
import { registrarPago } from '../casos-uso/pagos';
import { obtenerActividad } from '../datos/actividades';
import { listarJornalesDeActividad } from '../datos/jornales';
import { abrirApp, conActividad } from './app-de-prueba';

jest.mock('../datos/adaptador-expo', () => ({ abrirBaseDatos: jest.fn() }));

afterEach(() => jest.restoreAllMocks());

test('RF-21: el detalle muestra costo, pagado y falta', async () => {
  const datos = await conActividad();
  await registrarPago(datos.db, { jornalId: datos.jornales[0].id, monto: 500, fecha: '2026-10-09' });
  await abrirApp(`/actividad/${datos.actividadId}`, datos);
  expect(await screen.findByText('Pagado $5,00 · Falta $35,00')).toBeTruthy();
  expect(screen.getAllByText('$40,00').length).toBeGreaterThan(0);
});

test('RF-08: eliminar un jornal con pagos avisa que se borran sus pagos', async () => {
  const datos = await conActividad();
  const juan = datos.jornales.find((j) => j.trabajador === 'Juan')!;
  await registrarPago(datos.db, { jornalId: juan.id, monto: 1000, fecha: '2026-10-09' });
  const mensajes: string[] = [];
  jest.spyOn(Alert, 'alert').mockImplementation((_t, mensaje, botones) => {
    mensajes.push(mensaje ?? '');
    botones?.find((b) => b.text === 'Eliminar')?.onPress?.();
  });
  await abrirApp(`/actividad/${datos.actividadId}`, datos);
  await fireEvent.press(await screen.findByLabelText('Más opciones de Juan'));
  await waitFor(async () => expect(await listarJornalesDeActividad(datos.db, datos.actividadId)).toHaveLength(1));
  expect(mensajes[1]).toBe('Este jornal tiene $10,00 pagados. Si lo eliminas se borran también sus pagos.');
});

test('una actividad vacía se puede eliminar', async () => {
  const datos = await conActividad();
  for (const j of datos.jornales) await datos.db.ejecutar('DELETE FROM jornal WHERE id = ?', [j.id]);
  jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, botones) => {
    botones?.find((b) => b.text === 'Eliminar')?.onPress?.();
  });
  const { app } = await abrirApp(`/actividad/${datos.actividadId}`, datos);
  await fireEvent.press(await screen.findByLabelText('Eliminar actividad'));
  await waitFor(() => expect(app.getPathname()).toBe('/actividades'));
  expect(await obtenerActividad(datos.db, datos.actividadId)).toBeNull();
});
