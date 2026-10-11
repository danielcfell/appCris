import { Stack } from 'expo-router/stack';
import { colores, tamanos } from '../../../ui';
import { BorradorActividadProvider } from '../../../ui/borrador-actividad';

/** Los 3 pasos comparten el borrador; el botón atrás de Android vuelve al paso anterior. */
export default function NuevaActividadLayout() {
  return (
    <BorradorActividadProvider>
      <Stack
        screenOptions={{
          headerTintColor: colores.texto,
          headerTitleStyle: { fontSize: tamanos.grande, fontWeight: '700' },
          contentStyle: { backgroundColor: colores.fondo },
        }}
      />
    </BorradorActividadProvider>
  );
}
