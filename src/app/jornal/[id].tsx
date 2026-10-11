import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { editarJornal } from '../../casos-uso/jornales';
import { obtenerJornal, type JornalDetallado } from '../../datos/jornales';
import { cantidadEditable, formatearMonto, montoEditable, parsearCantidad, parsearMonto } from '../../dominio/dinero';
import { calcularMonto, nombreUnidad } from '../../dominio/jornal';
import { formatearFechaCorta } from '../../dominio/periodo';
import {
  BotonGrande,
  CampoCantidad,
  CampoMonto,
  Cargando,
  idDeRuta,
  leerCampo,
  MensajeError,
  Pantalla,
  Tarjeta,
  Texto,
  useAccion,
  useConsulta,
  volver,
} from '../../ui';

/** Ajusta la cantidad o la tarifa de un jornal; el monto se recalcula (RF-06, RF-08). */
export default function EditarJornalRuta() {
  const id = idDeRuta(useLocalSearchParams<{ id: string }>().id) ?? 0;
  const { datos, error } = useConsulta((db) => obtenerJornal(db, id), [id]);
  return (
    <>
      <Stack.Screen options={{ title: 'Editar jornal' }} />
      {datos ? <EditarJornal jornal={datos} /> : <Cargando error={error ?? (datos === null ? 'No se encontró el jornal.' : null)} />}
    </>
  );
}

function EditarJornal({ jornal }: { jornal: JornalDetallado }) {
  const { ejecutar, error, ocupado } = useAccion();
  const [cantidad, setCantidad] = useState(cantidadEditable(jornal.cantidad));
  const [tarifa, setTarifa] = useState(montoEditable(jornal.tarifa));

  const c = leerCampo(() => parsearCantidad(cantidad));
  const t = leerCampo(() => parsearMonto(tarifa));
  const m = c.valor !== null && t.valor !== null ? leerCampo(() => calcularMonto(c.valor!, t.valor!)) : null;
  const errorCampos = c.error ?? t.error ?? m?.error ?? null;

  const guardar = async () => {
    if (c.valor === null || t.valor === null) return;
    const datos = { cantidad: c.valor, tarifa: t.valor };
    if (await ejecutar((db) => editarJornal(db, jornal.id, datos))) volver(`/actividad/${jornal.actividadId}`);
  };

  return (
    <Pantalla pie={<BotonGrande titulo="Guardar" onPress={guardar} ocupado={ocupado} desactivado={!m?.valor} />}>
      <Texto variante="grande">{jornal.trabajador}</Texto>
      <Texto variante="suave" style={{ marginBottom: 16 }}>
        {formatearFechaCorta(jornal.fecha)} {jornal.descripcion}
      </Texto>
      <MensajeError mensaje={error} />
      <View style={estilos.fila}>
        <View style={{ flex: 1 }}>
          <CampoCantidad
            etiqueta="Cantidad"
            valor={cantidad}
            onCambio={setCantidad}
            sufijo={nombreUnidad(jornal.unidad, c.valor ?? 100)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <CampoMonto etiqueta="Tarifa" valor={tarifa} onCambio={setTarifa} />
        </View>
      </View>
      {errorCampos ? <Texto variante="error">{errorCampos}</Texto> : null}
      <Tarjeta>
        <Texto variante="seccion">MONTO NUEVO</Texto>
        <Texto variante="titulo">{m?.valor ? formatearMonto(m.valor) : '—'}</Texto>
        {jornal.pagado > 0 ? (
          <Texto variante="suave">Ya pagado: {formatearMonto(jornal.pagado)}. El monto no puede quedar por debajo.</Texto>
        ) : null}
      </Tarjeta>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', gap: 12 },
});
