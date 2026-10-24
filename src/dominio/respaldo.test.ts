import { RespaldoInvalido } from './errores';
import {
  describirUltimoRespaldo,
  instantesRecordatorio,
  nombreArchivoRespaldo,
  NOMBRES_TABLAS,
  resumenRespaldo,
  validarRespaldo,
  type Respaldo,
  type TablasRespaldo,
} from './respaldo';

function respaldoVacio(): Respaldo {
  const tablas = Object.fromEntries(NOMBRES_TABLAS.map((t) => [t, []])) as unknown as TablasRespaldo;
  return {
    formato: 'appcris-respaldo',
    version_formato: 1,
    version_esquema: 1,
    creado_en: new Date(2026, 9, 3, 18, 30).toISOString(),
    tablas,
  };
}

const conTrabajador = (cambios: Record<string, unknown> = {}) => {
  const r = respaldoVacio();
  return {
    ...r,
    tablas: { ...r.tablas, trabajador: [{ id: 1, nombre: 'Juan', telefono: null, activo: 1, creado_en: 'x', ...cambios }] },
  };
};

const texto = (v: unknown) => JSON.stringify(v);

describe('RF-23: validar el archivo de respaldo', () => {
  test('acepta un respaldo bien formado', () => {
    const r = validarRespaldo(texto(conTrabajador()), 1);
    expect(r.tablas.trabajador).toEqual([{ id: 1, nombre: 'Juan', telefono: null, activo: 1, creado_en: 'x' }]);
  });

  test.each([
    ['no es JSON', 'hola'],
    ['otro formato', texto({ ...respaldoVacio(), formato: 'otra-app' })],
    ['falta una tabla', texto({ ...respaldoVacio(), tablas: { trabajador: [] } })],
    ['una tabla no es lista', texto({ ...respaldoVacio(), tablas: { ...respaldoVacio().tablas, pago: {} } })],
    ['falta una columna', texto(conTrabajador({ telefono: undefined }))],
    ['columna de más', texto(conTrabajador({ extra: 1 }))],
    ['id no entero', texto(conTrabajador({ id: 1.5 }))],
    ['valor no permitido', texto(conTrabajador({ nombre: { a: 1 } }))],
    ['fecha de creación inválida', texto({ ...respaldoVacio(), creado_en: 'ayer' })],
  ])('rechaza: %s', (_caso, contenido) => {
    expect(() => validarRespaldo(contenido, 1)).toThrow(RespaldoInvalido);
  });

  test('rechaza con un mensaje claro un respaldo de una versión más nueva', () => {
    expect(() => validarRespaldo(texto({ ...respaldoVacio(), version_esquema: 2 }), 1)).toThrow(/versión más nueva/);
    expect(() => validarRespaldo(texto({ ...respaldoVacio(), version_formato: 2 }), 1)).toThrow(/versión más nueva/);
  });
});

describe('textos del respaldo', () => {
  test('resumen para confirmar la restauración', () => {
    expect(resumenRespaldo(conTrabajador() as Respaldo)).toBe(
      '1 trabajador, 0 actividades, 0 jornales, 0 pagos y 0 gastos. Respaldo del 3 de octubre de 2026.',
    );
  });

  test('nombre del archivo con la fecha local', () => {
    expect(nombreArchivoRespaldo(new Date(2026, 9, 3, 23, 50))).toBe('jornales-respaldo-2026-10-03.json');
  });

  test('RF-25: fecha del último respaldo y hace cuánto fue', () => {
    const ultimo = new Date(2026, 8, 3, 10).toISOString();
    expect(describirUltimoRespaldo(ultimo, new Date(2026, 9, 10, 8))).toEqual({
      fecha: '3 de septiembre de 2026',
      hace: 'hace 37 días',
    });
    expect(describirUltimoRespaldo(ultimo, new Date(2026, 8, 3, 20)).hace).toBe('hoy');
    expect(describirUltimoRespaldo(ultimo, new Date(2026, 8, 4, 7)).hace).toBe('ayer');
  });
});

describe('RF-24: recordatorio de respaldo', () => {
  test('un recordatorio diario a las 9:00 desde el día 30 después del último respaldo', () => {
    const instantes = instantesRecordatorio(new Date(2026, 9, 1, 15).toISOString(), new Date(2026, 9, 2, 10));
    expect(instantes).toHaveLength(31);
    expect(instantes[0]).toEqual(new Date(2026, 9, 31, 9));
    expect(instantes[1]).toEqual(new Date(2026, 10, 1, 9));
    expect(instantes[30]).toEqual(new Date(2026, 10, 30, 9));
  });

  test('si ya pasaron los 30 días, empieza hoy (o mañana si ya pasaron las 9:00) y se sigue repitiendo', () => {
    const desde = new Date(2026, 6, 1).toISOString();
    expect(instantesRecordatorio(desde, new Date(2026, 9, 10, 7))[0]).toEqual(new Date(2026, 9, 10, 9));
    const tarde = instantesRecordatorio(desde, new Date(2026, 9, 10, 15));
    expect(tarde[0]).toEqual(new Date(2026, 9, 11, 9));
    expect(tarde).toHaveLength(30);
  });
});
