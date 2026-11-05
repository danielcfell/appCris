import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { Pressable } from 'react-native';
import { pagarPendientesDeTrabajador } from '../../casos-uso/pagos';
import { listarPendientesDeTrabajador } from '../../datos/jornales';
import { obtenerCultivo } from '../../datos/cultivos';
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
  useDatos,
  Vacio,
} from '../../ui';

/**
 * Detalle de un trabajador: lo que se le debe, sus jornales pendientes y su historial de pagos (RF-14, RF-11).
 * Si se está viendo un cultivo, todo se acota a ese cultivo, incluido "Pagar todo" (RF-29).
 */
export default function DetalleTrabajador() {
  const router = useRouter();
  const id = idDeRuta(useLocalSearchParams<{ id: string }>().id) ?? 0;
  const { filtroCultivo } = useDatos();
  const { datos, error } = useConsulta(
    async (db) => ({
      trabajador: await obtenerTrabajador(db, id),
      saldo: await saldoDeTrabajador(db, id, filtroCultivo),
      pendientes: await listarPendientesDeTrabajador(db, id, filtroCultivo),
      pagos: await listarPagosDeTrabajador(db, id, filtroCultivo),
      cultivo: typeof filtroCultivo === 'number' ? await obtenerCultivo(db, filtroCultivo) : null,
    }),
    [id, filtroCultivo],
  );
  const { ejecutar, error: errorAccion, ocupado } = useAccion();

  if (!datos?.trabajador) return <Cargando error={error ?? (datos ? 'No se encontró el trabajador.' : null)} />;
  const { trabajador, saldo, pendientes, pagos, cultivo } = datos;
  const nombreCultivo = filtroCultivo === null ? 'Sin cultivo' : (cultivo?.nombre ?? null);

  const pagarTodo = async () => {
    const n = pendientes.length;
    const ok = await confirmar(
      'Pagar todo',
      `Registrar pago de ${formatearMonto(saldo)} a ${trabajador.nombre} (${n} ${n === 1 ? 'jornal' : 'jornales'}).`,
      { aceptar: 'Registrar pago' },
    );
    if (ok) await ejecutar((db) => pagarPendientesDeTrabajador(db, trabajador.id, hoy(), filtroCultivo));
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
          <Texto variante="seccion">{nombreCultivo ? `LE DEBO · ${nombreCultivo.toUpperCase()}` : 'LE DEBO'}</Texto>
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
