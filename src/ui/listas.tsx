import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { EstadoJornal } from '../dominio/jornal';
import { colores, medidas, tamanos } from './tema';
import { Texto } from './texto';

/** Fila de lista. Con `onPress` muestra la flecha "›" y se puede tocar. */
export function Fila({
  children,
  derecha,
  onPress,
  accessibilityLabel,
}: {
  children: ReactNode;
  derecha?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const contenido = (
    <>
      <View style={estilos.filaCuerpo}>{children}</View>
      {derecha}
      {onPress ? <Ionicons name="chevron-forward" size={24} color={colores.textoSuave} /> : null}
    </>
  );
  if (!onPress) return <View style={estilos.fila}>{contenido}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [estilos.fila, pressed && { backgroundColor: colores.superficie }]}
    >
      {contenido}
    </Pressable>
  );
}

export function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={estilos.seccion}>
      <Texto variante="seccion">{titulo.toUpperCase()}</Texto>
      {children}
    </View>
  );
}

/** Recuadro destacado, por ejemplo para "TOTAL QUE DEBO". */
export function Tarjeta({ children }: { children: ReactNode }) {
  return <View style={estilos.tarjeta}>{children}</View>;
}

export function Vacio({ mensaje }: { mensaje: string }) {
  return (
    <View style={estilos.vacio}>
      <Texto variante="suave" style={{ textAlign: 'center' }}>
        {mensaje}
      </Texto>
    </View>
  );
}

export function MensajeError({ mensaje }: { mensaje: string | null | undefined }) {
  if (!mensaje) return null;
  return (
    <View accessibilityRole="alert" style={estilos.error}>
      <Texto variante="error">{mensaje}</Texto>
    </View>
  );
}

const ETIQUETAS: Record<EstadoJornal, string> = { pendiente: 'PENDIENTE', parcial: 'PARCIAL', pagado: 'PAGADO' };

/** Estado del jornal con color y palabra (RF-10). */
export function EtiquetaEstado({ estado }: { estado: EstadoJornal }) {
  return <Text style={[estilos.estado, { color: colores[estado], borderColor: colores[estado] }]}>{ETIQUETAS[estado]}</Text>;
}

const estilos = StyleSheet.create({
  fila: {
    minHeight: medidas.filaAlta,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colores.separador,
  },
  filaCuerpo: { flex: 1, gap: 2 },
  seccion: { marginTop: medidas.espacio, gap: 4 },
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: medidas.radio,
    padding: medidas.espacio,
    gap: 8,
    marginBottom: medidas.espacio,
  },
  vacio: { paddingVertical: 48, paddingHorizontal: medidas.espacio },
  error: {
    borderWidth: 2,
    borderColor: colores.peligro,
    borderRadius: medidas.radio,
    padding: 12,
    marginBottom: medidas.espacio,
  },
  estado: {
    fontSize: tamanos.pequeno,
    fontWeight: '700',
    borderWidth: 2,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
});
