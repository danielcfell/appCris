import { Alert } from 'react-native';

/** Diálogo de confirmación; resuelve `true` solo si el usuario acepta. */
export function confirmar(
  titulo: string,
  mensaje: string,
  {
    aceptar = 'Aceptar',
    cancelar = 'Cancelar',
    destructivo = false,
  }: { aceptar?: string; cancelar?: string; destructivo?: boolean } = {},
): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      titulo,
      mensaje,
      [
        { text: cancelar, style: 'cancel', onPress: () => resolve(false) },
        { text: aceptar, style: destructivo ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
