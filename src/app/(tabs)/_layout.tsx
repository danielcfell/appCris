import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { colores, tamanos } from '../../ui';

type NombreIcono = ComponentProps<typeof Ionicons>['name'];

const icono =
  (nombre: NombreIcono) =>
  ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={nombre} color={color} size={size + 2} />;

export default function PestanasLayout() {
  return (
    <Tabs
      screenOptions={{
        headerTintColor: colores.texto,
        headerTitleStyle: { fontSize: tamanos.grande, fontWeight: '700' },
        tabBarActiveTintColor: colores.primario,
        tabBarInactiveTintColor: colores.textoSuave,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        sceneStyle: { backgroundColor: colores.fondo },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'A quién debo', tabBarLabel: 'Debo', tabBarIcon: icono('cash-outline') }} />
      <Tabs.Screen name="actividades" options={{ title: 'Actividades', tabBarIcon: icono('calendar-outline') }} />
      <Tabs.Screen name="gastos" options={{ title: 'Gastos', tabBarIcon: icono('cart-outline') }} />
      <Tabs.Screen name="resumen" options={{ title: 'Resumen', tabBarIcon: icono('stats-chart-outline') }} />
      <Tabs.Screen name="mas" options={{ title: 'Más', tabBarIcon: icono('menu-outline') }} />
    </Tabs>
  );
}
