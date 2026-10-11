import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { abrirBaseDatos } from '../datos/adaptador-expo';
import type { BaseDatos } from '../datos/base-datos';
import { Cargando, colores, DatosProvider, tamanos } from '../ui';

export default function RaizLayout() {
  const [db, setDb] = useState<BaseDatos | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    abrirBaseDatos().then(setDb, (e: unknown) => {
      console.error(e);
      setError('No se pudo abrir la base de datos. Cierra la app y vuelve a abrirla.');
    });
  }, []);

  if (!db) return <Cargando error={error} />;

  return (
    <DatosProvider db={db}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: colores.texto,
          headerTitleStyle: { fontSize: tamanos.grande, fontWeight: '700' },
          contentStyle: { backgroundColor: colores.fondo },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="actividad/nueva" options={{ headerShown: false }} />
        <Stack.Screen
          name="pago/[jornalId]"
          options={{ title: 'Registrar pago', presentation: 'formSheet', sheetAllowedDetents: 'fitToContents' }}
        />
      </Stack>
    </DatosProvider>
  );
}
