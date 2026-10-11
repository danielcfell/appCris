import { Stack } from 'expo-router/stack';
import { Pantalla, Vacio } from '../ui';

// RF-22 a RF-25: se implementa en el incremento 3.
export default function Respaldo() {
  return (
    <Pantalla>
      <Stack.Screen options={{ title: 'Respaldo' }} />
      <Vacio mensaje="El respaldo estará disponible en la próxima versión." />
    </Pantalla>
  );
}
