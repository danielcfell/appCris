import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colores, medidas, tamanos } from './tema';

interface PropsBoton {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario' | 'peligro';
  desactivado?: boolean;
  ocupado?: boolean;
  /** Botón angosto dentro de una fila, por ejemplo "Pagar". */
  compacto?: boolean;
  accessibilityLabel?: string;
}

export function BotonGrande({
  titulo,
  onPress,
  variante = 'primario',
  desactivado = false,
  ocupado = false,
  compacto = false,
  accessibilityLabel,
}: PropsBoton) {
  const inactivo = desactivado || ocupado;
  const relleno = variante === 'primario';
  const colorTexto = relleno ? colores.sobrePrimario : variante === 'peligro' ? colores.peligro : colores.primario;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? titulo}
      accessibilityState={{ disabled: inactivo, busy: ocupado }}
      disabled={inactivo}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.boton,
        compacto && estilos.compacto,
        relleno ? estilos.relleno : { borderColor: colorTexto },
        inactivo && estilos.inactivo,
        pressed && estilos.presionado,
      ]}
    >
      {ocupado ? (
        <ActivityIndicator color={colorTexto} />
      ) : (
        <Text style={[estilos.texto, compacto && estilos.textoCompacto, { color: colorTexto }]}>{titulo}</Text>
      )}
    </Pressable>
  );
}

/** Botón "+" redondo abajo a la derecha para la acción principal de la pestaña. */
export function BotonFlotante({ onPress, accessibilityLabel }: { onPress: () => void; accessibilityLabel: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [estilos.flotante, pressed && estilos.presionado]}
    >
      <Text style={estilos.textoFlotante}>+</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  boton: {
    minHeight: medidas.botonAlto,
    borderRadius: medidas.radio,
    borderWidth: 2,
    paddingHorizontal: medidas.espacio,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.fondo,
  },
  compacto: { minHeight: medidas.chipAlto, paddingHorizontal: 12, alignSelf: 'flex-start' },
  relleno: { backgroundColor: colores.primario, borderColor: colores.primario },
  inactivo: { opacity: 0.4 },
  presionado: { opacity: 0.7 },
  texto: { fontSize: tamanos.grande, fontWeight: '700', textTransform: 'uppercase' },
  textoCompacto: { fontSize: tamanos.normal, textTransform: 'none' },
  flotante: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colores.primario,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  textoFlotante: { color: colores.sobrePrimario, fontSize: 40, lineHeight: 44, fontWeight: '400' },
});
