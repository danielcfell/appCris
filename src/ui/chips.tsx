import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colores, medidas, tamanos } from './tema';

export interface OpcionChip<K> {
  clave: K;
  etiqueta: string;
}

/** Opciones de un solo toque (tipo de tarea, categoría, unidad). */
export function Chips<K extends string | number>({
  opciones,
  seleccionada,
  onSeleccionar,
  extra,
}: {
  opciones: OpcionChip<K>[];
  seleccionada: K | null;
  onSeleccionar: (clave: K) => void;
  /** Chip adicional al final, por ejemplo "+ Otro". */
  extra?: { etiqueta: string; onPress: () => void };
}) {
  return (
    <View style={estilos.contenedor}>
      {opciones.map((o) => {
        const activa = o.clave === seleccionada;
        return (
          <Pressable
            key={o.clave}
            accessibilityRole="radio"
            accessibilityState={{ selected: activa }}
            onPress={() => onSeleccionar(o.clave)}
            style={[estilos.chip, activa && estilos.activa]}
          >
            <Text style={[estilos.texto, activa && estilos.textoActivo]}>
              {activa ? '✓ ' : ''}
              {o.etiqueta}
            </Text>
          </Pressable>
        );
      })}
      {extra ? (
        <Pressable accessibilityRole="button" onPress={extra.onPress} style={[estilos.chip, estilos.extra]}>
          <Text style={[estilos.texto, { color: colores.primario }]}>{extra.etiqueta}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: medidas.espacio },
  chip: {
    minHeight: medidas.chipAlto,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colores.borde,
    justifyContent: 'center',
    backgroundColor: colores.fondo,
  },
  activa: { backgroundColor: colores.primario, borderColor: colores.primario },
  extra: { borderStyle: 'dashed', borderColor: colores.primario },
  texto: { fontSize: tamanos.normal, color: colores.texto },
  textoActivo: { color: colores.sobrePrimario, fontWeight: '700' },
});
