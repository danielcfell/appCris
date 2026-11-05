import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { DatosActividad } from '../casos-uso/actividades';
import type { Trabajador } from '../datos/trabajadores';
import { parsearCantidad, parsearMonto, type Centavos, type Centesimas } from '../dominio/dinero';
import type { Fecha } from '../dominio/fecha';
import { calcularMonto } from '../dominio/jornal';
import { hoy } from './datos-context';
import { leerCampo } from './formularios';

/** Cantidad o tarifa propias de un trabajador, distintas de las comunes (RF-06). */
export interface Ajuste {
  cantidad: string;
  tarifa: string;
}

/** Lo que el usuario lleva escrito en los 3 pasos de "Nueva actividad" (3.4). Los números van como texto. */
export interface Borrador {
  fecha: Fecha;
  tipoTareaId: number | null;
  /** Cultivo de la actividad; obligatorio si ya hay cultivos (RF-27). */
  cultivoId: number | null;
  descripcion: string;
  cantidadComun: string;
  tarifaComun: string;
  seleccionados: number[];
  ajustes: Record<number, Ajuste>;
}

export interface LineaBorrador {
  trabajadorId: number;
  nombre: string;
  cantidadTexto: string;
  tarifaTexto: string;
  ajustado: boolean;
  cantidad: Centesimas | null;
  tarifa: Centavos | null;
  monto: Centavos | null;
  error: string | null;
}

/** Calcula cada jornal del borrador con la misma fórmula del dominio (RF-07). */
export function lineasDelBorrador(borrador: Borrador, trabajadores: Trabajador[]): LineaBorrador[] {
  return trabajadores
    .filter((t) => borrador.seleccionados.includes(t.id))
    .map((t) => {
      const ajuste = borrador.ajustes[t.id];
      const cantidadTexto = ajuste?.cantidad ?? borrador.cantidadComun;
      const tarifaTexto = ajuste?.tarifa ?? borrador.tarifaComun;
      const base = { trabajadorId: t.id, nombre: t.nombre, cantidadTexto, tarifaTexto, ajustado: !!ajuste };
      const c = leerCampo(() => parsearCantidad(cantidadTexto));
      const ta = leerCampo(() => parsearMonto(tarifaTexto));
      const m = c.valor !== null && ta.valor !== null ? leerCampo(() => calcularMonto(c.valor!, ta.valor!)) : null;
      return {
        ...base,
        cantidad: c.valor,
        tarifa: ta.valor,
        monto: m?.valor ?? null,
        error: c.error ?? ta.error ?? m?.error ?? null,
      };
    });
}

export function totalDeLineas(lineas: LineaBorrador[]): Centavos | null {
  if (lineas.some((l) => l.monto === null)) return null;
  return lineas.reduce((suma, l) => suma + (l.monto ?? 0), 0);
}

/**
 * Datos para `crearActividadConJornales`. Solo los trabajadores ajustados llevan cantidad o tarifa propias;
 * el resto toma las comunes. Devuelve `null` si algo no es válido.
 */
export function datosDelBorrador(borrador: Borrador, lineas: LineaBorrador[]): DatosActividad | null {
  const cantidadComun = leerCampo(() => parsearCantidad(borrador.cantidadComun)).valor;
  const tarifaComun = leerCampo(() => parsearMonto(borrador.tarifaComun)).valor;
  if (borrador.tipoTareaId === null || cantidadComun === null || tarifaComun === null) return null;
  if (lineas.length === 0 || lineas.some((l) => l.monto === null)) return null;
  return {
    fecha: borrador.fecha,
    descripcion: borrador.descripcion,
    tipoTareaId: borrador.tipoTareaId,
    cultivoId: borrador.cultivoId,
    cantidadComun,
    tarifaComun,
    trabajadores: lineas.map((l) =>
      l.ajustado ? { trabajadorId: l.trabajadorId, cantidad: l.cantidad!, tarifa: l.tarifa! } : { trabajadorId: l.trabajadorId },
    ),
  };
}

export function borradorNuevo(): Borrador {
  return {
    fecha: hoy(),
    tipoTareaId: null,
    cultivoId: null,
    descripcion: '',
    cantidadComun: '1',
    tarifaComun: '',
    seleccionados: [],
    ajustes: {},
  };
}

interface ValorBorrador {
  borrador: Borrador;
  actualizar: (cambio: Partial<Borrador> | ((b: Borrador) => Partial<Borrador>)) => void;
}

const BorradorContext = createContext<ValorBorrador | null>(null);

export function BorradorActividadProvider({ children }: { children: ReactNode }) {
  const [borrador, setBorrador] = useState(borradorNuevo);
  const actualizar = useCallback<ValorBorrador['actualizar']>(
    (cambio) => setBorrador((b) => ({ ...b, ...(typeof cambio === 'function' ? cambio(b) : cambio) })),
    [],
  );
  const valor = useMemo(() => ({ borrador, actualizar }), [borrador, actualizar]);
  return <BorradorContext.Provider value={valor}>{children}</BorradorContext.Provider>;
}

export function useBorradorActividad(): ValorBorrador {
  const valor = useContext(BorradorContext);
  if (!valor) throw new Error('useBorradorActividad debe usarse dentro de BorradorActividadProvider');
  return valor;
}
