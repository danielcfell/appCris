import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { eliminarActividad } from '../../casos-uso/actividades';
import { eliminarJornal } from '../../casos-uso/jornales';
import { pagarPendientesDeActividad } from '../../casos-uso/pagos';
import { obtenerActividad } from '../../datos/actividades';
import { obtenerCultivo } from '../../datos/cultivos';
import { listarGastosDeActividad } from '../../datos/gastos';
import { listarJornalesDeActividad, type JornalDetallado } from '../../datos/jornales';
import { costoDeActividad } from '../../datos/resumenes';
import { obtenerTipoTarea } from '../../datos/tipos-tarea';
import { formatearMonto } from '../../dominio/dinero';
import { formatearFecha, formatearFechaCorta } from '../../dominio/periodo';
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
  volver,
} from '../../ui';

/** Detalle de una actividad: costo total, cuánto se pagó y cuánto falta (RF-21); jornales y gastos asociados. */
export default function DetalleActividad() {
  const router = useRouter();
  const id = idDeRuta(useLocalSearchParams<{ id: string }>().id) ?? 0;
  const { datos, error } = useConsulta(async (db) => {
    const actividad = await obtenerActividad(db, id);
    return {
      actividad,
      tipo: actividad ? await obtenerTipoTarea(db, actividad.tipoTareaId) : null,
      cultivo: actividad?.cultivoId != null ? await obtenerCultivo(db, actividad.cultivoId) : null,
      costo: await costoDeActividad(db, id),
      jornales: await listarJornalesDeActividad(db, id),
      gastos: await listarGastosDeActividad(db, id),
    };
  }, [id]);
  const { ejecutar, error: errorAccion, ocupado } = useAccion();

  if (!datos?.actividad) return <Cargando error={error ?? (datos ? 'No se encontró la actividad.' : null)} />;
  const { actividad, tipo, cultivo, costo, jornales, gastos } = datos;

  const pagarTodo = async () => {
    const n = jornales.filter((j) => j.saldo > 0).length;
    const ok = await confirmar(
      'Pagar todo',
      `Registrar pago de ${formatearMonto(costo.pendiente)} (${n} ${n === 1 ? 'jornal' : 'jornales'}) de "${actividad.descripcion}".`,
      { aceptar: 'Registrar pago' },
    );
    if (ok) await ejecutar((db) => pagarPendientesDeActividad(db, actividad.id, hoy()));
  };

  // RF-08: si el jornal tiene pagos, se avisa que también se borran.
  const borrarJornal = async (j: JornalDetallado) => {
    const mensaje =
      j.pagado > 0
        ? `Este jornal tiene ${formatearMonto(j.pagado)} pagados. Si lo eliminas se borran también sus pagos.`
        : `¿Eliminar el jornal de ${j.trabajador} (${formatearMonto(j.monto)})?`;
    if (await confirmar('Eliminar jornal', mensaje, { aceptar: 'Eliminar', destructivo: true })) {
      await ejecutar((db) => eliminarJornal(db, j.id));
    }
  };

  const opcionesJornal = (j: JornalDetallado) =>
    Alert.alert(j.trabajador, `${formatearMonto(j.monto)} · ${actividad.descripcion}`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void borrarJornal(j) },
      { text: 'Editar', onPress: () => router.push(`/jornal/${j.id}`) },
    ]);

  const borrarActividad = async () => {
    if (await confirmar('Eliminar actividad', `¿Eliminar "${actividad.descripcion}"?`, { aceptar: 'Eliminar', destructivo: true })) {
      if (await ejecutar((db) => eliminarActividad(db, actividad.id))) volver('/actividades');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: actividad.descripcion }} />
      <Pantalla>
        <Texto variante="suave">
          {formatearFecha(actividad.fecha)}
          {tipo ? ` · ${tipo.nombre}` : ''}
          {cultivo ? ` · ${cultivo.nombre}` : ''}
        </Texto>
        <MensajeError mensaje={errorAccion} />
        <Tarjeta>
          <View style={estilos.linea}>
            <Texto>Jornales</Texto>
            <Texto>{formatearMonto(costo.jornales)}</Texto>
          </View>
          <View style={estilos.linea}>
            <Texto>Gastos</Texto>
            <Texto>{formatearMonto(costo.gastos)}</Texto>
          </View>
          <View style={estilos.linea}>
            <Texto variante="grande">COSTO TOTAL</Texto>
            <Texto variante="grande">{formatearMonto(costo.total)}</Texto>
          </View>
          <Texto variante="suave">
            Pagado {formatearMonto(costo.pagado)} · Falta {formatearMonto(costo.pendiente)}
          </Texto>
          {costo.pendiente > 0 ? (
            <BotonGrande titulo={`Pagar todo ${formatearMonto(costo.pendiente)}`} onPress={pagarTodo} ocupado={ocupado} />
          ) : null}
        </Tarjeta>

        <Seccion titulo="Jornales">
          {jornales.length === 0 ? <Texto variante="suave">Sin jornales.</Texto> : null}
          {jornales.map((j) => (
            <JornalFila
              key={j.id}
              jornal={j}
              titulo={j.trabajador}
              acciones={
                <>
                  {j.saldo > 0 ? (
                    <BotonGrande
                      compacto
                      titulo="Pagar"
                      accessibilityLabel={`Pagar a ${j.trabajador}`}
                      onPress={() => router.push(`/pago/${j.id}`)}
                    />
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Más opciones de ${j.trabajador}`}
                    onPress={() => opcionesJornal(j)}
                    hitSlop={12}
                    style={estilos.menu}
                  >
                    <Ionicons name="ellipsis-vertical" size={26} color={colores.texto} />
                  </Pressable>
                </>
              }
            />
          ))}
        </Seccion>

        <Seccion titulo="Gastos asociados">
          {gastos.map((g) => (
            <Fila
              key={g.id}
              onPress={() => router.push(`/gasto/${g.id}`)}
              accessibilityLabel={`Gasto ${g.categoria} ${formatearMonto(g.monto)}`}
              derecha={<Texto variante="grande">{formatearMonto(g.monto)}</Texto>}
            >
              <Texto variante="grande">{g.categoria}</Texto>
              <Texto variante="pequeno">
                {formatearFechaCorta(g.fecha)}
                {g.nota ? ` · ${g.nota}` : ''}
              </Texto>
            </Fila>
          ))}
          <BotonGrande
            titulo="+ Agregar gasto"
            variante="secundario"
            compacto
            onPress={() => router.push(`/gasto/nuevo?actividadId=${actividad.id}`)}
          />
        </Seccion>

        {jornales.length === 0 && gastos.length === 0 ? (
          <View style={{ marginTop: 32 }}>
            <BotonGrande titulo="Eliminar actividad" variante="peligro" onPress={borrarActividad} desactivado={ocupado} />
          </View>
        ) : null}
      </Pantalla>
    </>
  );
}

const estilos = StyleSheet.create({
  linea: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  menu: { padding: 8 },
});
