# Prueba manual en celular

**Fecha:** 2026-10-24
**Estado:** Fase 3 del SDLC, incremento 4
**Basado en:** `docs/requisitos.md` v0.4, `docs/diseno/arquitectura.md` §6

Las pruebas automáticas (`npm test`) cubren las reglas, los datos y las pantallas en Node. Esta lista cubre lo que solo se ve en un celular real (R-03). Anotar en cada fila ✅, ❌ y una nota.

**Celular:** marca y modelo ________ · Android ____ · Fecha ________ · Versión de la app ________

## 0. Instalación

| # | Paso | Esperado | Resultado |
|---|---|---|---|
| 0.1 | Copiar `app-release.apk` al celular (cable, WhatsApp o Drive) e instalarlo; permitir "fuentes desconocidas" si lo pide | Se instala "Jornales" con su ícono | |
| 0.2 | Abrir la app | Abre en "A quién debo" con $0,00 | |

## 1. Sin internet (RNF-01)

| # | Paso | Esperado | Resultado |
|---|---|---|---|
| 1.1 | Activar modo avión y hacer los pasos 2 y 3 | Todo funciona igual | |

## 2. Flujo central (RNF-05)

| # | Paso | Esperado | Resultado |
|---|---|---|---|
| 2.1 | Más › Trabajadores: crear 5 trabajadores y un "Tractor" | Aparecen en la lista | |
| 2.2 | Más › Tipos de tarea: "Diario" $20/día y "Tractor" $15/hora | Aparecen con su tarifa | |
| 2.3 | **Cronometrar:** + › Diario › marcar 5 trabajadores › Siguiente › Guardar | **≤ 1 minuto**; tiempo: ____ | |
| 2.4 | Volver a "A quién debo" | Total $100,00; 5 trabajadores de $20,00 | |
| 2.5 | Actividad con el tractor: 3 horas × $15 (RF-19) | El tractor aparece debiendo $45,00 | |
| 2.6 | Pago parcial de $5 a un trabajador (RF-09) | Su saldo baja a $15,00 y el jornal dice PARCIAL | |
| 2.7 | Pago de $50 a ese jornal | Mensaje de error; no se guarda (RF-12) | |
| 2.8 | "Pagar todo" a otro trabajador (RF-11) | Sale de la lista; el total baja | |
| 2.9 | Registrar un gasto de almuerzos asociado a la actividad | Aparece en Gastos y en el detalle de la actividad | |
| 2.10 | Resumen del mes | Mano de obra, categorías y total cuadran con lo registrado | |

## 3. Durabilidad (RNF-04)

| # | Paso | Esperado | Resultado |
|---|---|---|---|
| 3.1 | Registrar un gasto y, apenas tocar Guardar, cerrar la app desde recientes | Al abrir: el gasto está completo o no está; nunca a medias | |
| 3.2 | Reiniciar el celular | Todos los datos siguen ahí | |

## 4. Respaldo (RF-22, RF-25)

| # | Paso | Esperado | Resultado |
|---|---|---|---|
| 4.1 | Más › Respaldo | "Último respaldo: Nunca" | |
| 4.2 | Guardar respaldo ahora › WhatsApp › enviarse a sí mismo | Llega `jornales-respaldo-AAAA-MM-DD.json` | |
| 4.3 | Al volver: "¿Guardaste el respaldo?" › Sí | Explica el recordatorio y Android pide permiso de notificaciones | |
| 4.4 | Aceptar el permiso | "Listo. Te recordaremos…"; muestra la fecha de hoy "(hoy)" | |
| 4.5 | Repetir con Drive y con correo | El archivo queda guardado en cada uno | |

## 5. Restaurar (RF-23)

| # | Paso | Esperado | Resultado |
|---|---|---|---|
| 5.1 | Agregar un trabajador nuevo "Prueba" | Aparece | |
| 5.2 | Restaurar desde archivo › elegir el respaldo de WhatsApp o Drive | Muestra el resumen (trabajadores, actividades, jornales…) y la advertencia | |
| 5.3 | Restaurar | "Datos restaurados."; "Prueba" ya no está; los saldos son los del respaldo | |
| 5.4 | Elegir un archivo cualquiera (una foto o un PDF) | "El archivo no es un respaldo de esta app."; nada cambia | |
| 5.5 | **Otro celular:** instalar la app y restaurar el mismo respaldo | Mismos datos y saldos | |

## 6. Recordatorio (RF-24)

El primer recordatorio sale el día 30 después del último respaldo. Para probarlo sin esperar, adelantar la fecha del celular. Android trata la alarma como inexacta: llega entre las 9:00 y las 10:00, no a las 9:00 en punto.

| # | Paso | Esperado | Resultado |
|---|---|---|---|
| 6.1 | Ajustes › Fecha y hora: desactivar la hora automática y poner la fecha de **30 días después** del último respaldo, 8:59 | Entre las 9:00 y las 10:00 llega "Es hora de guardar el respaldo" | |
| 6.2 | No abrir la app y adelantar un día más | Llega otra vez (se repite) | |
| 6.3 | Expandir el grupo de notificaciones y tocar **un** recordatorio | Abre Más › Respaldo. Tocar el grupo contraído solo abre la app en "A quién debo" (lo hace Android) | |
| 6.4 | Guardar respaldo › Sí; adelantar 1 día | Ya no llega | |
| 6.5 | Volver a la hora automática | — | |

## 7. Uso en campo (RNF-05)

| # | Paso | Esperado | Resultado |
|---|---|---|---|
| 7.1 | Usar la app al sol, con el brillo normal | Montos y botones se leen sin esfuerzo | |
| 7.2 | Tocar botones con el pulgar, sin precisión | No hay toques errados frecuentes | |

## 8. Actualización

| # | Paso | Esperado | Resultado |
|---|---|---|---|
| 8.1 | Instalar encima un APK nuevo (mayor `versionCode`, misma clave) | Se actualiza sin desinstalar y conserva los datos | |

## Resultados en emulador (2026-10-24)

**Emulador:** `Liviano_API_33` (Pixel 4, Android 13) · APK de release 1.0.0 (`versionCode` 1), firmado con la clave propia · zona horaria `America/Guayaquil`. Se recorrió con `adb` (toques por texto de la pantalla). Para la sección 5 se copió el respaldo de la caché de la app a Descargas con `adb root`, porque el emulador no tiene WhatsApp ni cuenta de Google.

| Sección | Resultado | Nota |
|---|---|---|
| 0 | ✅ | Abre en "A quién debo" con $0,00 en menos de 1 s |
| 1 | ✅ | Las secciones 2 y 3 se hicieron en modo avión |
| 2.1–2.2 | ✅ | |
| 2.3 | ✅ | 10 toques; el tiempo hay que medirlo con una persona en el celular |
| 2.4–2.10 | ✅ | Total $100,00 → $145,00 con el tractor; pago parcial → PARCIAL; pago de $50 rechazado ("El pago no puede ser mayor a $15,00."); resumen del mes $157,50 = $145,00 + $12,50 |
| 3.1–3.2 | ✅ | Tras el cierre forzado el gasto quedó completo; tras reiniciar no se perdió nada |
| 4.1, 4.3, 4.4 | ✅ | Se piden explicación y permiso; quedan 31 recordatorios, uno diario a las 9:00, desde el día 30 |
| 4.2, 4.5 | ⏳ | La hoja de compartir abre con `jornales-respaldo-AAAA-MM-DD.json`; el envío queda para el celular |
| 5.1–5.4 | ✅ | Se guarda `copia-antes-de-restaurar.json` con los datos previos |
| 5.5 | ⏳ | Requiere otro celular |
| 6.1–6.5 | ✅ | Abre Respaldo desde la notificación con la app en segundo plano y también cerrada |
| 7 | ⏳ | Celular real |
| 8.1 | ✅ | El APK 1.0.1 (`versionCode` 2) se instaló encima del 1.0.0 sin desinstalar; se conservaron los datos, el último respaldo, los recordatorios y el permiso de notificaciones |

**Observaciones (no son fallas):**
- Con el teclado abierto, el botón Guardar del formulario de trabajador queda tapado; hay que cerrar el teclado para verlo. Revisar en el celular si molesta.
- Si se deja abierta la pantalla de Respaldo y se vuelve días después, sigue diciendo "(hoy)" hasta que se vuelve a entrar.
- El emulador vuelve a la zona GMT al reiniciarse. Si la app arranca en GMT y luego se cambia la zona, sigue usando GMT hasta que se cierra: los recordatorios quedan 5 horas antes. En un celular real la zona no cambia.
