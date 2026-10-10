import { CantidadInvalida, MontoInvalido } from './errores';

/** Importe en centavos de dólar. Siempre entero, nunca decimal (RNF-02). */
export type Centavos = number;

/** Cantidad de unidades en centésimas: 1 día = 100, 1,5 horas = 150. */
export type Centesimas = number;

const NUMERO_DECIMAL = /^(\d+)(?:[.,](\d{1,2}))?$/;

/** Convierte texto como "20", "20,5" o "20.50" en un entero en centésimas. */
function parsearCentesimas(texto: string): number | null {
  const coincidencia = NUMERO_DECIMAL.exec(texto.trim());
  if (!coincidencia) return null;
  const enteros = Number(coincidencia[1]);
  const decimales = Number((coincidencia[2] ?? '').padEnd(2, '0'));
  const valor = enteros * 100 + decimales;
  return Number.isSafeInteger(valor) ? valor : null;
}

export function parsearMonto(texto: string): Centavos {
  const valor = parsearCentesimas(texto);
  if (valor === null) throw new MontoInvalido(`"${texto}" no es un monto válido.`);
  return valor;
}

export function parsearCantidad(texto: string): Centesimas {
  const valor = parsearCentesimas(texto);
  if (valor === null || valor === 0) throw new CantidadInvalida(`"${texto}" no es una cantidad válida.`);
  return valor;
}

export function esCentavosValidos(valor: number): boolean {
  return Number.isSafeInteger(valor) && valor >= 0;
}

/** Separa en miles con punto y usa coma decimal: 123450 → "1.234,50". */
function formatearCentesimas(valor: number, decimalesFijos: boolean): string {
  const enteros = Math.floor(valor / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimales = (valor % 100).toString().padStart(2, '0');
  if (!decimalesFijos && decimales === '00') return enteros;
  if (!decimalesFijos && decimales.endsWith('0')) return `${enteros},${decimales[0]}`;
  return `${enteros},${decimales}`;
}

export function formatearMonto(centavos: Centavos): string {
  if (!esCentavosValidos(centavos)) throw new MontoInvalido();
  return `$${formatearCentesimas(centavos, true)}`;
}

export function formatearCantidad(centesimas: Centesimas): string {
  if (!Number.isSafeInteger(centesimas) || centesimas <= 0) throw new CantidadInvalida();
  return formatearCentesimas(centesimas, false);
}
