import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { crearActividadConJornales } from '../../../casos-uso/actividades';
import { listarTiposTarea } from '../../../datos/tipos-tarea';
import { listarTrabajadores } from '../../../datos/trabajadores';
import { formatearCantidad, formatearMonto } from '../../../dominio/dinero';
import { nombreUnidad } from '../../../dominio/jornal';
import { formatearFechaCorta } from '../../../dominio/periodo';
import {
  BotonGrande,
  CampoCantidad,
  CampoMonto,
  Cargando,
  colores,
  Fila,
  MensajeError,
  Pantalla,
  Texto,
  useAccion,
  useConsulta,
} from '../../../ui';
import {
  datosDelBorrador,
  lineasDelBorrador,
  totalDeLineas,
  useBorradorActividad,
  type LineaBorrador,
} from '../../../ui/borrador-actividad';

/** Paso 3: revisar, ajustar un trabajador si hace falta (RF-06) y guardar todo de una vez (RNF-03). */
export default function PasoRevisar() {
  const router = useRouter();
  const { borrador, actualizar } = useBorradorActividad();
  const { datos, error } = useConsulta(
    async (db) => ({ tipos: await listarTiposTarea(db, { incluirInactivos: true }), trabajadores: await listarTrabajadores(db) }),
    [],
  );
  const { ejecutar, error: errorAccion, ocupado } = useAccion();
  const [editando, setEditando] = useState<number | null>(null);

  if (!datos) return <Cargando error={error} />;
  const tipo = datos.tipos.find((t) => t.id === borrador.tipoTareaId);
  if (!tipo) return <Cargando error="Vuelve al paso 1 y elige el tipo de tarea." />;

  const lineas = lineasDelBorrador(borrador, datos.trabajadores);
  const total = totalDeLineas(lineas);
  const datosGuardar = datosDelBorrador(borrador, lineas);

  const ajustar = (l: LineaBorrador, cambio: Partial<{ cantidad: string; tarifa: string }>) =>
    actualizar((b) => ({
      ajustes: { ...b.ajustes, [l.trabajadorId]: { cantidad: l.cantidadTexto, tarifa: l.tarifaTexto, ...cambio } },
    }));

  const guardar = async () => {
    if (!datosGuardar) return;
    const r = await ejecutar((db) => crearActividadConJornales(db, datosGuardar));
    // Cierra el asistente y abre el detalle de la actividad recién creada.
    if (r) router.replace(`/actividad/${r.valor}`);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Revisar', headerRight: () => <Texto variante="suave">3 de 3</Texto> }} />
      <Pantalla
        pie={
          <>
            <View style={estilos.total}>
              <Texto variante="grande">TOTAL</Texto>
              <Texto variante="titulo">{total !== null ? formatearMonto(total) : '—'}</Texto>
            </View>
            <BotonGrande titulo="Guardar" onPress={guardar} ocupado={ocupado} desactivado={!datosGuardar} />
          </>
        }
      >
        <Texto variante="suave">
          {formatearFechaCorta(borrador.fecha)} · {borrador.descripcion.trim() || tipo.nombre}
        </Texto>
        <MensajeError mensaje={errorAccion} />
        {lineas.map((l) =>
          editando === l.trabajadorId ? (
            <View key={l.trabajadorId} style={estilos.edicion}>
              <Texto variante="grande">{l.nombre}</Texto>
              <View style={estilos.fila}>
                <View style={{ flex: 1 }}>
                  <CampoCantidad
                    etiqueta={`Cantidad de ${l.nombre}`}
                    valor={l.cantidadTexto}
                    onCambio={(cantidad) => ajustar(l, { cantidad })}
                    sufijo={nombreUnidad(tipo.unidad, l.cantidad ?? 100)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <CampoMonto etiqueta={`Tarifa de ${l.nombre}`} valor={l.tarifaTexto} onCambio={(tarifa) => ajustar(l, { tarifa })} />
                </View>
              </View>
              {l.error ? <Texto variante="error">{l.error}</Texto> : null}
              <BotonGrande titulo="Listo" variante="secundario" compacto onPress={() => setEditando(null)} />
            </View>
          ) : (
            <Fila
              key={l.trabajadorId}
              derecha={
                <>
                  <Texto variante="grande">{l.monto !== null ? formatearMonto(l.monto) : '—'}</Texto>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Ajustar ${l.nombre}`}
                    onPress={() => setEditando(l.trabajadorId)}
                    hitSlop={12}
                    style={estilos.lapiz}
                  >
                    <Ionicons name="pencil" size={26} color={colores.primario} />
                  </Pressable>
                </>
              }
            >
              <Texto variante="grande">{l.nombre}</Texto>
              <Texto variante="suave">
                {l.cantidad !== null ? formatearCantidad(l.cantidad) : l.cantidadTexto} ×{' '}
                {l.tarifa !== null ? formatearMonto(l.tarifa) : l.tarifaTexto}
                {l.ajustado ? '  · ajustado' : ''}
              </Texto>
              {l.error ? <Texto variante="error">{l.error}</Texto> : null}
            </Fila>
          ),
        )}
      </Pantalla>
    </>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', gap: 12 },
  edicion: { paddingVertical: 12, gap: 4, borderBottomWidth: 1, borderBottomColor: colores.separador },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lapiz: { padding: 8 },
});
