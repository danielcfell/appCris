import { fechaLocal, validarFecha, type Fecha } from './fecha';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function partes(fecha: Fecha): [anio: number, mes: number, dia: number] {
  validarFecha(fecha);
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return [anio, mes, dia];
}

/** Mediodía local: sumar días nunca cruza de fecha por un cambio de horario. */
export function aDate(fecha: Fecha): Date {
  const [anio, mes, dia] = partes(fecha);
  return new Date(anio, mes - 1, dia, 12);
}

export function sumarDias(fecha: Fecha, dias: number): Fecha {
  const d = aDate(fecha);
  d.setDate(d.getDate() + dias);
  return fechaLocal(d);
}

/** Días de `desde` a `hasta`; 0 si son la misma fecha. */
export function diasEntre(desde: Fecha, hasta: Fecha): number {
  return Math.round((aDate(hasta).getTime() - aDate(desde).getTime()) / 86_400_000);
}

const dosDigitos = (n: number) => String(n).padStart(2, '0');

/** "2026-10-08" → "08/10" */
export function formatearFechaCorta(fecha: Fecha): string {
  const [, mes, dia] = partes(fecha);
  return `${dosDigitos(dia)}/${dosDigitos(mes)}`;
}

/** "2026-10-08" → "08/10/2026" */
export function formatearFecha(fecha: Fecha): string {
  const [anio] = partes(fecha);
  return `${formatearFechaCorta(fecha)}/${anio}`;
}

/** "2026-10-08" → "8 de octubre de 2026" */
export function formatearFechaLarga(fecha: Fecha): string {
  const [anio, mes, dia] = partes(fecha);
  return `${dia} de ${MESES[mes - 1]} de ${anio}`;
}

/** Texto de un campo de fecha: "Hoy, 10/10/2026", "Ayer, 09/10/2026" u "08/10/2026". */
export function describirFecha(fecha: Fecha, hoy: Fecha): string {
  const diferencia = diasEntre(fecha, hoy);
  if (diferencia === 0) return `Hoy, ${formatearFecha(fecha)}`;
  if (diferencia === 1) return `Ayer, ${formatearFecha(fecha)}`;
  return formatearFecha(fecha);
}

export type TipoPeriodo = 'semana' | 'mes' | 'rango';

export interface Periodo {
  tipo: TipoPeriodo;
  desde: Fecha;
  hasta: Fecha;
}

export function periodoMes(fecha: Fecha): Periodo {
  const [anio, mes] = partes(fecha);
  const ultimoDia = new Date(anio, mes, 0).getDate();
  return { tipo: 'mes', desde: `${anio}-${dosDigitos(mes)}-01`, hasta: `${anio}-${dosDigitos(mes)}-${dosDigitos(ultimoDia)}` };
}

/** Semana de lunes a domingo que contiene la fecha. */
export function periodoSemana(fecha: Fecha): Periodo {
  const diaSemana = (aDate(fecha).getDay() + 6) % 7; // lunes = 0
  const desde = sumarDias(fecha, -diaSemana);
  return { tipo: 'semana', desde, hasta: sumarDias(desde, 6) };
}

export function periodoRango(desde: Fecha, hasta: Fecha): Periodo {
  validarFecha(desde);
  validarFecha(hasta);
  return desde <= hasta ? { tipo: 'rango', desde, hasta } : { tipo: 'rango', desde: hasta, hasta: desde };
}

/** Período anterior (pasos < 0) o siguiente (pasos > 0). Un rango se desplaza su propia duración. */
export function moverPeriodo(periodo: Periodo, pasos: number): Periodo {
  switch (periodo.tipo) {
    case 'semana':
      return periodoSemana(sumarDias(periodo.desde, 7 * pasos));
    case 'mes': {
      const [anio, mes] = partes(periodo.desde);
      const destino = new Date(anio, mes - 1 + pasos, 1, 12);
      return periodoMes(fechaLocal(destino));
    }
    case 'rango': {
      const largo = diasEntre(periodo.desde, periodo.hasta) + 1;
      return periodoRango(sumarDias(periodo.desde, largo * pasos), sumarDias(periodo.hasta, largo * pasos));
    }
  }
}

const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/** "Octubre 2026", "5 al 11 de octubre de 2026" o "01/10/2026 al 15/10/2026". */
export function etiquetaPeriodo(periodo: Periodo): string {
  const [anioDesde, mesDesde, diaDesde] = partes(periodo.desde);
  const [anioHasta, mesHasta, diaHasta] = partes(periodo.hasta);
  switch (periodo.tipo) {
    case 'mes':
      return `${mayuscula(MESES[mesDesde - 1])} ${anioDesde}`;
    case 'semana':
      if (mesDesde === mesHasta) return `${diaDesde} al ${diaHasta} de ${MESES[mesHasta - 1]} de ${anioHasta}`;
      if (anioDesde === anioHasta) {
        return `${diaDesde} de ${MESES[mesDesde - 1]} al ${diaHasta} de ${MESES[mesHasta - 1]} de ${anioHasta}`;
      }
      return `${formatearFechaLarga(periodo.desde)} al ${formatearFechaLarga(periodo.hasta)}`;
    case 'rango':
      return `${formatearFecha(periodo.desde)} al ${formatearFecha(periodo.hasta)}`;
  }
}
