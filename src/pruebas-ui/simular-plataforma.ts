// Archivos, hoja de compartir y notificaciones son nativos y no existen en Node: se simulan en todas las
// pruebas de pantallas. Cada prueba puede cambiar el comportamiento con `jest.mocked(...)`.
import * as archivos from '../plataforma/archivos';
import * as notificaciones from '../plataforma/notificaciones';

jest.mock('../plataforma/archivos', () => ({
  compartirArchivo: jest.fn(),
  elegirArchivo: jest.fn(),
  guardarArchivoLocal: jest.fn(),
}));

jest.mock('../plataforma/notificaciones', () => ({
  configurarNotificaciones: jest.fn(),
  estadoPermiso: jest.fn(),
  pedirPermiso: jest.fn(),
  programarRecordatorios: jest.fn(),
  useAbrirDesdeNotificacion: jest.fn(),
}));

// Se fijan en cada prueba porque `jest.restoreAllMocks()` borra las implementaciones.
beforeEach(() => {
  jest.mocked(archivos.compartirArchivo).mockResolvedValue(undefined);
  jest.mocked(archivos.elegirArchivo).mockResolvedValue(null);
  jest.mocked(notificaciones.estadoPermiso).mockResolvedValue('concedido');
  jest.mocked(notificaciones.pedirPermiso).mockResolvedValue(true);
  jest.mocked(notificaciones.programarRecordatorios).mockResolvedValue(undefined);
});
