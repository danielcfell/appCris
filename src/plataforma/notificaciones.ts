import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

const CANAL = 'respaldo';

/** Muestra las notificaciones aunque la app esté abierta. */
export function configurarNotificaciones(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Android 8+ exige un canal, y Android 13+ lo necesita creado antes de pedir el permiso. */
async function crearCanal(): Promise<void> {
  await Notifications.setNotificationChannelAsync(CANAL, {
    name: 'Recordatorio de respaldo',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export type EstadoPermiso = 'concedido' | 'preguntar' | 'negado';

export async function estadoPermiso(): Promise<EstadoPermiso> {
  const permiso = await Notifications.getPermissionsAsync();
  if (permiso.granted) return 'concedido';
  return permiso.canAskAgain ? 'preguntar' : 'negado';
}

/** Pide el permiso de notificaciones (Android 13+). Devuelve si quedó concedido. */
export async function pedirPermiso(): Promise<boolean> {
  await crearCanal();
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Reemplaza los recordatorios programados por uno en cada instante (RF-24). Solo notificaciones locales. */
export async function programarRecordatorios(instantes: Date[], ruta: string): Promise<void> {
  await crearCanal();
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const instante of instantes) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Es hora de guardar el respaldo',
        body: 'Pasó un mes sin respaldo. Toca aquí para guardarlo por si pierdes o cambias el celular.',
        data: { ruta },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: instante, channelId: CANAL },
    });
  }
}

/** Al tocar una notificación (también si abrió la app desde cerrada), navega a la ruta que trae. */
export function useAbrirDesdeNotificacion(abrir: (ruta: string) => void): void {
  const respuesta = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!respuesta || respuesta.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const ruta = respuesta.notification.request.content.data?.ruta;
    if (typeof ruta !== 'string') return;
    Notifications.clearLastNotificationResponse();
    abrir(ruta);
    // `abrir` cambia en cada render; solo importa una respuesta nueva.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [respuesta]);
}
