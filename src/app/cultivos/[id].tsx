import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useState } from 'react';
import { crearCultivo, desactivarCultivo, editarCultivo, reactivarCultivo } from '../../casos-uso/cultivos';
import { obtenerCultivo, type Cultivo } from '../../datos/cultivos';
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

/** Nuevo cultivo (`/cultivos/nuevo`) o edición de uno existente (RF-26). */
export default function FormularioCultivoRuta() {
  const id = idDeRuta(useLocalSearchParams<{ id: string }>().id);
  const { datos, error } = useConsulta((db) => (id === null ? Promise.resolve(null) : obtenerCultivo(db, id)), [id]);
  return (
    <>
      <Stack.Screen options={{ title: id === null ? 'Nuevo cultivo' : 'Editar cultivo' }} />
      {id !== null && !datos ? (
        <Cargando error={error ?? (datos === null ? 'No se encontró el cultivo.' : null)} />
      ) : (
        <FormularioCultivo cultivo={datos ?? null} />
      )}
    </>
  );
}

function FormularioCultivo({ cultivo }: { cultivo: Cultivo | null }) {
  const { ejecutar, error, ocupado } = useAccion();
  const [nombre, setNombre] = useState(cultivo?.nombre ?? '');

  const guardar = async () => {
    const r = await ejecutar((db) =>
      cultivo ? editarCultivo(db, cultivo.id, nombre) : crearCultivo(db, nombre).then(() => undefined),
    );
    if (r) volver('/cultivos');
  };

  const cambiarActivo = async () => {
    if (!cultivo) return;
    if (cultivo.activo) {
      const ok = await confirmar(
        'Cerrar cultivo',
        `"${cultivo.nombre}" ya no aparecerá al registrar actividades ni gastos. Sus cuentas y su historial se conservan.`,
        { aceptar: 'Cerrar cultivo', destructivo: true },
      );
      if (!ok) return;
    }
    const r = await ejecutar((db) => (cultivo.activo ? desactivarCultivo(db, cultivo.id) : reactivarCultivo(db, cultivo.id)));
    if (r) volver('/cultivos');
  };

  return (
    <Pantalla
      pie={
        <>
          <BotonGrande titulo="Guardar" onPress={guardar} ocupado={ocupado} />
          {cultivo ? (
            <BotonGrande
              titulo={cultivo.activo ? 'Cerrar cultivo' : 'Reabrir cultivo'}
              variante={cultivo.activo ? 'peligro' : 'secundario'}
              onPress={cambiarActivo}
              desactivado={ocupado}
            />
          ) : null}
        </>
      }
    >
      <MensajeError mensaje={error} />
      {cultivo && !cultivo.activo ? (
        <Texto variante="suave" style={{ marginBottom: 16 }}>
          Este cultivo está cerrado: no aparece al registrar actividades ni gastos.
        </Texto>
      ) : null}
      <CampoTexto
        etiqueta="Nombre"
        valor={nombre}
        onCambio={setNombre}
        autoFocus={!cultivo}
        autoCapitalize="words"
        placeholder="Ej.: Papas 2026"
      />
    </Pantalla>
  );
}
