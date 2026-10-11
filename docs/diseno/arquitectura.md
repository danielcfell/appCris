# Arquitectura y estrategia de pruebas

**Versión:** 0.1 (borrador)
**Fecha:** 2026-10-10
**Estado:** Fase 2 del SDLC (Diseño)
**Basado en:** `docs/requisitos.md` v0.4

---

## 1. Stack

| Necesidad | Elección | Requisitos |
|---|---|---|
| Plataforma | React Native con **Expo** (SDK estable vigente, versión fijada en `package.json`), Android | RNF-06 |
| Lenguaje | **TypeScript** en modo `strict` | RNF-08 |
| Navegación | `expo-router` (rutas por archivos, pestañas inferiores) | RNF-05 |
| Persistencia | `expo-sqlite` (SQLite en el dispositivo) | RNF-01, RNF-03, RNF-04 |
| Exportar respaldo | `expo-file-system` + `expo-sharing` (hoja nativa: WhatsApp, Drive, correo) | RF-22 |
| Restaurar respaldo | `expo-document-picker` | RF-23 |
| Recordatorio | `expo-notifications` (solo notificaciones locales) | RF-24 |
| Pruebas | Jest, `better-sqlite3` (integración en Node), React Native Testing Library | RNF-08 |

No hay backend, cuentas ni llamadas de red. La app no pide el permiso de internet para ninguna función propia (RNF-01, RNF-09).

## 2. Capas

```
app/            Rutas de expo-router (pantallas)
src/ui/         Componentes visuales reutilizables
   │  llama a
   ▼
src/casos-uso/  Operaciones de negocio (una función por acción del usuario)
   │  usa
   ▼
src/dominio/    Reglas puras: dinero, montos, saldos, estados, validaciones
src/datos/      Esquema, migraciones, repositorios, adaptadores de SQLite
```

Las dependencias van solo hacia abajo. `src/dominio/` no importa React, Expo ni SQLite, y por eso sus pruebas corren en Node sin emulador.

### 2.1 `src/dominio/`

- `dinero.ts`: tipo `Centavos` (entero), `parsearMonto("20,50") → 2050` (acepta coma o punto decimal), `formatearMonto(123450) → "$1.234,50"`. Se rechazan negativos y más de dos decimales. El formato se arma a mano en vez de usar `Intl`, porque `Intl` da resultados distintos en Hermes (celular) y en Node (pruebas).
- `fecha.ts`: validación de fechas `AAAA-MM-DD` y fecha local de un instante.
- `jornal.ts`: `calcularMonto(cantidadCentesimas, tarifaCentavos)`, `calcularSaldo(monto, pagos)`, `estadoJornal(monto, pagado)` → `'pendiente' | 'parcial' | 'pagado'`.
- `pago.ts`: `validarPago(saldo, montoPago)`. Lanza `PagoExcedeSaldo` o `MontoInvalido`.
- `errores.ts`: errores de dominio con mensaje en español listo para mostrar.

### 2.2 `src/datos/`

- `base-datos.ts`: la interfaz `BaseDatos` (`ejecutar`, `consultar`, `consultarUno`, `ejecutarScript`, `transaccion`) y su única implementación, `BaseDatosSqlite`. Esta trabaja sobre **una sola conexión** y pasa todas las operaciones por una cola, así una transacción (`BEGIN IMMEDIATE` / `COMMIT` / `ROLLBACK`) nunca se mezcla con otra operación asíncrona. Dentro de `transaccion(fn)` hay que usar solo el `tx` que recibe `fn`.
  - Cada motor solo aporta una `ConexionSql` mínima: `adaptador-expo.ts` (celular) y `adaptador-node.ts` (pruebas, `better-sqlite3`). Así las pruebas ejercitan exactamente la misma lógica de transacciones que el celular.
  - **No se usa `withExclusiveTransactionAsync` de expo-sqlite**: abre una conexión nueva, donde `PRAGMA foreign_keys` queda desactivado, y empieza con un `BEGIN` diferido.
- `migraciones.ts`: lista ordenada de migraciones SQL. Se aplican al abrir la base según `PRAGMA user_version`, cada una en su propia transacción. Las migraciones solo agregan; nunca editan una migración ya publicada.
- Repositorios (`trabajadores.ts`, `actividades.ts`, `jornales.ts`, `pagos.ts`, `gastos.ts`, `resumenes.ts`, `config.ts`): SQL explícito, sin ORM.
- Al abrir la conexión: `PRAGMA foreign_keys = ON`, `PRAGMA journal_mode = WAL`, `PRAGMA synchronous = FULL`. `FULL` garantiza que una operación confirmada sobrevive a un corte de batería (RNF-04).

### 2.3 `src/casos-uso/`

Cada acción del usuario que escribe datos es una función que valida con el dominio y escribe dentro de **una** transacción (RNF-03):

| Caso de uso | Qué hace | Requisitos |
|---|---|---|
| `crearActividadConJornales` | Inserta la actividad y N jornales con cantidad y tarifa comunes o individuales. Sin descripción, usa el nombre del tipo de tarea | RF-05, RF-06, RF-07 |
| `agregarJornales` | Agrega trabajadores a una actividad ya registrada | RF-06 |
| `eliminarActividad` | Solo si la actividad no tiene jornales ni gastos | — |
| `editarJornal` / `eliminarJornal` | Edita cantidad o tarifa, o elimina; si tiene pagos, la UI pide confirmación antes | RF-08 |
| `registrarPago` | Valida contra el saldo actual y lo inserta | RF-09, RF-12 |
| `pagarPendientesDeTrabajador` / `pagarPendientesDeActividad` | Un pago por cada jornal con saldo, por el saldo exacto | RF-11 |
| `registrarGasto` | Con categoría y actividad opcional | RF-16 a RF-18 |
| `desactivarTrabajador` | Marca `activo = 0` | RF-01, RF-02, RN-05 |
| `exportarRespaldo` / `restaurarRespaldo` | Ver §4 | RF-22 a RF-25 |

### 2.4 Interfaz y actualización de datos

No se usa una librería de estado global. Un contexto `DatosContext` expone un contador `version` que cada caso de uso incrementa al confirmar su transacción. Las pantallas vuelven a consultar cuando cambia `version`, así "A quién debo" y los saldos se actualizan al instante (RF-15).

## 3. Modelo de datos

Convenciones:
- Los importes son `INTEGER` en centavos (RNF-02).
- Las cantidades son `INTEGER` en centésimas: 1 día = `100`, 1,5 horas = `150`.
- Las fechas son `TEXT` `YYYY-MM-DD` en hora local, y las marcas de tiempo son `TEXT` ISO-8601.

```sql
CREATE TABLE trabajador (
  id        INTEGER PRIMARY KEY,
  nombre    TEXT    NOT NULL,
  telefono  TEXT,
  activo    INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
  creado_en TEXT    NOT NULL
);

CREATE TABLE tipo_tarea (
  id                        INTEGER PRIMARY KEY,
  nombre                    TEXT    NOT NULL,
  unidad                    TEXT    NOT NULL CHECK (unidad IN ('dia', 'tarea', 'hora')),
  tarifa_sugerida_centavos  INTEGER NOT NULL CHECK (tarifa_sugerida_centavos >= 0),
  activo                    INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1))
);

CREATE TABLE actividad (
  id            INTEGER PRIMARY KEY,
  fecha         TEXT    NOT NULL,
  descripcion   TEXT    NOT NULL,
  tipo_tarea_id INTEGER NOT NULL REFERENCES tipo_tarea(id) ON DELETE RESTRICT,
  creado_en     TEXT    NOT NULL
);

CREATE TABLE jornal (
  id                  INTEGER PRIMARY KEY,
  actividad_id        INTEGER NOT NULL REFERENCES actividad(id)  ON DELETE RESTRICT,
  trabajador_id       INTEGER NOT NULL REFERENCES trabajador(id) ON DELETE RESTRICT,
  unidad              TEXT    NOT NULL CHECK (unidad IN ('dia', 'tarea', 'hora')),
  cantidad_centesimas INTEGER NOT NULL CHECK (cantidad_centesimas > 0),
  tarifa_centavos     INTEGER NOT NULL CHECK (tarifa_centavos > 0),
  monto_centavos      INTEGER NOT NULL
    CHECK (monto_centavos > 0 AND monto_centavos = (cantidad_centesimas * tarifa_centavos + 50) / 100),
  creado_en           TEXT    NOT NULL,
  UNIQUE (actividad_id, trabajador_id)
);

CREATE TABLE pago (
  id             INTEGER PRIMARY KEY,
  jornal_id      INTEGER NOT NULL REFERENCES jornal(id) ON DELETE CASCADE,
  fecha          TEXT    NOT NULL,
  monto_centavos INTEGER NOT NULL CHECK (monto_centavos > 0),
  creado_en      TEXT    NOT NULL
);

CREATE TABLE categoria_gasto (
  id     INTEGER PRIMARY KEY,
  nombre TEXT    NOT NULL UNIQUE,
  activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1))
);
-- Semilla: materiales, almuerzos, alquiler de maquinaria, otros (RF-17)

CREATE TABLE gasto (
  id             INTEGER PRIMARY KEY,
  fecha          TEXT    NOT NULL,
  monto_centavos INTEGER NOT NULL CHECK (monto_centavos > 0),
  categoria_id   INTEGER NOT NULL REFERENCES categoria_gasto(id) ON DELETE RESTRICT,
  actividad_id   INTEGER REFERENCES actividad(id) ON DELETE RESTRICT,
  nota           TEXT,
  creado_en      TEXT    NOT NULL
);

CREATE TABLE config (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
-- Claves: ultimo_respaldo_en, instalado_en

CREATE VIEW v_jornal_saldo AS
SELECT j.*,
       COALESCE(SUM(p.monto_centavos), 0)                    AS pagado_centavos,
       j.monto_centavos - COALESCE(SUM(p.monto_centavos), 0) AS saldo_centavos
FROM jornal j LEFT JOIN pago p ON p.jornal_id = j.id
GROUP BY j.id;

CREATE INDEX ix_jornal_trabajador ON jornal(trabajador_id);
CREATE INDEX ix_jornal_actividad  ON jornal(actividad_id);
CREATE INDEX ix_pago_jornal       ON pago(jornal_id);
CREATE INDEX ix_actividad_fecha   ON actividad(fecha);
CREATE INDEX ix_gasto_fecha       ON gasto(fecha);
```

**Disparadores de respaldo de RN-02.** El dominio valida primero, pero la base también rechaza un saldo negativo:
- `BEFORE INSERT ON pago`: aborta si `pagado + NEW.monto_centavos > monto del jornal`.
- `BEFORE UPDATE OF monto_centavos ON jornal`: aborta si el nuevo monto es menor que lo ya pagado.

**Decisiones del modelo:**
- **RN-04.** El jornal copia `unidad` y `tarifa_centavos` al crearse. Cambiar `tipo_tarea.tarifa_sugerida_centavos` no lo afecta.
- **RF-07 / RF-06.** El monto siempre es `cantidad × tarifa`, con redondeo half-up al centavo, y el `CHECK` lo garantiza. "Ajustar un monto individual" (RF-06) significa cambiar la cantidad o la tarifa de ese jornal. Por ejemplo, para pagar $25 en vez de $20 por un día se cambia la tarifa a $25.
- **RN-01 / RF-10.** El estado no se guarda. Se deriva de `saldo_centavos` en `v_jornal_saldo`: `pagado = 0` → pendiente; `0 < pagado < monto` → parcial; `pagado = monto` → pagado.
- **RF-08.** Eliminar un jornal con pagos borra también sus pagos (`ON DELETE CASCADE`) en la misma transacción, después de que el usuario confirma.
- **RN-05.** No existe ruta para borrar un trabajador con jornales; `ON DELETE RESTRICT` lo impide también en la base.
- **Actividad.** Una actividad solo puede eliminarse si no tiene jornales ni gastos.
- **Un trabajador aparece una sola vez por actividad** (`UNIQUE`). Si trabajó más, se aumenta la cantidad.

**Extensibilidad (RNF-07).** Ninguno de estos cambios modifica tablas existentes ni reescribe consultas:
- Terreno/cultivo: migración que crea `terreno` y agrega `terreno_id INTEGER REFERENCES terreno(id)` nullable a `actividad` y `gasto`. Los datos existentes quedan con `NULL` ("sin terreno").
- Ingresos: tabla nueva `ingreso` (fecha, monto, nota, `terreno_id` opcional). Los resúmenes agregan una sección.

## 4. Respaldo y restauración

**Formato:** archivo JSON `jornales-respaldo-AAAA-MM-DD.json`:

```json
{
  "formato": "appcris-respaldo",
  "version_formato": 1,
  "version_esquema": 1,
  "creado_en": "2026-10-10T18:30:00-05:00",
  "tablas": { "trabajador": [ ... ], "tipo_tarea": [ ... ], "actividad": [ ... ],
              "jornal": [ ... ], "pago": [ ... ], "categoria_gasto": [ ... ], "gasto": [ ... ] }
}
```

**Exportar (RF-22):**
1. Leer todas las tablas en una transacción de lectura.
2. Escribir el archivo en la caché de la app.
3. Abrir la hoja nativa de compartir.
4. Al volver, preguntar "¿Guardaste el respaldo?". Android no informa si el usuario completó el envío. Con **Sí** se guarda `config.ultimo_respaldo_en` y se reprograman los recordatorios.

**Restaurar (RF-23):**
1. Elegir el archivo.
2. Validar `formato`, `version_formato` y la estructura de cada tabla.
3. Mostrar un resumen ("12 trabajadores, 85 jornales, respaldo del 3 de octubre") y pedir confirmación, avisando que reemplaza los datos actuales.
4. Guardar automáticamente una copia del estado actual en el almacenamiento de la app.
5. En una sola transacción: vaciar las tablas, insertar todo y aplicar las migraciones si `version_esquema` es menor que la actual.

Si algo falla, no cambia nada.

**Recordatorio (RF-24, RF-25):**
- **Solo notificación local** (requisitos v0.4): no hay aviso dentro de la app; al cliente le resulta molesto.
- Al guardar un respaldo se cancelan las notificaciones previas y se programan notificaciones con fecha para los días 30 a 60 desde `ultimo_respaldo_en` (una diaria). Así "se repite hasta que guarde" aunque la app no se abra. Al abrir la app también se reprograman, por si el sistema las descartó.
- Si nunca hubo respaldo, se cuenta desde la primera vez que se abrió la app (clave `instalado_en` en `config`, que se guarda en esa primera apertura).
- Tocar la notificación abre la pantalla Más › Respaldo.
- Android 13 o superior requiere el permiso `POST_NOTIFICATIONS`. Se pide la primera vez que se guarda un respaldo, con una explicación previa.
- La pantalla de respaldo muestra la fecha del último respaldo (RF-25).

## 5. Estructura de carpetas prevista

```
src/app/                rutas de expo-router (convención de Expo SDK 57): (tabs)/debo, actividades, gastos,
                        resumen, mas; rutas de detalle y formularios
src/dominio/            dinero.ts, fecha.ts, jornal.ts, pago.ts, errores.ts (+ *.test.ts)
src/datos/              base-datos.ts, adaptador-expo.ts, adaptador-node.ts, migraciones.ts, repositorios
src/casos-uso/          casos de uso por entidad (+ *.test.ts de integración, datos-de-prueba.ts)
src/ui/                 componentes (BotonGrande, CampoMonto, JornalFila...), tema, DatosContext,
                        borrador del asistente de nueva actividad
src/pruebas-ui/         pruebas de pantallas (renderRouter sobre la base en memoria)
docs/                   requisitos, diseño, adr
```

## 6. Estrategia de pruebas (RNF-08)

| Nivel | Herramienta | Qué cubre | Dónde corre |
|---|---|---|---|
| Unitarias | Jest | `src/dominio/`: RN-01 a RN-05, cálculo de montos con redondeo (0,5 h × $15 = $7,50; 1/3 de día), parseo de dinero ("20", "20,5", "20,50", "-1", "20,505"), estados, pago excedido | Node |
| Integración | Jest + `better-sqlite3` | Migraciones desde cero; repositorios; casos de uso; atomicidad (un jornal inválido en una actividad de 5 no deja nada guardado); disparadores de RN-02; "pagar todo"; resúmenes por período; ida y vuelta exportar → restaurar con datos idénticos | Node |
| UI | React Native Testing Library (`jest-expo`) + `renderRouter` de expo-router | Nueva actividad con 5 trabajadores (10 toques, flujo 4.1); registrar pago parcial y ver el estado cambiar; el pago excedido muestra un error; catálogos, actividades, gastos y resumen | Node |
| Manual | Celular Android real | Instalación, uso sin internet, cierre forzado durante un guardado (RNF-04), llegada de la notificación, compartir por WhatsApp/Drive, restaurar en otro celular, lectura con luz solar | Dispositivo (R-03) |

**Reglas:**
- Toda regla RN tiene al menos una prueba cuyo nombre cita su ID, por ejemplo `test('RN-02: el saldo nunca es negativo', ...)`.
- Las pruebas de integración usan una base en memoria nueva por prueba, creada con las mismas migraciones de producción.

**Comandos:**
- `npm test` corre todo.
- `npx jest src/dominio/jornal.test.ts -t "RN-02"` corre una sola prueba.
- `npm run typecheck` revisa los tipos.

## 7. Confirmado con el cliente (2026-10-10)

- **Formato de dinero.** Coma decimal: `$20,50` (`es-EC`).
- **Ajustar un monto individual.** Se hace cambiando la tarifa o la cantidad de ese trabajador (ver §3).

## 8. Trazabilidad

| Requisito | Dónde se resuelve |
|---|---|
| RF-01, RF-02, RN-05 | `trabajador.activo`, `ON DELETE RESTRICT`, `desactivarTrabajador` |
| RF-03, RF-04 | `tipo_tarea`; la tarifa sugerida solo prellena el formulario |
| RF-05 a RF-07 | `crearActividadConJornales`, `CHECK` del monto |
| RF-08 | `editarJornal`/`eliminarJornal`, `CASCADE` de pagos, disparador de actualización |
| RF-09 a RF-12, RN-01 a RN-03 | `registrarPago`, `pagarPendientes*`, `v_jornal_saldo`, disparadores |
| RF-13 a RF-15 | Consultas sobre `v_jornal_saldo`, `DatosContext.version` |
| RF-16 a RF-19 | `gasto`, `categoria_gasto`, `actividad_id` opcional; el tractor es un `trabajador` |
| RF-20, RF-21 | Repositorio `resumenes.ts` |
| RF-22 a RF-25 | §4 |
| RN-04 | Copia de unidad y tarifa en `jornal` |
| RNF-01, RNF-09 | Sin red; SQLite local |
| RNF-02 | Centavos y centésimas enteros, `dinero.ts` |
| RNF-03 | `BaseDatos.transaccion`, un caso de uso = una transacción |
| RNF-04 | `synchronous = FULL`, WAL, respaldo |
| RNF-05 | Ver `pantallas.md` |
| RNF-06 | Expo, Android, español |
| RNF-07 | §3, extensibilidad |
| RNF-08 | §6 |
