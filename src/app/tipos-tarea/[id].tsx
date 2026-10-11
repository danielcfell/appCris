import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useState } from 'react';
import { crearTipoTarea, desactivarTipoTarea, editarTipoTarea } from '../../casos-uso/tipos-tarea';
import { obtenerTipoTarea, type TipoTarea } from '../../datos/tipos-tarea';
import { montoEditable, parsearMonto } from '../../dominio/dinero';
import { nombreUnidad, UNIDADES, type Unidad } from '../../dominio/jornal';
import {
  BotonGrande,
  CampoMonto,
  CampoTexto,
  Cargando,
  Chips,
  confirmar,
  idDeRuta,
  leerCampo,
  MensajeError,
  Pantalla,
  Tarjeta,
  Texto,
  useAccion,
  useConsulta,
  volver,
} from '../../ui';

/** Nuevo tipo de tarea o edición de uno existente (RF-03). */
export default function FormularioTipoTareaRuta() {
  const id = idDeRuta(useLocalSearchParams<{ id: string }>().id);
  const { datos, error } = useConsulta((db) => (id === null ? Promise.resolve(null) : obtenerTipoTarea(db, id)), [id]);
  return (
    <>
      <Stack.Screen options={{ title: id === null ? 'Nuevo tipo de tarea' : 'Editar tipo de tarea' }} />
      {id !== null && !datos ? <Cargando error={error} /> : <FormularioTipoTarea tipo={datos ?? null} />}
    </>
  );
}

function FormularioTipoTarea({ tipo }: { tipo: TipoTarea | null }) {
  const { ejecutar, error, ocupado } = useAccion();
  const [nombre, setNombre] = useState(tipo?.nombre ?? '');
  const [unidad, setUnidad] = useState<Unidad>(tipo?.unidad ?? 'dia');
  const [tarifa, setTarifa] = useState(tipo ? montoEditable(tipo.tarifaSugerida) : '');
  const [errorTarifa, setErrorTarifa] = useState<string | null>(null);

  const guardar = async () => {
    const t = leerCampo(() => parsearMonto(tarifa));
    setErrorTarifa(t.error);
    if (t.valor === null) return;
    const datos = { nombre, unidad, tarifaSugerida: t.valor };
    const r = await ejecutar((db) =>
      tipo ? editarTipoTarea(db, tipo.id, datos) : crearTipoTarea(db, datos).then(() => undefined),
    );
    if (r) volver('/tipos-tarea');
  };

  const desactivar = async () => {
    if (!tipo) return;
    const ok = await confirmar(
      'Desactivar tipo de tarea',
      `"${tipo.nombre}" ya no se ofrecerá al registrar actividades. Las actividades anteriores no cambian.`,
      { aceptar: 'Desactivar', destructivo: true },
    );
    if (ok && (await ejecutar((db) => desactivarTipoTarea(db, tipo.id)))) volver('/tipos-tarea');
  };

  return (
    <Pantalla
      pie={
        <>
          <BotonGrande titulo="Guardar" onPress={guardar} ocupado={ocupado} />
          {tipo ? <BotonGrande titulo="Desactivar" variante="peligro" onPress={desactivar} desactivado={ocupado} /> : null}
        </>
      }
    >
      <MensajeError mensaje={error} />
      <CampoTexto etiqueta="Nombre" valor={nombre} onCambio={setNombre} placeholder="Ej.: Fumigación" autoFocus={!tipo} />
      <Texto variante="suave">Se cobra por</Texto>
      <Chips
        opciones={UNIDADES.map((u) => ({ clave: u, etiqueta: nombreUnidad(u) }))}
        seleccionada={unidad}
        onSeleccionar={setUnidad}
      />
      <CampoMonto
        etiqueta={`Tarifa sugerida por ${nombreUnidad(unidad)}`}
        valor={tarifa}
        onCambio={setTarifa}
        error={errorTarifa}
        placeholder="20,00"
      />
      {tipo ? (
        <Tarjeta>
          {/* RN-04 */}
          <Texto>Cambiar la tarifa no modifica jornales ya registrados.</Texto>
        </Tarjeta>
      ) : null}
    </Pantalla>
  );
}
