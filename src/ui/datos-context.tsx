import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { guardarFiltroCultivo, leerFiltroCultivo } from '../casos-uso/cultivos';
import type { BaseDatos } from '../datos/base-datos';
import type { FiltroCultivo } from '../datos/filtro-cultivo';
import { ErrorDominio } from '../dominio/errores';
import { fechaLocal, type Fecha } from '../dominio/fecha';

interface ValorDatos {
  db: BaseDatos;
  /** Sube cada vez que un caso de uso confirma cambios; las pantallas vuelven a consultar (RF-15). */
  version: number;
  avisarCambio: () => void;
  /** Cultivo que se está viendo: `undefined` = todos, `null` = sin cultivo (RF-28). Se recuerda entre aperturas. */
  filtroCultivo: FiltroCultivo;
  cambiarFiltroCultivo: (filtro: FiltroCultivo) => void;
}

const DatosContext = createContext<ValorDatos | null>(null);

export function DatosProvider({ db, children }: { db: BaseDatos; children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const [filtroCultivo, setFiltroCultivo] = useState<FiltroCultivo>(undefined);
  const avisarCambio = useCallback(() => setVersion((v) => v + 1), []);

  // El último filtro elegido se recupera al abrir la app (RF-28).
  useEffect(() => {
    let vigente = true;
    leerFiltroCultivo(db).then(
      (filtro) => vigente && setFiltroCultivo(filtro),
      (e: unknown) => console.error(e),
    );
    return () => {
      vigente = false;
    };
  }, [db]);

  const cambiarFiltroCultivo = useCallback(
    (filtro: FiltroCultivo) => {
      setFiltroCultivo(filtro);
      guardarFiltroCultivo(db, filtro).catch((e: unknown) => console.error(e));
    },
    [db],
  );

  const valor = useMemo(
    () => ({ db, version, avisarCambio, filtroCultivo, cambiarFiltroCultivo }),
    [db, version, avisarCambio, filtroCultivo, cambiarFiltroCultivo],
  );
  return <DatosContext.Provider value={valor}>{children}</DatosContext.Provider>;
}

export function useDatos(): ValorDatos {
  const valor = useContext(DatosContext);
  if (!valor) throw new Error('useDatos debe usarse dentro de DatosProvider');
  return valor;
}

/** Mensaje para el usuario: el de un error de dominio, o uno genérico. */
export function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorDominio) return error.message;
  console.error(error);
  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}

export interface EstadoConsulta<T> {
  datos: T | undefined;
  error: string | null;
}

/** Ejecuta una consulta y la repite cuando cambian `deps` o cuando se confirma un cambio. */
export function useConsulta<T>(consulta: (db: BaseDatos) => Promise<T>, deps: readonly unknown[]): EstadoConsulta<T> {
  const { db, version } = useDatos();
  const [estado, setEstado] = useState<EstadoConsulta<T>>({ datos: undefined, error: null });
  useEffect(() => {
    let vigente = true;
    consulta(db).then(
      (datos) => vigente && setEstado({ datos, error: null }),
      (error: unknown) => vigente && setEstado({ datos: undefined, error: mensajeDeError(error) }),
    );
    return () => {
      vigente = false;
    };
    // `consulta` cambia en cada render; lo que importa son sus dependencias.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, version, ...deps]);
  return estado;
}

/**
 * Ejecuta un caso de uso. Si funciona avisa del cambio y devuelve `{ valor }`; si falla guarda
 * el mensaje en `error` y devuelve `null`.
 */
export function useAccion() {
  const { db, avisarCambio } = useDatos();
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const ejecutar = useCallback(
    async <T,>(accion: (db: BaseDatos) => Promise<T>): Promise<{ valor: T } | null> => {
      setError(null);
      setOcupado(true);
      try {
        const valor = await accion(db);
        avisarCambio();
        return { valor };
      } catch (e) {
        setError(mensajeDeError(e));
        return null;
      } finally {
        setOcupado(false);
      }
    },
    [db, avisarCambio],
  );

  const limpiarError = useCallback(() => setError(null), []);
  return { ejecutar, error, ocupado, limpiarError };
}

export function hoy(): Fecha {
  return fechaLocal(new Date());
}
