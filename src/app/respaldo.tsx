import { Stack } from 'expo-router/stack';
import { useState } from 'react';
import { View } from 'react-native';
import { generarRespaldo, leerRespaldo, marcarRespaldoGuardado, restaurarRespaldo } from '../casos-uso/respaldo';
import { leerConfig } from '../datos/config';
import { describirUltimoRespaldo, nombreArchivoRespaldo, resumenRespaldo } from '../dominio/respaldo';
import { compartirArchivo, elegirArchivo, guardarArchivoLocal } from '../plataforma/archivos';
import { estadoPermiso, pedirPermiso } from '../plataforma/notificaciones';
import { reprogramarRecordatorios } from '../plataforma/recordatorio';
import {
  BotonGrande,
  Cargando,
  confirmar,
  medidas,
  MensajeError,
  Pantalla,
  Tarjeta,
  Texto,
  useAccion,
  useConsulta,
} from '../ui';

/** Copia de los datos tal como estaban antes de la última restauración; queda solo en el celular (arquitectura §4). */
const COPIA_ANTES_DE_RESTAURAR = 'copia-antes-de-restaurar.json';

/** Más › Respaldo: guardar, restaurar y fecha del último respaldo (RF-22 a RF-25). */
export default function Respaldo() {
  const { datos: ultimo, error } = useConsulta((db) => leerConfig(db, 'ultimo_respaldo_en'), []);
  const { ejecutar, error: errorAccion, ocupado } = useAccion();
  const [aviso, setAviso] = useState<string | null>(null);

  if (ultimo === undefined) return <Cargando error={error} />;
  const descripcion = ultimo ? describirUltimoRespaldo(ultimo, new Date()) : null;

  const guardar = async () => {
    setAviso(null);
    const compartido = await ejecutar(async (db) => {
      const ahora = new Date();
      await compartirArchivo(nombreArchivoRespaldo(ahora), JSON.stringify(await generarRespaldo(db, ahora)));
    });
    if (!compartido) return;
    // Android no avisa si el envío se completó: se le pregunta al usuario.
    const guardado = await confirmar(
      '¿Guardaste el respaldo?',
      'Responde "Sí" solo si lo enviaste o lo guardaste (WhatsApp, Drive o correo).',
      { aceptar: 'Sí', cancelar: 'No' },
    );
    if (!guardado) return;
    const hecho = await ejecutar(async (db) => {
      await marcarRespaldoGuardado(db, new Date());
      if ((await estadoPermiso()) === 'preguntar') {
        const seguir = await confirmar(
          'Recordatorio mensual',
          'Para recordarte el próximo respaldo, la app necesita mostrar notificaciones. A continuación Android te pedirá permiso.',
          { aceptar: 'Continuar', cancelar: 'Ahora no' },
        );
        if (seguir) await pedirPermiso();
      }
      await reprogramarRecordatorios(db);
      return estadoPermiso();
    });
    if (hecho) {
      setAviso(
        hecho.valor === 'concedido'
          ? 'Listo. Te recordaremos el próximo respaldo en 30 días.'
          : 'Listo. Las notificaciones están desactivadas: actívalas en los ajustes de Android para recibir el recordatorio.',
      );
    }
  };

  const restaurar = async () => {
    setAviso(null);
    const leido = await ejecutar(async (db) => {
      const texto = await elegirArchivo();
      return texto === null ? null : leerRespaldo(db, texto);
    });
    const respaldo = leido?.valor;
    if (!respaldo) return;
    const seguir = await confirmar(
      'Restaurar respaldo',
      `${resumenRespaldo(respaldo)}\n\nEsto reemplaza todos los datos que hay ahora en la app.`,
      { aceptar: 'Restaurar', destructivo: true },
    );
    if (!seguir) return;
    const hecho = await ejecutar(async (db) => {
      guardarArchivoLocal(COPIA_ANTES_DE_RESTAURAR, JSON.stringify(await generarRespaldo(db, new Date())));
      await restaurarRespaldo(db, respaldo);
    });
    if (hecho) setAviso('Datos restaurados.');
  };

  return (
    <Pantalla>
      <Stack.Screen options={{ title: 'Respaldo' }} />
      <Tarjeta>
        <Texto variante="seccion">ÚLTIMO RESPALDO</Texto>
        <Texto variante="grande">{descripcion ? descripcion.fecha : 'Nunca'}</Texto>
        {descripcion ? <Texto variante="suave">({descripcion.hace})</Texto> : null}
      </Tarjeta>
      <MensajeError mensaje={errorAccion} />
      <View style={{ gap: medidas.espacio }}>
        {aviso ? <Texto variante="grande">{aviso}</Texto> : null}
        <View style={{ gap: 4 }}>
          <BotonGrande titulo="Guardar respaldo ahora" onPress={guardar} ocupado={ocupado} />
          <Texto variante="suave">Se abre para enviarlo por WhatsApp, Drive o correo.</Texto>
        </View>
        <BotonGrande titulo="Restaurar desde archivo" variante="secundario" onPress={restaurar} desactivado={ocupado} />
      </View>
    </Pantalla>
  );
}
