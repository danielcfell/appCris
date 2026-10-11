import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useState } from 'react';
import { crearTrabajador, desactivarTrabajador, editarTrabajador, reactivarTrabajador } from '../../casos-uso/trabajadores';
import { obtenerTrabajador, type Trabajador } from '../../datos/trabajadores';
import {
  BotonGrande,
  CampoTexto,
  Cargando,
  confirmar,
  idDeRuta,
  MensajeError,
  Pantalla,
  Texto,
  useAccion,
  useConsulta,
  volver,
} from '../../ui';

/** Nuevo trabajador (`/trabajadores/nuevo`) o edición de uno existente (RF-01). */
export default function FormularioTrabajadorRuta() {
  const id = idDeRuta(useLocalSearchParams<{ id: string }>().id);
  const { datos, error } = useConsulta((db) => (id === null ? Promise.resolve(null) : obtenerTrabajador(db, id)), [id]);
  const titulo = id === null ? 'Nuevo trabajador' : 'Editar trabajador';
  return (
    <>
      <Stack.Screen options={{ title: titulo }} />
      {id !== null && !datos ? <Cargando error={error} /> : <FormularioTrabajador trabajador={datos ?? null} />}
    </>
  );
}

function FormularioTrabajador({ trabajador }: { trabajador: Trabajador | null }) {
  const { ejecutar, error, ocupado } = useAccion();
  const [nombre, setNombre] = useState(trabajador?.nombre ?? '');
  const [telefono, setTelefono] = useState(trabajador?.telefono ?? '');

  const guardar = async () => {
    const datos = { nombre, telefono };
    const r = await ejecutar((db) =>
      trabajador ? editarTrabajador(db, trabajador.id, datos) : crearTrabajador(db, datos).then(() => undefined),
    );
    if (r) volver('/trabajadores');
  };

  const cambiarActivo = async () => {
    if (!trabajador) return;
    if (trabajador.activo) {
      const ok = await confirmar(
        'Desactivar trabajador',
        `${trabajador.nombre} ya no aparecerá al registrar actividades. Su historial y lo que se le debe se conservan.`,
        { aceptar: 'Desactivar', destructivo: true },
      );
      if (!ok) return;
    }
    const r = await ejecutar((db) =>
      trabajador.activo ? desactivarTrabajador(db, trabajador.id) : reactivarTrabajador(db, trabajador.id),
    );
    if (r) volver('/trabajadores');
  };

  return (
    <Pantalla
      pie={
        <>
          <BotonGrande titulo="Guardar" onPress={guardar} ocupado={ocupado} />
          {trabajador ? (
            <BotonGrande
              titulo={trabajador.activo ? 'Desactivar' : 'Reactivar'}
              variante={trabajador.activo ? 'peligro' : 'secundario'}
              onPress={cambiarActivo}
              desactivado={ocupado}
            />
          ) : null}
        </>
      }
    >
      <MensajeError mensaje={error} />
      {trabajador && !trabajador.activo ? (
        <Texto variante="suave" style={{ marginBottom: 16 }}>
          Este trabajador está inactivo: no aparece al registrar actividades.
        </Texto>
      ) : null}
      <CampoTexto etiqueta="Nombre" valor={nombre} onCambio={setNombre} autoFocus={!trabajador} autoCapitalize="words" />
      <CampoTexto etiqueta="Teléfono (opcional)" valor={telefono} onCambio={setTelefono} keyboardType="phone-pad" />
    </Pantalla>
  );
}
