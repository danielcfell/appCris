import { useRouter } from 'expo-router';
import { deudasPorTrabajador, totalAdeudado, type Deuda } from '../../datos/resumenes';
import { formatearMonto } from '../../dominio/dinero';
import {
  BotonFlotante,
  Cargando,
  Fila,
  FiltroDeCultivo,
  Pantalla,
  Tarjeta,
  Texto,
  useConsulta,
  useDatos,
  Vacio,
} from '../../ui';

/**
 * "A quién debo": trabajadores con saldo, de mayor a menor, y el total adeudado (RF-13, RN-03).
 * Se puede ver todo junto o un cultivo a la vez (RF-28).
 */
export default function AQuienDebo() {
  const router = useRouter();
  const { filtroCultivo } = useDatos();
  const { datos, error } = useConsulta(
    async (db) => ({
      deudas: await deudasPorTrabajador(db, filtroCultivo),
      total: await totalAdeudado(db, filtroCultivo),
    }),
    [filtroCultivo],
  );

  return (
    <Pantalla
      flotante={<BotonFlotante accessibilityLabel="Nueva actividad" onPress={() => router.push('/actividad/nueva')} />}
    >
      <FiltroDeCultivo />
      {!datos ? <Cargando error={error} /> : <Deudas datos={datos} />}
    </Pantalla>
  );
}

function Deudas({ datos }: { datos: { deudas: Deuda[]; total: number } }) {
  const router = useRouter();
  return (
    <>
      <Tarjeta>
        <Texto variante="seccion">TOTAL QUE DEBO</Texto>
        <Texto variante="total" accessibilityLabel={`Total que debo: ${formatearMonto(datos.total)}`}>
          {formatearMonto(datos.total)}
        </Texto>
      </Tarjeta>
      {datos.deudas.length === 0 ? <Vacio mensaje="No le debes a nadie." /> : null}
      {datos.deudas.map((d) => (
        <Fila
          key={d.trabajadorId}
          onPress={() => router.push(`/trabajador/${d.trabajadorId}`)}
          accessibilityLabel={`${d.nombre}, le debo ${formatearMonto(d.saldo)}`}
          derecha={<Texto variante="grande">{formatearMonto(d.saldo)}</Texto>}
        >
          <Texto variante="grande">{d.nombre}</Texto>
          <Texto variante="pequeno">
            {d.jornalesPendientes} {d.jornalesPendientes === 1 ? 'jornal pendiente' : 'jornales pendientes'}
          </Texto>
        </Fila>
      ))}
    </>
  );
}
