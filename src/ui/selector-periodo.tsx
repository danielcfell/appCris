import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { etiquetaPeriodo, moverPeriodo, type Periodo } from '../dominio/periodo';
import { colores, medidas } from './tema';
import { Texto } from './texto';

/** "‹  Octubre 2026  ›": cambia al período anterior o siguiente. */
export function SelectorPeriodo({ periodo, onCambio }: { periodo: Periodo; onCambio: (p: Periodo) => void }) {
  return (
    <View style={estilos.contenedor}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Período anterior"
        onPress={() => onCambio(moverPeriodo(periodo, -1))}
        style={estilos.flecha}
      >
        <Ionicons name="chevron-back" size={30} color={colores.texto} />
      </Pressable>
      <Texto variante="grande" style={estilos.etiqueta}>
        {etiquetaPeriodo(periodo)}
      </Texto>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Período siguiente"
        onPress={() => onCambio(moverPeriodo(periodo, 1))}
        style={estilos.flecha}
      >
        <Ionicons name="chevron-forward" size={30} color={colores.texto} />
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flexDirection: 'row', alignItems: 'center', marginBottom: medidas.espacio },
  flecha: { width: medidas.botonAlto, height: medidas.botonAlto, alignItems: 'center', justifyContent: 'center' },
  etiqueta: { flex: 1, textAlign: 'center' },
});
