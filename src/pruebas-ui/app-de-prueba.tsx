import { act, renderRouter } from 'expo-router/testing-library';
import { crearActividadConJornales } from '../casos-uso/actividades';
import { escenario } from '../casos-uso/datos-de-prueba';
import type { BaseDatosSqlite } from '../datos/base-datos';
import { listarJornalesDeActividad } from '../datos/jornales';

// Cargar todas las rutas la primera vez tarda varios segundos.
jest.setTimeout(60_000);

// Una prueba puede terminar con consultas o navegaciones aún en curso (por ejemplo, la re-consulta
// después de guardar). Se dejan terminar para que no caigan en la prueba siguiente. La base en memoria
// responde con promesas ya resueltas, así que basta con vaciar las microtareas (setTimeout no sirve:
// renderRouter activa temporizadores falsos).
async function asentar() {
  await act(async () => {
    for (let i = 0; i < 50; i++) await Promise.resolve();
  });
}

afterEach(asentar);

type Escenario = Awaited<ReturnType<typeof escenario>>;

/**
 * Las pruebas de pantallas reemplazan `abrirBaseDatos` del celular por una base en memoria.
 * Cada archivo de prueba debe declarar:
 *   jest.mock('../datos/adaptador-expo', () => ({ abrirBaseDatos: jest.fn() }));
 */
export async function abrirApp<E extends Escenario>(ruta = '/', datos?: E) {
  const e = datos ?? ((await escenario()) as E);
  const { abrirBaseDatos } = jest.requireMock('../datos/adaptador-expo') as {
    abrirBaseDatos: jest.Mock<Promise<BaseDatosSqlite>>;
  };
  abrirBaseDatos.mockResolvedValue(e.db);
  // renderRouter resuelve la carpeta desde la raíz del proyecto, no desde este archivo.
  // Con RNTL 14 `render` devuelve una promesa y expo-router le agrega getPathname() y demás:
  // se guarda la promesa y se espera aparte para no perder esos métodos.
  const app = renderRouter('src/app', { initialUrl: ruta });
  await app;
  await asentar();
  return { ...e, app };
}

/** Escenario con la actividad "Fumigación lote norte" del 08/10: Juan y María, 1 día × $20. */
export async function conActividad() {
  const e = await escenario();
  const actividadId = await crearActividadConJornales(e.db, {
    fecha: '2026-10-08',
    descripcion: 'Fumigación lote norte',
    tipoTareaId: e.diario,
    cantidadComun: 100,
    tarifaComun: 2000,
    trabajadores: [{ trabajadorId: e.trabajadores[0] }, { trabajadorId: e.trabajadores[1] }],
  });
  const jornales = await listarJornalesDeActividad(e.db, actividadId);
  return { ...e, actividadId, jornales };
}
