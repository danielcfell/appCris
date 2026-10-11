import Ionicons from '@expo/vector-icons/Ionicons';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { fechaLocal, type Fecha } from '../dominio/fecha';
import { aDate, describirFecha } from '../dominio/periodo';
import { hoy } from './datos-context';
import { colores, medidas, tamanos } from './tema';
import { Texto } from './texto';

interface PropsCampo extends Omit<TextInputProps, 'value' | 'onChangeText' | 'style'> {
  etiqueta: string;
  valor: string;
  onCambio: (texto: string) => void;
  error?: string | null;
  prefijo?: string;
  sufijo?: string;
}

export function CampoTexto({ etiqueta, valor, onCambio, error, prefijo, sufijo, ...props }: PropsCampo) {
  return (
    <View style={estilos.contenedor}>
      <Texto variante="suave">{etiqueta}</Texto>
      <View style={[estilos.caja, error ? estilos.cajaError : null]}>
        {prefijo ? <Text style={estilos.adorno}>{prefijo}</Text> : null}
        <TextInput
          accessibilityLabel={etiqueta}
          value={valor}
          onChangeText={onCambio}
          style={estilos.input}
          placeholderTextColor={colores.textoSuave}
          {...props}
        />
        {sufijo ? <Text style={estilos.adorno}>{sufijo}</Text> : null}
      </View>
      {error ? <Texto variante="error">{error}</Texto> : null}
    </View>
  );
}

/** Monto en dólares con teclado numérico. Acepta coma o punto decimal. */
export function CampoMonto(props: Omit<PropsCampo, 'prefijo' | 'keyboardType'>) {
  return <CampoTexto prefijo="$" keyboardType="decimal-pad" selectTextOnFocus {...props} />;
}

export function CampoCantidad(props: Omit<PropsCampo, 'keyboardType'>) {
  return <CampoTexto keyboardType="decimal-pad" selectTextOnFocus {...props} />;
}

/** Muestra "Hoy, 10/10/2026" y abre el calendario nativo de Android al tocarlo. */
export function CampoFecha({
  etiqueta = 'Fecha',
  valor,
  onCambio,
}: {
  etiqueta?: string;
  valor: Fecha;
  onCambio: (fecha: Fecha) => void;
}) {
  const abrir = () =>
    DateTimePickerAndroid.open({
      value: aDate(valor),
      mode: 'date',
      onChange: (evento, fecha) => {
        if (evento.type === 'set' && fecha) onCambio(fechaLocal(fecha));
      },
    });
  const texto = describirFecha(valor, hoy());
  return (
    <View style={estilos.contenedor}>
      <Texto variante="suave">{etiqueta}</Texto>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${etiqueta}: ${texto}. Cambiar`}
        onPress={abrir}
        style={({ pressed }) => [estilos.caja, pressed && { opacity: 0.7 }]}
      >
        <Text style={[estilos.input, estilos.textoFecha]}>{texto}</Text>
        <Ionicons name="calendar-outline" size={26} color={colores.texto} />
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: 6, marginBottom: medidas.espacio },
  caja: {
    minHeight: medidas.botonAlto,
    borderWidth: 2,
    borderColor: colores.borde,
    borderRadius: medidas.radio,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colores.fondo,
  },
  cajaError: { borderColor: colores.peligro },
  input: { flex: 1, fontSize: tamanos.grande, color: colores.texto, paddingVertical: 8 },
  textoFecha: { paddingVertical: 14 },
  adorno: { fontSize: tamanos.grande, color: colores.textoSuave },
});
