import { useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { listarTiposTarea } from '../../../datos/tipos-tarea';
import { formatearMonto, montoEditable } from '../../../dominio/dinero';
import { nombreUnidad } from '../../../dominio/jornal';
import { BotonGrande, CampoFecha, CampoTexto, Cargando, Chips, Pantalla, Texto, useConsulta } from '../../../ui';
import { useBorradorActividad } from '../../../ui/borrador-actividad';

/** Paso 1: qué se hizo (RF-05). La tarifa sugerida del tipo prellena el paso 2 (RF-04). */
export default function PasoQue() {
  const router = useRouter();
  const { borrador, actualizar } = useBorradorActividad();
  const { datos: tipos, error } = useConsulta((db) => listarTiposTarea(db), []);

  if (!tipos) return <Cargando error={error} />;
  const tipo = tipos.find((t) => t.id === borrador.tipoTareaId);

  const elegirTipo = (id: number) => {
    const elegido = tipos.find((t) => t.id === id);
    if (!elegido) return;
    // Cambiar de tipo reinicia la tarifa común y los ajustes individuales.
    actualizar({ tipoTareaId: id, tarifaComun: montoEditable(elegido.tarifaSugerida), ajustes: {} });
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Nueva actividad', headerRight: () => <Texto variante="suave">1 de 3</Texto> }} />
      <Pantalla
        pie={
          <BotonGrande
            titulo="Siguiente"
            desactivado={!tipo}
            onPress={() => router.push('/actividad/nueva/trabajadores')}
          />
        }
      >
        <CampoFecha valor={borrador.fecha} onCambio={(fecha) => actualizar({ fecha })} />
        <Texto variante="suave">Tipo de tarea</Texto>
        {tipos.length === 0 ? (
          <Texto style={{ marginVertical: 8 }}>Aún no hay tipos de tarea. Toca "+ Otro" para crear el primero.</Texto>
        ) : null}
        <Chips
          opciones={tipos.map((t) => ({
            clave: t.id,
            etiqueta: `${t.nombre} ${formatearMonto(t.tarifaSugerida)}/${nombreUnidad(t.unidad)}`,
          }))}
          seleccionada={borrador.tipoTareaId}
          onSeleccionar={elegirTipo}
          extra={{ etiqueta: '+ Otro', onPress: () => router.push('/tipos-tarea/nuevo') }}
        />
        <CampoTexto
          etiqueta="Descripción (opcional)"
          valor={borrador.descripcion}
          onCambio={(descripcion) => actualizar({ descripcion })}
          placeholder={tipo ? `${tipo.nombre} lote norte` : 'Ej.: Fumigación lote norte'}
        />
      </Pantalla>
    </>
  );
}
