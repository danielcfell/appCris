import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { Pressable } from 'react-native';
import { pagarPendientesDeTrabajador } from '../../casos-uso/pagos';
import { listarPendientesDeTrabajador } from '../../datos/jornales';
import { listarPagosDeTrabajador } from '../../datos/pagos';
import { saldoDeTrabajador } from '../../datos/resumenes';
import { obtenerTrabajador } from '../../datos/trabajadores';
import { formatearMonto } from '../../dominio/dinero';
import { formatearFechaCorta } from '../../dominio/periodo';
import {
  BotonGrande,
  Cargando,
  colores,
  confirmar,
  Fila,
  hoy,
  idDeRuta,
  JornalFila,
  MensajeError,
  Pantalla,
  Seccion,
  Tarjeta,
  Texto,
  useAccion,
  useConsulta,
  Vacio,
} from '../../ui';

/** Detalle de un trabajador: lo que se le debe, sus jornales pendientes y su historial de pagos (RF-14, RF-11). */
export default function DetalleTrabajador() {
  const router = useRouter();
  const id = idDeRuta(useLocalSearchParams<{ id: string }>().id) ?? 0;
  const { datos, error } = useConsulta(
    async (db) => ({
      trabajador: await obtenerTrabajador(db, id),
      saldo: await saldoDeTrabajador(db, id),
      pendientes: await listarPendientesDeTrabajador(db, id),
      pagos: await listarPagosDeTrabajador(db, id),
    }),
    [id],
  );
  const { ejecutar, error: errorAccion, ocupado } = useAccion();

  if (!datos?.trabajador) return <Cargando error={error ?? (datos ? 'No se encontró el trabajador.' : null)} />;
  const { trabajador, saldo, pendientes, pagos } = datos;

  const pagarTodo = async () => {
    const n = pendientes.length;
    const ok = await confirmar(
      'Pagar todo',
      `Registrar pago de ${formatearMonto(saldo)} a ${trabajador.nombre} (${n} ${n === 1 ? 'jornal' : 'jornales'}).`,
      { aceptar: 'Registrar pago' },
    );
    if (ok) await ejecutar((db) => pagarPendientesDeTrabajador(db, trabajador.id, hoy()));
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: trabajador.nombre,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Editar trabajador"
              hitSlop={12}
              onPress={() => router.push(`/trabajadores/${trabajador.id}`)}
            >
              <Ionicons name="pencil" size={26} color={colores.texto} />
            </Pressable>
          ),
        }}
      />
      <Pantalla>
        {trabajador.telefono ? <Texto variante="suave">{trabajador.telefono}</Texto> : null}
        <MensajeError mensaje={errorAccion} />
        <Tarjeta>
          <Texto variante="seccion">LE DEBO</Texto>
          <Texto variante="total">{formatearMonto(saldo)}</Texto>
          {saldo > 0 ? (
            <BotonGrande titulo={`Pagar todo ${formatearMonto(saldo)}`} onPress={pagarTodo} ocupado={ocupado} />
          ) : null}
        </Tarjeta>

        <Seccion titulo="Pendientes">
          {pendientes.length === 0 ? <Texto variante="suave">No tiene jornales pendientes.</Texto> : null}
          {pendientes.map((j) => (
            <JornalFila
              key={j.id}
              jornal={j}
              titulo={`${formatearFechaCorta(j.fecha)} ${j.descripcion}`}
              acciones={
                <BotonGrande
                  compacto
                  titulo="Pagar"
                  accessibilityLabel={`Pagar ${j.descripcion} del ${formatearFechaCorta(j.fecha)}`}
                  onPress={() => router.push(`/pago/${j.id}`)}
                />
              }
            />
          ))}
        </Seccion>

        <Seccion titulo="Pagos realizados">
          {pagos.length === 0 ? <Vacio mensaje="Aún no hay pagos." /> : null}
          {pagos.map((p) => (
            <Fila key={p.id} derecha={<Texto variante="grande">{formatearMonto(p.monto)}</Texto>}>
              <Texto>{formatearFechaCorta(p.fecha)}</Texto>
              <Texto variante="pequeno">
                {p.descripcion} ({formatearFechaCorta(p.fechaActividad)})
              </Texto>
            </Fila>
          ))}
        </Seccion>
      </Pantalla>
    </>
  );
}
