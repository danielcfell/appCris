import { useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useState } from 'react';
import { listarTrabajadores, type Trabajador } from '../../datos/trabajadores';
import { BotonFlotante, BotonGrande, Cargando, Fila, Pantalla, Seccion, Texto, useConsulta, Vacio } from '../../ui';

/** Trabajadores activos y, plegados, los inactivos (RF-01, RF-02). El tractor también va aquí (RF-19). */
export default function Trabajadores() {
  const router = useRouter();
  const [verInactivos, setVerInactivos] = useState(false);
  const { datos, error } = useConsulta((db) => listarTrabajadores(db, { incluirInactivos: true }), []);

  const fila = (t: Trabajador) => (
    <Fila key={t.id} onPress={() => router.push(`/trabajadores/${t.id}`)} accessibilityLabel={t.nombre}>
      <Texto variante="grande">{t.nombre}</Texto>
      {t.telefono ? <Texto variante="pequeno">{t.telefono}</Texto> : null}
    </Fila>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Trabajadores' }} />
      {!datos ? (
        <Cargando error={error} />
      ) : (
        <Pantalla
          flotante={
            <BotonFlotante accessibilityLabel="Nuevo trabajador" onPress={() => router.push('/trabajadores/nuevo')} />
          }
        >
          {datos.filter((t) => t.activo).map(fila)}
          {datos.every((t) => !t.activo) ? (
            <Vacio mensaje="Aún no hay trabajadores. Toca + para agregar uno. Un tractor u otro servicio por horas también se agrega aquí." />
          ) : null}
          {datos.some((t) => !t.activo) ? (
            <Seccion titulo="Inactivos">
              <BotonGrande
                compacto
                variante="secundario"
                titulo={verInactivos ? 'Ocultar inactivos' : `Ver inactivos (${datos.filter((t) => !t.activo).length})`}
                onPress={() => setVerInactivos((v) => !v)}
              />
              {verInactivos ? datos.filter((t) => !t.activo).map(fila) : null}
            </Seccion>
          ) : null}
        </Pantalla>
      )}
    </>
  );
}
