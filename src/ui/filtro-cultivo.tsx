import { useRouter } from 'expo-router';
import { hayRegistrosSinCultivo, listarCultivos, type Cultivo } from '../datos/cultivos';
import { parsearFiltroCultivo, serializarFiltroCultivo, type FiltroCultivo } from '../datos/filtro-cultivo';
import { Chips } from './chips';
import { useConsulta, useDatos } from './datos-context';

/**
 * Chips para ver "Todos", un cultivo o "Sin cultivo" (RF-28). La elección se recuerda y la comparten
 * "A quién debo", actividades, gastos y resumen. No aparece mientras no haya cultivos.
 */
export function FiltroDeCultivo() {
  const { filtroCultivo, cambiarFiltroCultivo } = useDatos();
  const { datos } = useConsulta(
    async (db) => ({
      cultivos: await listarCultivos(db, { incluirInactivos: true }),
      sinCultivo: await hayRegistrosSinCultivo(db),
    }),
    [],
  );
  if (!datos || datos.cultivos.length === 0) return null;

  // Los cultivos cerrados se siguen pudiendo consultar, al final y marcados.
  const ordenados = [...datos.cultivos.filter((c) => c.activo), ...datos.cultivos.filter((c) => !c.activo)];
  const opciones = [
    { clave: serializarFiltroCultivo(undefined), etiqueta: 'Todos' },
    ...ordenados.map((c) => ({
      clave: serializarFiltroCultivo(c.id),
      etiqueta: c.activo ? c.nombre : `${c.nombre} (cerrado)`,
    })),
    ...(datos.sinCultivo || filtroCultivo === null
      ? [{ clave: serializarFiltroCultivo(null), etiqueta: 'Sin cultivo' }]
      : []),
  ];
  return (
    <Chips
      opciones={opciones}
      seleccionada={serializarFiltroCultivo(filtroCultivo)}
      onSeleccionar={(clave) => cambiarFiltroCultivo(parsearFiltroCultivo(clave))}
    />
  );
}

/**
 * Cultivo con el que se prellena un alta (RF-28): el que se está viendo si está abierto o, si solo hay
 * un cultivo abierto, ese. Con varios y sin filtro, el usuario elige.
 */
export function cultivoInicial(cultivos: Cultivo[], filtro: FiltroCultivo): number | null {
  const abiertos = cultivos.filter((c) => c.activo);
  if (typeof filtro === 'number' && abiertos.some((c) => c.id === filtro)) return filtro;
  return abiertos.length === 1 ? abiertos[0].id : null;
}

/** Elegir el cultivo de un registro nuevo (RF-27). Ofrece los abiertos y, al editar, el que ya tenía. */
export function SelectorDeCultivo({
  cultivos,
  valor,
  onCambio,
  conservar,
}: {
  cultivos: Cultivo[];
  valor: number | null;
  onCambio: (id: number) => void;
  /** Cultivo que el registro ya tiene: se ofrece aunque esté cerrado. */
  conservar?: number | null;
}) {
  const router = useRouter();
  const ofrecidos = cultivos.filter((c) => c.activo || c.id === conservar);
  return (
    <Chips
      opciones={ofrecidos.map((c) => ({ clave: c.id, etiqueta: c.activo ? c.nombre : `${c.nombre} (cerrado)` }))}
      seleccionada={valor}
      onSeleccionar={onCambio}
      extra={{ etiqueta: '+ Otro', onPress: () => router.push('/cultivos/nuevo') }}
    />
  );
}
