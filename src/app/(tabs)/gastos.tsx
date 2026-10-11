import { useRouter } from 'expo-router';
import { useState } from 'react';
import { listarGastos } from '../../datos/gastos';
import { formatearMonto } from '../../dominio/dinero';
import { formatearFechaCorta, periodoMes } from '../../dominio/periodo';
import { BotonFlotante, Cargando, Fila, hoy, Pantalla, SelectorPeriodo, Tarjeta, Texto, useConsulta, Vacio } from '../../ui';

/** Gastos del mes con su total (RF-16). */
export default function Gastos() {
  const router = useRouter();
  const [periodo, setPeriodo] = useState(() => periodoMes(hoy()));
  const { datos, error } = useConsulta((db) => listarGastos(db, periodo.desde, periodo.hasta), [periodo.desde, periodo.hasta]);
  const total = datos?.reduce((suma, g) => suma + g.monto, 0) ?? 0;

  return (
    <Pantalla flotante={<BotonFlotante accessibilityLabel="Nuevo gasto" onPress={() => router.push('/gasto/nuevo')} />}>
      <SelectorPeriodo periodo={periodo} onCambio={setPeriodo} />
      {!datos ? (
        <Cargando error={error} />
      ) : (
        <>
          <Tarjeta>
            <Texto variante="seccion">TOTAL DEL PERÍODO</Texto>
            <Texto variante="titulo" accessibilityLabel={`Total de gastos: ${formatearMonto(total)}`}>
              {formatearMonto(total)}
            </Texto>
          </Tarjeta>
          {datos.length === 0 ? <Vacio mensaje="No hay gastos en este período." /> : null}
          {datos.map((g) => (
            <Fila
              key={g.id}
              onPress={() => router.push(`/gasto/${g.id}`)}
              accessibilityLabel={`${g.categoria} ${formatearMonto(g.monto)}`}
              derecha={<Texto variante="grande">{formatearMonto(g.monto)}</Texto>}
            >
              <Texto variante="grande">
                {formatearFechaCorta(g.fecha)} {g.categoria}
              </Texto>
              {g.nota ? <Texto variante="pequeno">{g.nota}</Texto> : null}
            </Fila>
          ))}
        </>
      )}
    </Pantalla>
  );
}
