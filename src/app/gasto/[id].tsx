import { useLocalSearchParams, useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useEffect, useState } from 'react';
import { editarGasto, eliminarGasto, registrarGasto } from '../../casos-uso/gastos';
import { listarActividades, obtenerActividad } from '../../datos/actividades';
import { listarCultivos } from '../../datos/cultivos';
import { listarCategorias, obtenerGasto, type Gasto } from '../../datos/gastos';
import { montoEditable, parsearMonto } from '../../dominio/dinero';
import type { Fecha } from '../../dominio/fecha';
import { formatearFechaCorta, sumarDias } from '../../dominio/periodo';
import {
  BotonGrande,
  CampoFecha,
  CampoMonto,
  CampoTexto,
  Cargando,
  Chips,
  confirmar,
  cultivoInicial,
  hoy,
  idDeRuta,
  leerCampo,
  MensajeError,
  Pantalla,
  SelectorDeCultivo,
  Texto,
  useAccion,
  useConsulta,
  useDatos,
  volver,
} from '../../ui';

const SIN_ACTIVIDAD = 0;

/**
 * Nuevo gasto (`/gasto/nuevo`, opcionalmente `?actividadId=`) o edición de uno existente.
 * Fecha, monto, categoría, cultivo, actividad opcional y nota (RF-16, RF-18). Un gasto ligado a una actividad
 * toma el cultivo de la actividad (RF-27).
 */
export default function FormularioGastoRuta() {
  const params = useLocalSearchParams<{ id: string; actividadId?: string }>();
  const id = idDeRuta(params.id);
  const { datos, error } = useConsulta((db) => (id === null ? Promise.resolve(null) : obtenerGasto(db, id)), [id]);
  return (
    <>
      <Stack.Screen options={{ title: id === null ? 'Nuevo gasto' : 'Editar gasto' }} />
      {id !== null && !datos ? (
        <Cargando error={error ?? (datos === null ? 'No se encontró el gasto.' : null)} />
      ) : (
        <FormularioGasto gasto={datos ?? null} actividadInicial={idDeRuta(params.actividadId)} />
      )}
    </>
  );
}

function FormularioGasto({ gasto, actividadInicial }: { gasto: Gasto | null; actividadInicial: number | null }) {
  const router = useRouter();
  const { ejecutar, error, ocupado } = useAccion();
  const [monto, setMonto] = useState(gasto ? montoEditable(gasto.monto) : '');
  const [errorMonto, setErrorMonto] = useState<string | null>(null);
  const [fecha, setFecha] = useState<Fecha>(gasto?.fecha ?? hoy());
  const [categoriaId, setCategoriaId] = useState<number | null>(gasto?.categoriaId ?? null);
  const [actividadId, setActividadId] = useState<number>(gasto?.actividadId ?? actividadInicial ?? SIN_ACTIVIDAD);
  const [cultivoId, setCultivoId] = useState<number | null>(gasto?.cultivoId ?? null);
  const [nota, setNota] = useState(gasto?.nota ?? '');
  const { filtroCultivo } = useDatos();

  // Se ofrecen las actividades de los 30 días anteriores a la fecha del gasto, más la ya elegida.
  const { datos } = useConsulta(
    async (db) => ({
      categorias: await listarCategorias(db),
      cultivos: await listarCultivos(db, { incluirInactivos: true }),
      actividades: await listarActividades(db, sumarDias(fecha, -30), fecha),
      elegida: actividadId ? await obtenerActividad(db, actividadId) : null,
    }),
    [fecha, actividadId],
  );
  const cultivos = datos?.cultivos;

  // Un gasto nuevo parte del cultivo que se estaba viendo (RF-28).
  useEffect(() => {
    if (gasto || !cultivos || cultivoId !== null) return;
    setCultivoId(cultivoInicial(cultivos, filtroCultivo));
  }, [gasto, cultivos, cultivoId, filtroCultivo]);

  if (!datos) return <Cargando />;

  const { elegida } = datos;
  const actividades =
    elegida && !datos.actividades.some((a) => a.id === elegida.id) ? [elegida, ...datos.actividades] : datos.actividades;
  const cultivoDeActividad = elegida
    ? (datos.cultivos.find((c) => c.id === elegida.cultivoId)?.nombre ?? 'Sin cultivo')
    : null;
  // Con cultivos en el catálogo, un gasto suelto debe llevar uno; uno anterior a los cultivos puede seguir sin él (RF-27).
  const faltaCultivo =
    datos.cultivos.length > 0 && !actividadId && cultivoId === null && !(gasto && gasto.cultivoId === null);

  const guardar = async () => {
    const m = leerCampo(() => parsearMonto(monto));
    setErrorMonto(m.error);
    if (m.valor === null || categoriaId === null) return;
    const datosGasto = {
      fecha,
      monto: m.valor,
      categoriaId,
      actividadId: actividadId || null,
      cultivoId: actividadId ? null : cultivoId,
      nota,
    };
    const r = await ejecutar((db) =>
      gasto ? editarGasto(db, gasto.id, datosGasto) : registrarGasto(db, datosGasto).then(() => undefined),
    );
    if (r) volver('/gastos');
  };

  const borrar = async () => {
    if (!gasto) return;
    if (await confirmar('Eliminar gasto', '¿Eliminar este gasto?', { aceptar: 'Eliminar', destructivo: true })) {
      if (await ejecutar((db) => eliminarGasto(db, gasto.id))) volver('/gastos');
    }
  };

  return (
    <Pantalla
      pie={
        <>
          <BotonGrande titulo="Guardar" onPress={guardar} ocupado={ocupado} desactivado={categoriaId === null || faltaCultivo} />
          {gasto ? <BotonGrande titulo="Eliminar" variante="peligro" onPress={borrar} desactivado={ocupado} /> : null}
        </>
      }
    >
      <MensajeError mensaje={error} />
      <CampoMonto etiqueta="Monto" valor={monto} onCambio={setMonto} error={errorMonto} autoFocus={!gasto} placeholder="0,00" />
      <CampoFecha valor={fecha} onCambio={setFecha} />
      <Texto variante="suave">Categoría</Texto>
      <Chips
        opciones={datos.categorias.map((c) => ({ clave: c.id, etiqueta: c.nombre }))}
        seleccionada={categoriaId}
        onSeleccionar={setCategoriaId}
        extra={{ etiqueta: '+ Otra', onPress: () => router.push('/categorias') }}
      />
      <Texto variante="suave">Actividad (opcional)</Texto>
      <Chips
        opciones={[
          { clave: SIN_ACTIVIDAD, etiqueta: 'Ninguna' },
          ...actividades.map((a) => ({ clave: a.id, etiqueta: `${a.descripcion} ${formatearFechaCorta(a.fecha)}` })),
        ]}
        seleccionada={actividadId}
        onSeleccionar={setActividadId}
      />
      {cultivoDeActividad !== null ? (
        <Texto variante="suave" style={{ marginBottom: 16 }}>
          Cultivo: {cultivoDeActividad} (el de la actividad)
        </Texto>
      ) : datos.cultivos.length > 0 ? (
        <>
          <Texto variante="suave">Cultivo</Texto>
          <SelectorDeCultivo cultivos={datos.cultivos} valor={cultivoId} onCambio={setCultivoId} conservar={gasto?.cultivoId} />
        </>
      ) : null}
      <CampoTexto etiqueta="Nota (opcional)" valor={nota} onCambio={setNota} placeholder="Ej.: 5 almuerzos" />
    </Pantalla>
  );
}
