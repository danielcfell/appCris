/**
 * Filtro de cultivo: `undefined` = todos, `null` = sin cultivo, número = id del cultivo (RF-28).
 */
export type FiltroCultivo = number | null | undefined;

export const FILTRO_TODOS = 'todos';
export const FILTRO_SIN_CULTIVO = 'sin';

export function serializarFiltroCultivo(filtro: FiltroCultivo): string {
  if (filtro === undefined) return FILTRO_TODOS;
  if (filtro === null) return FILTRO_SIN_CULTIVO;
  return String(filtro);
}

export function parsearFiltroCultivo(valor: string | null | undefined): FiltroCultivo {
  if (valor === null || valor === undefined || valor === FILTRO_TODOS) return undefined;
  if (valor === FILTRO_SIN_CULTIVO) return null;
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

/** Fragmento SQL `AND columna ...` y sus parámetros. */
export function clausulaCultivo(
  columna: string,
  filtro: FiltroCultivo,
): { sql: string; params: number[] } {
  if (filtro === undefined) return { sql: '', params: [] };
  if (filtro === null) return { sql: ` AND ${columna} IS NULL`, params: [] };
  return { sql: ` AND ${columna} = ?`, params: [filtro] };
}
