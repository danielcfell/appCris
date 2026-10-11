import type { ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { colores, medidas } from './tema';
import { Texto } from './texto';

/**
 * Contenedor de pantalla con desplazamiento. `pie` queda fijo abajo (por ejemplo "SIGUIENTE")
 * y `flotante` encima del contenido (el botón "+").
 */
export function Pantalla({ children, pie, flotante }: { children: ReactNode; pie?: ReactNode; flotante?: ReactNode }) {
  return (
    <KeyboardAvoidingView style={estilos.raiz} behavior="height">
      <ScrollView
        style={estilos.raiz}
        contentContainerStyle={[estilos.contenido, flotante ? { paddingBottom: 110 } : null]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
      {pie ? <View style={estilos.pie}>{pie}</View> : null}
      {flotante}
    </KeyboardAvoidingView>
  );
}

/** Mientras carga la consulta, o si falló. */
export function Cargando({ error }: { error?: string | null }) {
  return (
    <View style={estilos.centro}>
      {error ? <Texto variante="error">{error}</Texto> : <ActivityIndicator size="large" color={colores.primario} />}
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: medidas.espacio },
  pie: {
    padding: medidas.espacio,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colores.separador,
    backgroundColor: colores.fondo,
  },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: medidas.espacio, backgroundColor: colores.fondo },
});
