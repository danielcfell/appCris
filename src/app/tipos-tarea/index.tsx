import { useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { listarTiposTarea } from '../../datos/tipos-tarea';
import { formatearMonto } from '../../dominio/dinero';
import { nombreUnidad } from '../../dominio/jornal';
import { BotonFlotante, Cargando, Fila, Pantalla, Texto, useConsulta, Vacio } from '../../ui';

/** Tipos de tarea con su tarifa sugerida y unidad de cobro (RF-03). */
export default function TiposTarea() {
  const router = useRouter();
  const { datos, error } = useConsulta((db) => listarTiposTarea(db), []);
  return (
    <>
      <Stack.Screen options={{ title: 'Tipos de tarea' }} />
      {!datos ? (
        <Cargando error={error} />
      ) : (
        <Pantalla
          flotante={
            <BotonFlotante accessibilityLabel="Nuevo tipo de tarea" onPress={() => router.push('/tipos-tarea/nuevo')} />
          }
        >
          {datos.length === 0 ? (
            <Vacio mensaje="Aún no hay tipos de tarea. Toca + para agregar uno, por ejemplo: Diario, $20 por día." />
          ) : null}
          {datos.map((t) => (
            <Fila key={t.id} onPress={() => router.push(`/tipos-tarea/${t.id}`)} accessibilityLabel={t.nombre}>
              <Texto variante="grande">{t.nombre}</Texto>
              <Texto variante="suave">
                {formatearMonto(t.tarifaSugerida)} por {nombreUnidad(t.unidad)}
              </Texto>
            </Fila>
          ))}
        </Pantalla>
      )}
    </>
  );
}
