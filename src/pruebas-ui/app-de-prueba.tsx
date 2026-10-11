import { renderRouter } from 'expo-router/testing-library';
import type { BaseDatosSqlite } from '../datos/base-datos';
import { escenario } from '../casos-uso/datos-de-prueba';

// Cargar todas las rutas la primera vez tarda varios segundos.
jest.setTimeout(60_000);

/**
 * Las pruebas de pantallas reemplazan `abrirBaseDatos` del celular por una base en memoria.
 * Cada archivo de prueba debe declarar:
 *   jest.mock('../datos/adaptador-expo', () => ({ abrirBaseDatos: jest.fn() }));
 */
export async function abrirApp(ruta = '/', datos?: Awaited<ReturnType<typeof escenario>>) {
  const e = datos ?? (await escenario());
  const { abrirBaseDatos } = jest.requireMock('../datos/adaptador-expo') as {
    abrirBaseDatos: jest.Mock<Promise<BaseDatosSqlite>>;
  };
  abrirBaseDatos.mockResolvedValue(e.db);
  // renderRouter resuelve la carpeta desde la raíz del proyecto, no desde este archivo.
  // Con RNTL 14 `render` devuelve una promesa y expo-router le agrega getPathname() y demás:
  // se guarda la promesa y se espera aparte para no perder esos métodos.
  const app = renderRouter('src/app', { initialUrl: ruta });
  await app;
  return { ...e, app };
}
