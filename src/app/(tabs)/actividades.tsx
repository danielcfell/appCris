import { useRouter } from 'expo-router';
import { useState } from 'react';
import { listarActividades } from '../../datos/actividades';
import { formatearMonto } from '../../dominio/dinero';
import { formatearFechaCorta, periodoMes } from '../../dominio/periodo';
import {
  BotonFlotante,
  Cargando,
  Fila,
  FiltroDeCultivo,
  hoy,
  Pantalla,
  SelectorPeriodo,
  Texto,
  useConsulta,
  useDatos,
  Vacio,
} from '../../ui';

/** Actividades del mes, de la más reciente a la más antigua; todas o de un cultivo (3.5, RF-28). */
export default function Actividades() {
  const router = useRouter();
  const { filtroCultivo } = useDatos();
  const [periodo, setPeriodo] = useState(() => periodoMes(hoy()));
  const { datos, error } = useConsulta(
    (db) => listarActividades(db, periodo.desde, periodo.hasta, filtroCultivo),
    [periodo.desde, periodo.hasta, filtroCultivo],
  );

  return (
    <Pantalla
      flotante={<BotonFlotante accessibilityLabel="Nueva actividad" onPress={() => router.push('/actividad/nueva')} />}
    >
      <FiltroDeCultivo />
      <SelectorPeriodo periodo={periodo} onCambio={setPeriodo} />
      {!datos ? <Cargando error={error} /> : null}
      {datos?.length === 0 ? <Vacio mensaje="No hay actividades en este período." /> : null}
      {datos?.map((a) => (
        <Fila key={a.id} onPress={() => router.push(`/actividad/${a.id}`)} accessibilityLabel={a.descripcion}>
          <Texto variante="grande">
            {formatearFechaCorta(a.fecha)} {a.descripcion}
          </Texto>
          <Texto variante="pequeno">
            {a.cultivo ? `${a.cultivo} · ` : ''}
            {a.trabajadores === 0
              ? 'Sin jornales'
              : `${a.trabajadores} trab. · ${a.pendiente > 0 ? `falta ${formatearMonto(a.pendiente)}` : 'pagado'}`}
          </Texto>
        </Fila>
      ))}
    </Pantalla>
  );
}
