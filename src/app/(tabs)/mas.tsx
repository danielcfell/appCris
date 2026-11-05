import { useRouter, type Href } from 'expo-router';
import { Fila, Pantalla, Texto } from '../../ui';

const OPCIONES: { titulo: string; ruta: Href }[] = [
  { titulo: 'Cultivos', ruta: '/cultivos' },
  { titulo: 'Trabajadores', ruta: '/trabajadores' },
  { titulo: 'Tipos de tarea y tarifas', ruta: '/tipos-tarea' },
  { titulo: 'Categorías de gasto', ruta: '/categorias' },
  { titulo: 'Respaldo', ruta: '/respaldo' },
];

/** Menú de configuración y datos (3.8). */
export default function Mas() {
  const router = useRouter();
  return (
    <Pantalla>
      {OPCIONES.map((o) => (
        <Fila key={o.titulo} onPress={() => router.push(o.ruta)} accessibilityLabel={o.titulo}>
          <Texto variante="grande">{o.titulo}</Texto>
        </Fila>
      ))}
    </Pantalla>
  );
}
