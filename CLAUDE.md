# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# App de control de jornales y gastos agrícolas

App móvil Android, offline, para un solo usuario (agricultor).
Controla a quién se le debe, pagos parciales y gastos.

## Documentación
- Requisitos: @docs/requisitos.md
- Arquitectura, modelo de datos y pruebas: @docs/diseno/arquitectura.md
- Pantallas y flujos: docs/diseno/pantallas.md
- Decisiones de arquitectura: docs/adr/

## Reglas del proyecto
- Todo dinero se guarda en centavos (enteros), nunca decimales.
- Idioma de la interfaz y de la documentación: español.
- Antes de implementar, proponer un plan y esperar aprobación.

## Estado del proyecto

Fase 3 del SDLC (implementación), por incrementos. Hecho: incremento 1 (dominio, datos y casos de uso) e incremento 2 (pantallas; Más › Respaldo es un marcador). Siguen: 3 respaldo y notificaciones, 4 prueba en celular y APK. Las preguntas de diseño quedaron confirmadas con el cliente el 2026-10-10.

Stack: **Expo SDK 57 (React Native 0.86) + `expo-sqlite`, TypeScript 6**. Node y Git están instalados de forma portable en `%LOCALAPPDATA%\Programs` y agregados al PATH de usuario.

## Comandos

- `npm test`: todas las pruebas. Proyectos de Jest: `logica` (dominio, datos, casos de uso; Node) y `ui` (pantallas en `src/pruebas-ui/`).
- `npx jest src/dominio/jornal.test.ts -t "RN-02"`: una sola prueba. `npx jest --selectProjects ui`: solo pantallas.
- `npx expo export --platform android --output-dir <carpeta temporal>`: confirma que Metro empaqueta la app (Jest no lo comprueba).
- `npm run typecheck`: `tsc --noEmit`. Correrlo junto con las pruebas antes de dar algo por terminado.
- `npx expo start`: servidor de desarrollo.
- Para agregar paquetes de Expo o React Native usar `npx expo install <paquete>`, no `npm install`: elige la versión compatible con el SDK.

## Arquitectura en breve

Capas `src/app/` (rutas) + `src/ui/` (componentes) → `src/casos-uso/` → `src/dominio/` + `src/datos/`. Detalle en `docs/diseno/arquitectura.md`.

- Las reglas de negocio van en `src/dominio/` (TypeScript puro, sin React ni SQLite).
- Toda escritura que toca varias tablas va en un caso de uso dentro de `db.transaccion(async (tx) => ...)`. Dentro, usar solo `tx`: usar `db` espera a que termine la transacción y la bloquea para siempre.
- `BaseDatosSqlite` es la única implementación de la base. El celular (`adaptador-expo.ts`) y las pruebas (`adaptador-node.ts`, `better-sqlite3`) solo aportan la conexión. No usar `withExclusiveTransactionAsync` de expo-sqlite: abre otra conexión sin claves foráneas.
- Cambios de esquema: agregar una migración nueva al final de `MIGRACIONES` en `src/datos/migraciones.ts`; nunca editar una ya publicada.
- La fórmula del monto (`(cantidad_centesimas × tarifa + 50) / 100`) existe en `dominio/jornal.ts` y en el `CHECK` de la tabla `jornal`; deben coincidir.
- Las pruebas de integración usan `escenario()` de `src/casos-uso/datos-de-prueba.ts` (base en memoria nueva y migrada). Cada prueba de una regla cita su ID en el nombre.
- Pantallas: leen con `useConsulta` y escriben con `useAccion` (`src/ui/datos-context.tsx`), que sube `version` para que todo se vuelva a consultar (RF-15). Sin reglas de negocio en las pantallas: usar las funciones de `src/dominio/`. Prellenar campos con `montoEditable`/`cantidadEditable` (sin separador de miles).
- Pruebas de pantallas: `abrirApp(ruta, escenario)` de `src/pruebas-ui/app-de-prueba.tsx`. En RNTL 14 `fireEvent` y `render` son asíncronos: siempre `await`. Si la prueba navega al final (guardar → volver), esperar la ruta con `waitFor(() => expect(app.getPathname())...)`.

## Expo

- Expo cambia mucho entre versiones: antes de usar una API de Expo o React Native, revisar la documentación de la versión instalada (`https://docs.expo.dev/versions/v57.0.0/`) o los tipos en `node_modules`, no la memoria.
- Las rutas de expo-router van en `src/app/`; el código que no es ruta va fuera de esa carpeta.
- En expo-router 57: `Stack` se importa de `expo-router/stack` y `Tabs` de `expo-router/js-tabs` (no de `expo-router`). Sin rutas tipadas: los `href` son texto.
- `android/` e `ios/` se generan (Continuous Native Generation): no crearlos ni editarlos a mano; configurar en `app.json` y plugins.

Los IDs de requisitos (`RF-xx`, `RN-xx`, `RNF-xx`, `R-xx`, `P-xx`) son referencias estables: citarlos en diseños, comentarios y pruebas. Todo cambio a los requisitos se anota en su §11 (historial de cambios) con un aumento de versión.

## Dominio

Usar los nombres en español en el código y la interfaz: *Trabajador*, *Actividad*, *Jornal*, *TipoTarea*, *Pago*, *Gasto*, *Categoría*. La pantalla central es "A quién debo" (RF-13).

```
Trabajador 1──* Jornal *──1 Actividad      Jornal 1──* Pago
Actividad 1──* Gasto (opcional)            Categoría 1──* Gasto
TipoTarea 1──* Actividad                   (futuro) Terreno 1──* Actividad / Gasto
```

## Invariantes que toda implementación debe respetar

- Monto del jornal = `cantidad × tarifa`. Se fija al crearlo; cambiar después la tarifa sugerida del TipoTarea no altera jornales existentes (RF-07, RN-04).
- Saldo = monto − suma de pagos. Nunca es negativo, y se rechaza un pago mayor al saldo (RN-02, RF-12). El estado (*pendiente* / *parcial* / *pagado*) se deriva del saldo, no se guarda aparte (RF-10).
- Las escrituras que tocan varias tablas son atómicas; por ejemplo, crear una actividad con N jornales se guarda completa o no se guarda (RNF-03).
- Un trabajador con historial se desactiva, nunca se elimina (RN-05, RF-02).
- Un servicio por horas, como un tractor, es un **Trabajador** con jornal por hora, no un gasto (RF-19).
- Offline primero y datos solo en el dispositivo. Lo único que sale del celular es el respaldo que el usuario exporta (RNF-01, RNF-09). Respaldo y restauración van por un archivo compartible, con recordatorio a los 30 días solo como notificación local, sin aviso dentro de la app (RF-22 a RF-25).
- El modelo de datos debe poder incorporar **terreno/cultivo** e **ingresos** sin reescribir lo existente, pero ninguno entra en el MVP (RNF-07, §3.2).
- Las reglas RN-01 a RN-05 y los cálculos de saldos requieren pruebas automatizadas (RNF-08).
- Interfaz para uso en campo: botones grandes, pocos pasos, legible con luz solar. Registrar una actividad con 5 trabajadores debería tomar ~1 minuto o menos (RNF-05).

Fuera del MVP: ingresos, separación por terreno, multiusuario o sincronización, facturación electrónica o reportes al SRI.
