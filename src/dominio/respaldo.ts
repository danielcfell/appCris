import { RespaldoInvalido } from './errores';
import { fechaLocal, type Fecha } from './fecha';
import { diasEntre, formatearFechaLarga, sumarDias } from './periodo';

export const FORMATO_RESPALDO = 'appcris-respaldo';
export const VERSION_FORMATO = 1;

/**
 * Columnas de cada tabla del respaldo, en orden de inserción: los padres antes que los hijos.
 * `config` no se respalda: guarda datos de este celular (último respaldo, instalación).
 */
export const TABLAS_RESPALDO = {
  trabajador: ['id', 'nombre', 'telefono', 'activo', 'creado_en'],
  tipo_tarea: ['id', 'nombre', 'unidad', 'tarifa_sugerida_centavos', 'activo'],
  categoria_gasto: ['id', 'nombre', 'activo'],
  actividad: ['id', 'fecha', 'descripcion', 'tipo_tarea_id', 'creado_en'],
  jornal: [
    'id',
    'actividad_id',
    'trabajador_id',
    'unidad',
    'cantidad_centesimas',
    'tarifa_centavos',
    'monto_centavos',
    'creado_en',
  ],
  pago: ['id', 'jornal_id', 'fecha', 'monto_centavos', 'creado_en'],
  gasto: ['id', 'fecha', 'monto_centavos', 'categoria_id', 'actividad_id', 'nota', 'creado_en'],
} as const satisfies Record<string, readonly string[]>;

export type TablaRespaldo = keyof typeof TABLAS_RESPALDO;
export const NOMBRES_TABLAS = Object.keys(TABLAS_RESPALDO) as TablaRespaldo[];

export type FilaRespaldo = Record<string, string | number | null>;
export type TablasRespaldo = Record<TablaRespaldo, FilaRespaldo[]>;

/** Archivo de respaldo (arquitectura §4). */
export interface Respaldo {
  formato: typeof FORMATO_RESPALDO;
  version_formato: number;
  version_esquema: number;
  /** Instante ISO-8601 en que se generó. */
  creado_en: string;
  tablas: TablasRespaldo;
}

const MENSAJE_VERSION_NUEVA = 'El respaldo es de una versión más nueva de la app. Actualiza la app para restaurarlo.';

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const esEnteroPositivo = (v: unknown): v is number => Number.isInteger(v) && (v as number) > 0;
const esValorSql = (v: unknown) => v === null || typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v));

function validarFila(tabla: TablaRespaldo, fila: unknown): FilaRespaldo {
  const columnas: readonly string[] = TABLAS_RESPALDO[tabla];
  if (!esObjeto(fila)) throw new RespaldoInvalido();
  const claves = Object.keys(fila);
  const completa = claves.length === columnas.length && columnas.every((c) => c in fila && esValorSql(fila[c]));
  if (!completa || !esEnteroPositivo(fila.id)) throw new RespaldoInvalido();
  return fila as FilaRespaldo;
}

/**
 * Lee el texto de un archivo y comprueba que sea un respaldo que esta app puede restaurar (RF-23).
 * Solo revisa la forma; las reglas de los datos (montos, saldos, referencias) las aplica la base al insertar.
 */
export function validarRespaldo(texto: string, versionEsquemaActual: number): Respaldo {
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    throw new RespaldoInvalido();
  }
  if (!esObjeto(datos) || datos.formato !== FORMATO_RESPALDO) throw new RespaldoInvalido();
  if (!esEnteroPositivo(datos.version_formato) || !esEnteroPositivo(datos.version_esquema)) {
    throw new RespaldoInvalido();
  }
  if (datos.version_formato > VERSION_FORMATO || datos.version_esquema > versionEsquemaActual) {
    throw new RespaldoInvalido(MENSAJE_VERSION_NUEVA);
  }
  // Con una sola versión del esquema no hay nada que convertir. Cuando exista la migración 2, un respaldo
  // anterior se restaura aplicándole las migraciones que le faltan (arquitectura §4).
  if (datos.version_esquema < versionEsquemaActual) throw new RespaldoInvalido();
  if (typeof datos.creado_en !== 'string' || Number.isNaN(Date.parse(datos.creado_en))) throw new RespaldoInvalido();

  const tablas = datos.tablas;
  if (!esObjeto(tablas)) throw new RespaldoInvalido();
  const validadas = {} as TablasRespaldo;
  for (const tabla of NOMBRES_TABLAS) {
    const filas = tablas[tabla];
    if (!Array.isArray(filas)) throw new RespaldoInvalido();
    validadas[tabla] = filas.map((f) => validarFila(tabla, f));
  }
  return {
    formato: FORMATO_RESPALDO,
    version_formato: datos.version_formato,
    version_esquema: datos.version_esquema,
    creado_en: datos.creado_en,
    tablas: validadas,
  };
}

const cantidad = (n: number, singular: string, plural: string) => `${n} ${n === 1 ? singular : plural}`;

/** "5 trabajadores, 3 actividades, 12 jornales, 4 pagos y 2 gastos. Respaldo del 3 de octubre de 2026." */
export function resumenRespaldo(respaldo: Respaldo): string {
  const t = respaldo.tablas;
  const partes = [
    cantidad(t.trabajador.length, 'trabajador', 'trabajadores'),
    cantidad(t.actividad.length, 'actividad', 'actividades'),
    cantidad(t.jornal.length, 'jornal', 'jornales'),
    cantidad(t.pago.length, 'pago', 'pagos'),
    cantidad(t.gasto.length, 'gasto', 'gastos'),
  ];
  const lista = `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
  return `${lista}. Respaldo del ${formatearFechaLarga(fechaLocal(new Date(respaldo.creado_en)))}.`;
}

export function nombreArchivoRespaldo(ahora: Date): string {
  return `jornales-respaldo-${fechaLocal(ahora)}.json`;
}

/** Fecha del último respaldo y hace cuánto fue: { fecha: "3 de septiembre de 2026", hace: "hace 37 días" } (RF-25). */
export function describirUltimoRespaldo(instante: string, ahora: Date): { fecha: string; hace: string } {
  const fecha: Fecha = fechaLocal(new Date(instante));
  const dias = diasEntre(fecha, fechaLocal(ahora));
  const hace = dias <= 0 ? 'hoy' : dias === 1 ? 'ayer' : `hace ${dias} días`;
  return { fecha: formatearFechaLarga(fecha), hace };
}

export const DIAS_SIN_RESPALDO = 30;
/** Cuántos recordatorios diarios quedan programados a la vez. */
export const RECORDATORIOS_PROGRAMADOS = 31;
export const HORA_RECORDATORIO = 9;

/**
 * Instantes del recordatorio de respaldo (RF-24): uno diario a las 9:00 desde el día 30 después de `desde`
 * (último respaldo o instalación). Si ya pasaron los 30 días, empieza hoy, así "se repite hasta que guarde":
 * cada vez que se abre la app la ventana se corre. Solo devuelve instantes futuros.
 */
export function instantesRecordatorio(desde: string, ahora: Date): Date[] {
  const primero = sumarDias(fechaLocal(new Date(desde)), DIAS_SIN_RESPALDO);
  const hoy = fechaLocal(ahora);
  const inicio = primero > hoy ? primero : hoy;
  const instantes: Date[] = [];
  for (let i = 0; i < RECORDATORIOS_PROGRAMADOS; i++) {
    const [anio, mes, dia] = sumarDias(inicio, i).split('-').map(Number);
    const instante = new Date(anio, mes - 1, dia, HORA_RECORDATORIO);
    if (instante > ahora) instantes.push(instante);
  }
  return instantes;
}
