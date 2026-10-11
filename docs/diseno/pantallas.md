# Pantallas y flujos

**Versión:** 0.1 (borrador para validar con el cliente)
**Fecha:** 2026-10-10
**Estado:** Fase 2 del SDLC (Diseño)
**Basado en:** `docs/requisitos.md` v0.4

---

## 1. Principios para uso en campo (RNF-05)

- Botones de al menos 56 dp de alto y texto base de 18 sp.
- Alto contraste (texto oscuro sobre fondo claro) para leer con sol. No se usa tema oscuro en el MVP.
- Fecha de hoy y tarifa sugerida siempre prellenadas: el caso común no exige escribir.
- Montos con teclado numérico.
- Un botón **+** grande abajo a la derecha para la acción principal de cada pestaña.
- Toda acción destructiva o que reemplaza datos pide confirmación con texto claro.
- Colores de estado: **pendiente** rojo, **parcial** ámbar, **pagado** verde. Siempre van acompañados de la palabra, no solo del color.

## 2. Navegación

Pestañas inferiores:

```
┌──────┬────────────┬────────┬─────────┬──────┐
│ Debo │ Actividades│ Gastos │ Resumen │ Más  │
└──────┴────────────┴────────┴─────────┴──────┘
```

Mapa de pantallas:

```
Debo ──────────── Detalle de trabajador ── Registrar pago (hoja)
Actividades ───── Detalle de actividad ─── Registrar pago (hoja)
   └─ + Nueva actividad (paso 1 → 2 → 3)    └─ Editar jornal
Gastos ────────── + Nuevo gasto / Editar gasto
Resumen
Más ───┬─ Trabajadores ── Nuevo / Editar trabajador
       ├─ Tipos de tarea ── Nuevo / Editar tipo
       ├─ Categorías de gasto
       └─ Respaldo
```

## 3. Pantallas

### 3.1 A quién debo (inicio) — RF-13, RF-15

```
┌─────────────────────────────────┐
│  TOTAL QUE DEBO                 │
│        $ 245,00                 │
├─────────────────────────────────┤
│ Juan Pérez           $ 80,00  › │
│ 4 jornales pendientes           │
├─────────────────────────────────┤
│ Tractor Don Luis     $ 45,00  › │
│ 1 jornal pendiente              │
├─────────────────────────────────┤
│ María Chávez         $ 40,00  › │
│ 1 parcial                       │
│ ...                             │
│                            ( + )│  → Nueva actividad
└─────────────────────────────────┘
```

- Solo muestra trabajadores con saldo mayor que 0, ordenados de mayor a menor saldo.
- No muestra avisos de respaldo: el recordatorio es solo una notificación (RF-24, requisitos v0.4).
- Sin deudas, se muestra el mensaje "No le debes a nadie".

### 3.2 Detalle de trabajador — RF-14, RF-11

```
┌─────────────────────────────────┐
│ ‹  Juan Pérez            ✎      │
│    099 123 4567                 │
├─────────────────────────────────┤
│  LE DEBO   $ 80,00              │
│  [      PAGAR TODO $80,00     ] │
├─────────────────────────────────┤
│ PENDIENTES                      │
│ 08/10 Fumigación lote norte     │
│   1 día × $20,00      $20,00    │
│   PENDIENTE           [ Pagar ] │
│ 05/10 Deshierbe                 │
│   1 día × $20,00 pagó $10,00    │
│   PARCIAL · falta $10,00 [Pagar]│
│ ...                             │
├─────────────────────────────────┤
│ PAGOS REALIZADOS                │
│ 06/10  $10,00  Deshierbe        │
│ 30/09  $40,00  Fumigación       │
└─────────────────────────────────┘
```

- **Pagar todo** confirma con "Registrar pago de $80,00 a Juan Pérez (4 jornales)" y crea un pago por jornal.
- ✎ permite editar nombre y teléfono, o desactivar al trabajador.

### 3.3 Registrar pago (hoja inferior) — RF-09, RF-12

```
┌─────────────────────────────────┐
│ Pago a Juan Pérez               │
│ Deshierbe 05/10 · falta $10,00  │
│                                 │
│ Monto   [      10,00       ]    │
│ Fecha   [  Hoy, 10/10/2026  ]   │
│                                 │
│ [         REGISTRAR PAGO      ] │
└─────────────────────────────────┘
```

- El monto viene prellenado con el saldo (pago total). Se puede bajar para un pago parcial.
- Si el monto supera el saldo, el botón se desactiva y aparece "No puede ser mayor a $10,00".

### 3.4 Nueva actividad (3 pasos) — RF-05, RF-06, RF-07, RF-04

**Paso 1: qué se hizo**

```
┌─────────────────────────────────┐
│ ‹  Nueva actividad      1 de 3  │
│                                 │
│ Fecha  [  Hoy, 10/10/2026  ]    │
│                                 │
│ Tipo de tarea                   │
│ [ Diario $20/día ] [Fumigación] │
│ [ Tractor $15/hora ] [ + Otro ] │
│                                 │
│ Descripción                     │
│ [ Fumigación lote norte      ]  │
│                                 │
│ [          SIGUIENTE          ] │
└─────────────────────────────────┘
```

**Paso 2: quiénes trabajaron**

```
┌─────────────────────────────────┐
│ ‹  Fumigación lote norte 2 de 3 │
│                                 │
│ Para todos:                     │
│ Cantidad [ 1 ] día              │
│ Tarifa   [ 20,00 ]  (sugerida)  │
│                                 │
│ [✓] Juan Pérez                  │
│ [✓] María Chávez                │
│ [✓] Pedro Loor                  │
│ [ ] Tractor Don Luis            │
│ [✓] Rosa Mero                   │
│ [✓] Luis Vera                   │
│ [ + Nuevo trabajador ]          │
│                                 │
│ 5 trabajadores · $100,00        │
│ [          SIGUIENTE          ] │
└─────────────────────────────────┘
```

- Solo aparecen trabajadores activos (RF-02).
- La tarifa sugerida viene del tipo de tarea y se puede cambiar (RF-04).
- "+ Nuevo trabajador" lo crea sin salir del flujo.

**Paso 3: revisar y guardar**

```
┌─────────────────────────────────┐
│ ‹  Revisar               3 de 3 │
│ 10/10 · Fumigación lote norte   │
│                                 │
│ Juan Pérez   1 × $20,00  $20,00 ✎│
│ María Chávez 1 × $20,00  $20,00 ✎│
│ Pedro Loor   1 × $25,00  $25,00 ✎│  ← ajustado
│ Rosa Mero    1 × $20,00  $20,00 ✎│
│ Luis Vera    ½ × $20,00  $10,00 ✎│  ← ajustado
│                                 │
│ TOTAL                  $ 95,00  │
│ [           GUARDAR           ] │
└─────────────────────────────────┘
```

- ✎ cambia la cantidad o la tarifa de un solo trabajador (RF-06). El monto se recalcula.
- **Guardar** crea la actividad y todos los jornales de una vez (RNF-03), y vuelve al detalle de la actividad.

### 3.5 Actividades: lista y detalle — RF-21, RF-08, RF-11

```
Lista                              Detalle
┌─────────────────────────────┐    ┌─────────────────────────────────┐
│ Actividades       [Octubre▾]│    │ ‹ Fumigación lote norte    ✎    │
│ 10/10 Fumigación lote norte │    │   10/10/2026 · Fumigación       │
│   5 trab. · falta $95,00  › │    ├─────────────────────────────────┤
│ 08/10 Deshierbe             │    │ Jornales        $ 95,00         │
│   3 trab. · pagado        › │    │ Gastos          $ 18,00         │
│ ...                         │    │ COSTO TOTAL     $113,00         │
│                        ( + )│    │ Pagado $0,00 · Falta $95,00     │
└─────────────────────────────┘    │ [   PAGAR TODO $95,00    ]      │
                                   ├─────────────────────────────────┤
                                   │ JORNALES                        │
                                   │ Juan Pérez  $20,00 PENDIENTE  ⋮ │
                                   │ ...                             │
                                   │ GASTOS ASOCIADOS                │
                                   │ Almuerzos   $18,00            › │
                                   │ [ + Agregar gasto ]             │
                                   └─────────────────────────────────┘
```

- ⋮ en un jornal ofrece **Pagar**, **Editar** y **Eliminar**.
- Si el jornal tiene pagos, eliminarlo pide confirmación: "Este jornal tiene $10,00 pagados. Si lo eliminas se borran también sus pagos." (RF-08).
- No se puede bajar el monto por debajo de lo ya pagado.
- "+ Agregar gasto" abre Nuevo gasto con la actividad ya elegida (RF-18).

### 3.6 Gastos: lista y formulario — RF-16, RF-17, RF-18

```
Lista                              Nuevo gasto
┌─────────────────────────────┐    ┌─────────────────────────────────┐
│ Gastos            [Octubre▾]│    │ ‹  Nuevo gasto                  │
│ Total del mes:   $ 312,00   │    │ Monto  [        18,00     ]     │
│ 10/10 Almuerzos     $18,00 ›│    │ Fecha  [ Hoy, 10/10/2026  ]     │
│ 09/10 Materiales   $250,00 ›│    │ Categoría                       │
│ ...                         │    │ [Materiales] [Almuerzos✓]       │
│                        ( + )│    │ [Alquiler maq.] [Otros] [ + ]   │
└─────────────────────────────┘    │ Actividad (opcional)            │
                                   │ [ Fumigación lote norte 10/10 ▾]│
                                   │ Nota   [ 5 almuerzos         ]  │
                                   │ [          GUARDAR          ]   │
                                   └─────────────────────────────────┘
```

### 3.7 Resumen — RF-20

```
┌─────────────────────────────────┐
│ Resumen                         │
│ [Semana] [ Mes ✓ ] [ Rango ]    │
│ ‹      Octubre 2026         ›   │
├─────────────────────────────────┤
│ TOTAL GASTADO       $ 712,00    │
├─────────────────────────────────┤
│ Mano de obra        $ 400,00 ███████  │
│ Materiales          $ 250,00 ████     │
│ Almuerzos           $  44,00 █        │
│ Alquiler maquinaria $  18,00 ▏        │
│ Otros               $   0,00          │
├─────────────────────────────────┤
│ De mano de obra: pagado $305,00 │
│                  falta  $ 95,00 │
└─────────────────────────────────┘
```

- La mano de obra cuenta lo **devengado**: jornales de actividades con fecha en el período, pagados o no.
- El desglose de pagado y pendiente se muestra aparte.

### 3.8 Más — RF-01, RF-03, RF-17, RF-19, RF-22 a RF-25

```
┌─────────────────────────────────┐
│ Más                             │
│ Trabajadores                  › │
│ Tipos de tarea y tarifas      › │
│ Categorías de gasto           › │
│ Respaldo                      › │
└─────────────────────────────────┘
```

- **Trabajadores:** lista de activos y una sección plegable de inactivos. El formulario pide nombre y teléfono opcional. El tractor se crea aquí como un trabajador más (RF-19).
- **Tipos de tarea:** nombre, unidad (día / tarea / hora) y tarifa sugerida. Un aviso dice "Cambiar la tarifa no modifica jornales ya registrados" (RN-04).
- **Categorías:** crear y renombrar. Las 4 iniciales vienen precargadas.

**Respaldo:**

```
┌─────────────────────────────────┐
│ ‹  Respaldo                     │
│                                 │
│ Último respaldo:                │
│   3 de septiembre de 2026       │
│   (hace 37 días)                │
│                                 │
│ [     GUARDAR RESPALDO AHORA  ] │
│   Se abre para enviarlo por     │
│   WhatsApp, Drive o correo.     │
│                                 │
│ [   Restaurar desde archivo   ] │
└─────────────────────────────────┘
```

## 4. Flujos clave (para validar con el cliente)

Los toques cuentan desde la pantalla de inicio. Se asume el caso común: fecha de hoy y tarifa sugerida sin cambios.

### 4.1 Registrar una jornada de 5 trabajadores (meta: ~1 minuto)

| # | Acción | Toques |
|---|---|---|
| 1 | Tocar **+** en "A quién debo" | 1 |
| 2 | Elegir el tipo de tarea | 1 |
| 3 | Escribir la descripción (opcional, ~10 s) | — |
| 4 | Siguiente | 1 |
| 5 | Marcar 5 trabajadores | 5 |
| 6 | Siguiente | 1 |
| 7 | Guardar | 1 |
|   | **Total** | **10 toques + descripción** |

### 4.2 Pagarle a un trabajador

| # | Acción | Toques |
|---|---|---|
| 1 | Tocar al trabajador en "A quién debo" | 1 |
| 2 | **Pagar todo** | 1 |
| 3 | Confirmar | 1 |
|   | **Total** | **3 toques** |

Para un pago parcial: tocar al trabajador, **Pagar** en el jornal, escribir el monto y **Registrar pago**. Son 3 toques más el monto.

### 4.3 Hacer el respaldo mensual

| # | Acción | Toques |
|---|---|---|
| 1 | Tocar la notificación (abre Más › Respaldo) y **Guardar respaldo ahora** | 2 |
| 2 | Elegir WhatsApp / Drive / correo en la hoja de compartir | 1 |
| 3 | Enviar (por ejemplo, a sí mismo en WhatsApp) | 1–2 |
| 4 | De vuelta en la app: "¿Guardaste el respaldo?" → **Sí** | 1 |
|   | **Total** | **5–6 toques** |

## 5. Preguntas para la sesión con el cliente

1. ~~¿Los nombres de las pestañas (Debo, Actividades, Gastos, Resumen, Más) se entienden?~~ Confirmado (2026-10-10): sí.
2. ~~¿Prefiere ver los montos como `$20,50` o como `$20.50`?~~ Confirmado (2026-10-10): `$20,50`.
3. ~~Para pagarle más a un trabajador en una jornada, ¿le resulta natural cambiar su tarifa en la pantalla de revisión?~~ Confirmado (2026-10-10): sí.
4. ~~En el resumen, ¿la mano de obra debe contar lo trabajado en el período (propuesta actual) o lo pagado en el período?~~ Confirmado (2026-10-10): lo trabajado (devengado).
5. ~~¿El aviso de respaldo en la pantalla de inicio le resulta molesto o útil?~~ Confirmado (2026-10-10): molesto. Se quita; queda solo la notificación (RF-24, requisitos v0.4).

## 6. Trazabilidad

| Requisito | Pantalla |
|---|---|
| RF-01, RF-02, RF-19 | 3.8 Trabajadores; 3.4 paso 2 (solo activos) |
| RF-03, RF-04, RN-04 | 3.8 Tipos de tarea; 3.4 pasos 1 y 2 |
| RF-05 a RF-07 | 3.4 Nueva actividad |
| RF-08 | 3.5 Detalle de actividad (⋮ Editar / Eliminar) |
| RF-09, RF-12 | 3.3 Registrar pago |
| RF-10 | Estados en 3.2 y 3.5 |
| RF-11 | "Pagar todo" en 3.2 y 3.5 |
| RF-13, RF-15 | 3.1 A quién debo |
| RF-14 | 3.2 Detalle de trabajador |
| RF-16 a RF-18 | 3.6 Gastos; "+ Agregar gasto" en 3.5 |
| RF-20 | 3.7 Resumen |
| RF-21 | 3.5 Detalle de actividad |
| RF-22 a RF-25 | 3.8 Respaldo; notificación local (sin aviso en pantalla) |
| RNF-05 | §1 y §4 |
