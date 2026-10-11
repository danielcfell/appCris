import { Stack } from 'expo-router/stack';
import { useState } from 'react';
import { View } from 'react-native';
import { crearCategoria, renombrarCategoria } from '../casos-uso/gastos';
import { listarCategorias, type CategoriaGasto } from '../datos/gastos';
import {
  BotonGrande,
  CampoTexto,
  Cargando,
  Fila,
  MensajeError,
  Pantalla,
  Seccion,
  Texto,
  useAccion,
  useConsulta,
} from '../ui';

/** Categorías de gasto: las 4 iniciales vienen precargadas y se pueden crear y renombrar (RF-17). */
export default function Categorias() {
  const { datos, error: errorConsulta } = useConsulta((db) => listarCategorias(db), []);
  const { ejecutar, error, ocupado } = useAccion();
  const [editando, setEditando] = useState<CategoriaGasto | null>(null);
  const [nombreEditado, setNombreEditado] = useState('');
  const [nueva, setNueva] = useState('');

  const empezarEdicion = (c: CategoriaGasto) => {
    setEditando(c);
    setNombreEditado(c.nombre);
  };

  const guardarEdicion = async () => {
    if (!editando) return;
    if (await ejecutar((db) => renombrarCategoria(db, editando.id, nombreEditado))) setEditando(null);
  };

  const agregar = async () => {
    if (await ejecutar((db) => crearCategoria(db, nueva))) setNueva('');
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Categorías de gasto' }} />
      {!datos ? (
        <Cargando error={errorConsulta} />
      ) : (
        <Pantalla>
          <MensajeError mensaje={error} />
          {datos.map((c) =>
            editando?.id === c.id ? (
              <View key={c.id} style={{ paddingVertical: 8 }}>
                <CampoTexto etiqueta="Nuevo nombre" valor={nombreEditado} onCambio={setNombreEditado} autoFocus />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <BotonGrande titulo="Guardar" onPress={guardarEdicion} ocupado={ocupado} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <BotonGrande titulo="Cancelar" variante="secundario" onPress={() => setEditando(null)} />
                  </View>
                </View>
              </View>
            ) : (
              <Fila key={c.id} onPress={() => empezarEdicion(c)} accessibilityLabel={`Renombrar ${c.nombre}`}>
                <Texto variante="grande">{c.nombre}</Texto>
              </Fila>
            ),
          )}
          <Seccion titulo="Agregar categoría">
            <CampoTexto etiqueta="Nombre" valor={nueva} onCambio={setNueva} placeholder="Ej.: Combustible" />
            <BotonGrande titulo="Agregar" variante="secundario" onPress={agregar} ocupado={ocupado} />
          </Seccion>
        </Pantalla>
      )}
    </>
  );
}
