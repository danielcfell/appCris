import { useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useState } from 'react';
import { listarCultivos, type Cultivo } from '../../datos/cultivos';
import { BotonFlotante, BotonGrande, Cargando, Fila, Pantalla, Seccion, Texto, useConsulta, Vacio } from '../../ui';

/** Cultivos abiertos y, plegados, los cerrados (RF-26). Cada cultivo lleva su propia contabilidad. */
export default function Cultivos() {
  const router = useRouter();
  const [verCerrados, setVerCerrados] = useState(false);
  const { datos, error } = useConsulta((db) => listarCultivos(db, { incluirInactivos: true }), []);

  const fila = (c: Cultivo) => (
    <Fila key={c.id} onPress={() => router.push(`/cultivos/${c.id}`)} accessibilityLabel={c.nombre}>
      <Texto variante="grande">{c.nombre}</Texto>
    </Fila>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Cultivos' }} />
      {!datos ? (
        <Cargando error={error} />
      ) : (
        <Pantalla
          flotante={<BotonFlotante accessibilityLabel="Nuevo cultivo" onPress={() => router.push('/cultivos/nuevo')} />}
        >
          {datos.filter((c) => c.activo).map(fila)}
          {datos.every((c) => !c.activo) ? (
            <Vacio mensaje='Aún no hay cultivos abiertos. Toca + para agregar uno, por ejemplo "Papas 2026". Cada cultivo lleva sus cuentas aparte.' />
          ) : null}
          {datos.some((c) => !c.activo) ? (
            <Seccion titulo="Cerrados">
              <BotonGrande
                compacto
                variante="secundario"
                titulo={verCerrados ? 'Ocultar cerrados' : `Ver cerrados (${datos.filter((c) => !c.activo).length})`}
                onPress={() => setVerCerrados((v) => !v)}
              />
              {verCerrados ? datos.filter((c) => !c.activo).map(fila) : null}
            </Seccion>
          ) : null}
        </Pantalla>
      )}
    </>
  );
}
