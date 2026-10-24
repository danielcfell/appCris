import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Alert } from 'react-native';
import { generarRespaldo } from '../casos-uso/respaldo';
import { leerConfig } from '../datos/config';
import { contar } from '../casos-uso/datos-de-prueba';
import { compartirArchivo, elegirArchivo, guardarArchivoLocal } from '../plataforma/archivos';
import { estadoPermiso, pedirPermiso, programarRecordatorios } from '../plataforma/notificaciones';
import { abrirApp, conActividad } from './app-de-prueba';

jest.mock('../datos/adaptador-expo', () => ({ abrirBaseDatos: jest.fn() }));

afterEach(() => jest.restoreAllMocks());

/** Responde los diálogos en orden: `true` elige el segundo botón (aceptar), `false` el primero. */
function responderDialogos(...respuestas: boolean[]) {
  const titulos: string[] = [];
  jest.spyOn(Alert, 'alert').mockImplementation((titulo, _m, botones) => {
    titulos.push(titulo);
    botones?.[respuestas.shift() ? 1 : 0]?.onPress?.();
  });
  return titulos;
}

test('RF-22 / RF-25: guardar respaldo comparte el archivo y, al confirmar, muestra la fecha', async () => {
  const { db } = await abrirApp('/respaldo');
  expect(await screen.findByText('Nunca')).toBeTruthy();
  const titulos = responderDialogos(true);

  await fireEvent.press(screen.getByLabelText('Guardar respaldo ahora'));

  expect(await screen.findByText('(hoy)')).toBeTruthy();
  expect(titulos).toEqual(['¿Guardaste el respaldo?']);
  const [nombre, contenido] = jest.mocked(compartirArchivo).mock.calls[0];
  expect(nombre).toMatch(/^jornales-respaldo-\d{4}-\d{2}-\d{2}\.json$/);
  expect(JSON.parse(contenido).tablas.trabajador).toHaveLength(5);
  expect(await leerConfig(db, 'ultimo_respaldo_en')).not.toBeNull();
  // RF-24: al guardar se reprograman los 31 recordatorios desde hoy + 30 días.
  expect(jest.mocked(programarRecordatorios).mock.calls.at(-1)?.[0]).toHaveLength(31);
  expect(screen.getByText('Listo. Te recordaremos el próximo respaldo en 30 días.')).toBeTruthy();
});

test('si responde que no lo guardó, no cambia la fecha del último respaldo', async () => {
  const { db } = await abrirApp('/respaldo');
  responderDialogos(false);
  await fireEvent.press(await screen.findByLabelText('Guardar respaldo ahora'));
  await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
  expect(compartirArchivo).toHaveBeenCalled();
  expect(await leerConfig(db, 'ultimo_respaldo_en')).toBeNull();
  expect(screen.getByText('Nunca')).toBeTruthy();
});

test('RF-24: la primera vez explica y pide el permiso de notificaciones', async () => {
  jest.mocked(estadoPermiso).mockResolvedValueOnce('preguntar');
  await abrirApp('/respaldo');
  const titulos = responderDialogos(true, true);
  await fireEvent.press(await screen.findByLabelText('Guardar respaldo ahora'));
  await waitFor(() => expect(pedirPermiso).toHaveBeenCalledTimes(1));
  expect(titulos).toEqual(['¿Guardaste el respaldo?', 'Recordatorio mensual']);
});

test('RF-23: restaurar muestra el resumen, guarda una copia de lo actual y reemplaza los datos', async () => {
  const otro = await conActividad();
  jest.mocked(elegirArchivo).mockResolvedValueOnce(JSON.stringify(await generarRespaldo(otro.db, new Date(2026, 9, 3))));
  const { db } = await abrirApp('/respaldo');
  const mensajes: string[] = [];
  jest.spyOn(Alert, 'alert').mockImplementation((_t, mensaje, botones) => {
    mensajes.push(mensaje ?? '');
    botones?.[1]?.onPress?.();
  });

  await fireEvent.press(await screen.findByLabelText('Restaurar desde archivo'));

  expect(await screen.findByText('Datos restaurados.')).toBeTruthy();
  expect(mensajes[0]).toContain('5 trabajadores, 1 actividad, 2 jornales, 0 pagos y 0 gastos. Respaldo del 3 de octubre de 2026.');
  expect(mensajes[0]).toContain('reemplaza todos los datos');
  expect(guardarArchivoLocal).toHaveBeenCalledWith('copia-antes-de-restaurar.json', expect.any(String));
  expect(await contar(db, 'jornal')).toBe(2);
});

test('un archivo que no es respaldo muestra el error y no pregunta nada', async () => {
  jest.mocked(elegirArchivo).mockResolvedValueOnce('{"hola": 1}');
  const { db } = await abrirApp('/respaldo');
  const alerta = jest.spyOn(Alert, 'alert');
  await fireEvent.press(await screen.findByLabelText('Restaurar desde archivo'));
  expect(await screen.findByText('El archivo no es un respaldo de esta app.')).toBeTruthy();
  expect(alerta).not.toHaveBeenCalled();
  expect(await contar(db, 'trabajador')).toBe(5);
});

test('RF-24: al abrir la app se guarda la primera apertura y se programan los recordatorios', async () => {
  const { db } = await abrirApp('/');
  await waitFor(() => expect(programarRecordatorios).toHaveBeenCalled());
  expect(await leerConfig(db, 'instalado_en')).not.toBeNull();
  expect(jest.mocked(programarRecordatorios).mock.calls[0][1]).toBe('/respaldo');
});
