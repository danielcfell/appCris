import { StyleSheet, Text, type TextProps } from 'react-native';
import { colores, tamanos } from './tema';

type Variante = 'normal' | 'suave' | 'pequeno' | 'grande' | 'titulo' | 'total' | 'seccion' | 'error';

export function Texto({ variante = 'normal', style, ...props }: TextProps & { variante?: Variante }) {
  return <Text style={[estilos.base, estilos[variante], style]} {...props} />;
}

const estilos = StyleSheet.create({
  base: { color: colores.texto, fontSize: tamanos.normal },
  normal: {},
  suave: { color: colores.textoSuave },
  pequeno: { fontSize: tamanos.pequeno, color: colores.textoSuave },
  grande: { fontSize: tamanos.grande, fontWeight: '600' },
  titulo: { fontSize: tamanos.titulo, fontWeight: '700' },
  total: { fontSize: tamanos.total, fontWeight: '700' },
  seccion: { fontSize: tamanos.pequeno, fontWeight: '700', color: colores.textoSuave, letterSpacing: 0.5 },
  error: { color: colores.peligro, fontWeight: '600' },
});
