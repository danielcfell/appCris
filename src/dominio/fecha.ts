import { FechaInvalida } from './errores';

/** Fecha de calendario local en formato AAAA-MM-DD. */
export type Fecha = string;

const FORMATO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

export function validarFecha(texto: string): Fecha {
  const coincidencia = FORMATO_FECHA.exec(texto);
  if (!coincidencia) throw new FechaInvalida(texto);
  const [anio, mes, dia] = [Number(coincidencia[1]), Number(coincidencia[2]), Number(coincidencia[3])];
  const fecha = new Date(anio, mes - 1, dia);
  if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) {
    throw new FechaInvalida(texto);
  }
  return texto;
}

/** Fecha local (no UTC) de un instante, en formato AAAA-MM-DD. */
export function fechaLocal(instante: Date): Fecha {
  const mes = String(instante.getMonth() + 1).padStart(2, '0');
  const dia = String(instante.getDate()).padStart(2, '0');
  return `${instante.getFullYear()}-${mes}-${dia}`;
}
