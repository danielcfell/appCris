import { DatoRequerido } from '../dominio/errores';

/** Marca de tiempo para las columnas `creado_en`. */
export function marcaTiempo(): string {
  return new Date().toISOString();
}

export function textoRequerido(valor: string, campo: string): string {
  const limpio = valor.trim();
  if (!limpio) throw new DatoRequerido(campo);
  return limpio;
}

export function textoOpcional(valor: string | null | undefined): string | null {
  const limpio = valor?.trim();
  return limpio ? limpio : null;
}
