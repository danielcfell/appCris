import { useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useEffect } from 'react';
import { listarCultivos } from '../../../datos/cultivos';
import { listarTiposTarea } from '../../../datos/tipos-tarea';
import { formatearMonto, montoEditable } from '../../../dominio/dinero';
import { nombreUnidad } from '../../../dominio/jornal';
import {
  BotonGrande,
  CampoFecha,
  CampoTexto,
  Cargando,
  Chips,
  cultivoInicial,
  Pantalla,
  SelectorDeCultivo,
  Texto,
  useConsulta,
  useDatos,
} from '../../../ui';
import { useBorradorActividad } from '../../../ui/borrador-actividad';

/**
 * Paso 1: qué se hizo y en qué cultivo (RF-05, RF-27). La tarifa sugerida del tipo prellena el paso 2 (RF-04);
 * el cultivo que se estaba viendo prellena el cultivo (RF-28).
 */
export default function PasoQue() {
  const router = useRouter();
  const { borrador, actualizar } = useBorradorActividad();
  const { filtroCultivo } = useDatos();
  const { datos, error } = useConsulta(
    async (db) => ({
      tipos: await listarTiposTarea(db),
      cultivos: await listarCultivos(db, { incluirInactivos: true }),
    }),
    [],
  );
  const cultivos = datos?.cultivos;

  useEffect(() => {
    if (!cultivos || borrador.cultivoId !== null) return;
    const inicial = cultivoInicial(cultivos, filtroCultivo);
    if (inicial !== null) actualizar({ cultivoId: inicial });
  }, [cultivos, filtroCultivo, borrador.cultivoId, actualizar]);

  if (!datos) return <Cargando error={error} />;
  const { tipos } = datos;
  const tipo = tipos.find((t) => t.id === borrador.tipoTareaId);
  // Con cultivos en el catálogo, la actividad debe llevar uno (RF-27).
  const faltaCultivo = datos.cultivos.length > 0 && borrador.cultivoId === null;

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
            desactivado={!tipo || faltaCultivo}
            onPress={() => router.push('/actividad/nueva/trabajadores')}
          />
        }
      >
        <CampoFecha valor={borrador.fecha} onCambio={(fecha) => actualizar({ fecha })} />
        {datos.cultivos.length > 0 ? (
          <>
            <Texto variante="suave">Cultivo</Texto>
            <SelectorDeCultivo
              cultivos={datos.cultivos}
              valor={borrador.cultivoId}
              onCambio={(cultivoId) => actualizar({ cultivoId })}
            />
          </>
        ) : null}
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
          placeholder={tipo ? `${tipo.nombre} de la mañana` : 'Ej.: Fumigación de la mañana'}
        />
      </Pantalla>
    </>
  );
}
