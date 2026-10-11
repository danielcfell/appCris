import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { crearTrabajador } from '../../../casos-uso/trabajadores';
import { listarTiposTarea } from '../../../datos/tipos-tarea';
import { listarTrabajadores } from '../../../datos/trabajadores';
import { formatearMonto, parsearCantidad } from '../../../dominio/dinero';
import { nombreUnidad } from '../../../dominio/jornal';
import {
  BotonGrande,
  CampoCantidad,
  CampoMonto,
  CampoTexto,
  Cargando,
  colores,
  leerCampo,
  MensajeError,
  medidas,
  Pantalla,
  Texto,
  useAccion,
  useConsulta,
} from '../../../ui';
import { lineasDelBorrador, totalDeLineas, useBorradorActividad } from '../../../ui/borrador-actividad';

/** Paso 2: quiénes trabajaron, con la misma cantidad y tarifa para todos en un solo paso (RF-06). */
export default function PasoQuienes() {
  const router = useRouter();
  const { borrador, actualizar } = useBorradorActividad();
  const { datos, error } = useConsulta(
    async (db) => ({ tipos: await listarTiposTarea(db, { incluirInactivos: true }), trabajadores: await listarTrabajadores(db) }),
    [],
  );
  const { ejecutar, error: errorAccion, ocupado } = useAccion();
  const [nuevoNombre, setNuevoNombre] = useState<string | null>(null);

  if (!datos) return <Cargando error={error} />;
  const tipo = datos.tipos.find((t) => t.id === borrador.tipoTareaId);
  if (!tipo) return <Cargando error="Vuelve al paso 1 y elige el tipo de tarea." />;

  // Solo trabajadores activos (RF-02).
  const lineas = lineasDelBorrador(borrador, datos.trabajadores);
  const total = totalDeLineas(lineas);
  const cantidad = leerCampo(() => parsearCantidad(borrador.cantidadComun));

  const alternar = (id: number) =>
    actualizar((b) => ({
      seleccionados: b.seleccionados.includes(id) ? b.seleccionados.filter((x) => x !== id) : [...b.seleccionados, id],
    }));

  const agregarTrabajador = async () => {
    const r = await ejecutar((db) => crearTrabajador(db, { nombre: nuevoNombre ?? '' }));
    if (r) {
      actualizar((b) => ({ seleccionados: [...b.seleccionados, r.valor] }));
      setNuevoNombre(null);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: borrador.descripcion.trim() || tipo.nombre,
          headerRight: () => <Texto variante="suave">2 de 3</Texto>,
        }}
      />
      <Pantalla
        pie={
          <>
            <Texto variante="grande" accessibilityLabel="Resumen de la selección">
              {lineas.length} {lineas.length === 1 ? 'trabajador' : 'trabajadores'}
              {total !== null ? ` · ${formatearMonto(total)}` : ''}
            </Texto>
            <BotonGrande
              titulo="Siguiente"
              desactivado={lineas.length === 0 || total === null}
              onPress={() => router.push('/actividad/nueva/revisar')}
            />
          </>
        }
      >
        <Texto variante="seccion">PARA TODOS</Texto>
        <View style={estilos.fila}>
          <View style={{ flex: 1 }}>
            <CampoCantidad
              etiqueta="Cantidad"
              valor={borrador.cantidadComun}
              onCambio={(cantidadComun) => actualizar({ cantidadComun })}
              sufijo={nombreUnidad(tipo.unidad, cantidad.valor ?? 100)}
              error={borrador.cantidadComun ? cantidad.error : null}
            />
          </View>
          <View style={{ flex: 1 }}>
            <CampoMonto
              etiqueta="Tarifa"
              valor={borrador.tarifaComun}
              onCambio={(tarifaComun) => actualizar({ tarifaComun })}
            />
          </View>
        </View>
        {borrador.tarifaComun !== '' && lineas.length > 0 && total === null ? (
          <Texto variante="error">Revisa la cantidad y la tarifa.</Texto>
        ) : null}

        <MensajeError mensaje={errorAccion} />
        {datos.trabajadores.map((t) => {
          const marcado = borrador.seleccionados.includes(t.id);
          return (
            <Pressable
              key={t.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: marcado }}
              accessibilityLabel={t.nombre}
              onPress={() => alternar(t.id)}
              style={({ pressed }) => [estilos.trabajador, pressed && { backgroundColor: colores.superficie }]}
            >
              <Ionicons
                name={marcado ? 'checkbox' : 'square-outline'}
                size={32}
                color={marcado ? colores.primario : colores.textoSuave}
              />
              <Texto variante="grande">{t.nombre}</Texto>
            </Pressable>
          );
        })}

        {nuevoNombre === null ? (
          <BotonGrande titulo="+ Nuevo trabajador" variante="secundario" compacto onPress={() => setNuevoNombre('')} />
        ) : (
          <View style={{ marginTop: medidas.espacio }}>
            <CampoTexto
              etiqueta="Nombre del nuevo trabajador"
              valor={nuevoNombre}
              onCambio={setNuevoNombre}
              autoFocus
              autoCapitalize="words"
            />
            <View style={estilos.fila}>
              <View style={{ flex: 1 }}>
                <BotonGrande titulo="Agregar" onPress={agregarTrabajador} ocupado={ocupado} />
              </View>
              <View style={{ flex: 1 }}>
                <BotonGrande titulo="Cancelar" variante="secundario" onPress={() => setNuevoNombre(null)} />
              </View>
            </View>
          </View>
        )}
      </Pantalla>
    </>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', gap: 12 },
  trabajador: {
    minHeight: medidas.filaAlta,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colores.separador,
  },
});
