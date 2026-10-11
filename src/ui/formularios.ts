import { router, type Href } from 'expo-router';
import { ErrorDominio } from '../dominio/errores';

/** Vuelve a la pantalla anterior; si se llegó directo (sin historial), va a `respaldo`. */
export function volver(respaldo: Href): void {
  if (router.canGoBack()) router.back();
  else router.replace(respaldo);
}

/** Ejecuta una conversión (parsear monto, cantidad...) y devuelve el valor o el mensaje de error. */
export function leerCampo<T>(convertir: () => T): { valor: T; error: null } | { valor: null; error: string } {
  try {
    return { valor: convertir(), error: null };
  } catch (e) {
    if (e instanceof ErrorDominio) return { valor: null, error: e.message };
    throw e;
  }
}

/** Parámetro `[id]` de una ruta de formulario: "nuevo" o un número. */
export function idDeRuta(param: string | string[] | undefined): number | null {
  const texto = Array.isArray(param) ? param[0] : param;
  if (!texto || texto === 'nuevo') return null;
  const id = Number(texto);
  return Number.isSafeInteger(id) ? id : null;
}
