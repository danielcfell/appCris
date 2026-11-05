# Documento de requisitos: App de control de jornales y gastos agrícolas

**Versión:** 0.6 (cuentas por cultivo)
**Fecha:** 2026-11-04
**Estado:** Fase 1 del SDLC (Requisitos)

---

## 1. Contexto y problema

El cliente es un agricultor que contrata personal por jornadas (fumigación, deshierbe, etc.) y compra insumos y alimentación para ese personal. Hoy se le olvida **a quién le debe, cuánto y si ya le pagó**. También quiere tener claro cuánto gasta en mano de obra y en otras compras.

**Objetivo del producto:** que el agricultor sepa en todo momento a quién debe pagar, cuánto, y cuánto ha gastado y en qué.

## 2. Usuarios

- **Usuario único:** el agricultor. Un solo celular, sin cuentas ni roles.

## 3. Alcance

### 3.1 Dentro del MVP
- Registro de actividades (fecha, descripción).
- Registro de trabajadores reutilizables.
- Asignación de varios trabajadores a una actividad con el mismo monto en un solo paso.
- Control de lo que se debe, pagos parciales y estado de cada jornal.
- Registro de gastos con categoría (materiales, almuerzos, otros).
- Resúmenes de gasto por período, mano de obra vs. categorías.
- Separación de cuentas por **cultivo** (cada siembra): deudas, actividades, gastos y resúmenes.
- Funcionamiento **sin internet**.
- Respaldo y restauración de los datos.

### 3.2 Fuera del MVP (decisión explícita del cliente)
- **Registro de ingresos** por venta de cosecha (posible fase posterior).
- Terreno o predio como concepto aparte: a la app le es indiferente (decisión del cliente). Si hace falta recordarlo, va en el nombre del cultivo, ej. "Papas — lote norte".
- Multiusuario, sincronización entre dispositivos, facturación electrónica o reportes al SRI.

## 4. Glosario

| Término | Definición |
|---|---|
| Actividad | Trabajo realizado en una fecha (ej. "fumigación de papas"). |
| Trabajador | Persona a la que se le paga por trabajar. Se registra una vez. |
| Jornal | Monto que se le debe a un trabajador por una actividad. |
| Tarea (tipo) | Clase de trabajo con una tarifa habitual (ej. diario, fumigación). |
| Pago | Entrega de dinero asociada a un jornal. Un jornal puede tener varios. |
| Gasto | Compra que no es mano de obra (materiales, almuerzos, etc.). |
| Devengado | Lo que se debe aunque aún no se haya pagado. |
| Cultivo | Cada siembra, con sus cuentas aparte (ej. "Papas 2026", "Arveja"). Un mismo terreno puede tener varios a lo largo del tiempo; la app no distingue el terreno. |

## 5. Requisitos funcionales

### Trabajadores
- **RF-01** El usuario puede crear, editar y desactivar trabajadores (nombre; teléfono opcional).
- **RF-02** Un trabajador desactivado no aparece al crear actividades, pero conserva su historial.

### Tipos de tarea y tarifas
- **RF-03** El usuario puede definir tipos de tarea con una **tarifa sugerida** y una **unidad de cobro**: día, tarea (valor fijo) u hora.
- **RF-04** La tarifa sugerida se propone al crear el jornal, pero **siempre se puede modificar** para ese caso.

### Actividades y jornales
- **RF-05** El usuario registra una actividad con fecha, descripción, tipo de tarea y cultivo.
- **RF-06** El usuario puede agregar varios trabajadores a una actividad aplicando **el mismo monto a todos en un solo paso**, y luego ajustar un monto individual si hace falta.
- **RF-07** El monto de un jornal se calcula como `cantidad × tarifa` (ej. 1 día × $20; 3 horas × $15).
- **RF-08** El usuario puede editar o eliminar un jornal. Si ya tiene pagos, el sistema pide confirmación y mantiene la consistencia.

### Pagos
- **RF-09** El usuario puede registrar un **pago total o parcial** sobre un jornal, con fecha y monto.
- **RF-10** El estado de un jornal se calcula automáticamente: **pendiente** (sin pagos), **parcial** (pagado menos que el monto), **pagado** (pagado igual al monto).
- **RF-11** El usuario puede pagar de una sola vez todo lo pendiente de una actividad o de un trabajador. Si está viendo un cultivo, "pagar todo" al trabajador solo cubre los jornales de ese cultivo (RF-29).
- **RF-12** El sistema **no permite** registrar pagos que superen el saldo pendiente del jornal.

### Consulta de deudas (función central)
- **RF-13** Pantalla "A quién debo": lista de trabajadores con saldo pendiente, ordenada por monto, y el **total adeudado**. Se puede filtrar por cultivo (RF-28).
- **RF-14** Al abrir un trabajador se ven sus jornales pendientes y su historial de pagos.
- **RF-15** El saldo se actualiza al instante al registrar un pago.

### Gastos
- **RF-16** El usuario registra gastos con fecha, monto, categoría, cultivo y nota opcional.
- **RF-17** Categorías iniciales: materiales, almuerzos, alquiler de maquinaria, otros. El usuario puede crear más.
- **RF-18** Un gasto puede asociarse opcionalmente a una actividad (ej. almuerzos de la fumigación).
- **RF-19** Un servicio por horas, como un tractor, se registra como **un trabajador más** (decisión del cliente): se crea como trabajador y se le genera un jornal con unidad "hora" (ej. 3 horas × $15). Así aparece en "A quién debo" como cualquier otro.

### Cultivos
- **RF-26** El usuario puede crear, editar y **cerrar** cultivos (nombre; el terreno, si hace falta, va en el nombre). Un cultivo cerrado no se ofrece al registrar, pero conserva su historial, se puede seguir consultando y se puede reabrir. Cada siembra es un cultivo nuevo (ej. "Papas 2026"), aunque sea en el mismo terreno.
- **RF-27** Toda actividad nueva y todo gasto suelto se asocian a un cultivo si ya hay cultivos en el catálogo. Un gasto ligado a una actividad **hereda** el cultivo de esa actividad. Los datos anteriores a esta versión pueden quedar sin cultivo.
- **RF-28** El usuario puede filtrar "A quién debo", actividades, gastos y el resumen por cultivo, ver **Todos** a la vez, o ver registros **sin cultivo**. El último filtro se recuerda y se usa para prellenar el alta.
- **RF-29** Desde "A quién debo" filtrado por un cultivo, el detalle del trabajador y "Pagar todo" cubren solo los jornales de ese cultivo.

### Resúmenes
- **RF-20** Resumen por período (semana, mes, rango libre): total gastado en mano de obra, total por categoría y total general. Se puede filtrar por cultivo (RF-28).
- **RF-21** Detalle de una actividad: costo total (jornales + gastos asociados), cuánto se ha pagado y cuánto falta.

### Datos
- **RF-22** El usuario puede **exportar un respaldo** de todos los datos a un archivo y compartirlo (WhatsApp, Drive, correo).
- **RF-23** El usuario puede **restaurar** desde ese archivo en el mismo u otro celular.
- **RF-24** **Respaldo mensual** (decisión del cliente): la app recuerda hacer el respaldo cuando han pasado 30 días desde el último. El recordatorio es **solo una notificación local** (funciona sin internet), sin avisos dentro de la app (decisión del cliente: el aviso en pantalla le resulta molesto), y se repite hasta que el usuario guarde un respaldo. El usuario también puede hacerlo en cualquier momento.
- **RF-25** La app muestra la fecha del último respaldo realizado.

## 6. Reglas de negocio

- **RN-01** Un jornal nace como deuda ("devengado") y solo cambia por pagos registrados.
- **RN-02** Saldo del jornal = monto − suma de sus pagos. Nunca es negativo.
- **RN-03** Total adeudado (sin filtro) = suma de saldos de todos los jornales. El total de un cultivo = suma de saldos de los jornales de actividades de ese cultivo.
- **RN-04** Los montos del jornal se calculan con la cantidad y la tarifa vigentes al crearlo; cambiar la tarifa sugerida después **no altera** jornales ya creados.
- **RN-05** Un trabajador con historial no se elimina, solo se desactiva. Un cultivo con historial tampoco se elimina, solo se desactiva.

## 7. Requisitos no funcionales

- **RNF-01 Offline primero:** todas las funciones del MVP operan sin conexión. Los datos viven en el dispositivo.
- **RNF-02 Integridad monetaria:** todo importe se almacena como **entero en centavos**, nunca como decimal flotante. Moneda única: USD.
- **RNF-03 Consistencia:** las operaciones que tocan varias tablas (ej. crear actividad con 5 jornales) son atómicas: o se guardan todas o ninguna.
- **RNF-04 Durabilidad:** ningún dato se pierde al cerrar la app o quedarse sin batería. El respaldo (RF-22) mitiga la pérdida o cambio del celular.
- **RNF-05 Usabilidad:** pensada para uso en campo: botones grandes, pocos pasos, lectura con luz solar. Registrar una actividad con 5 trabajadores no debería tomar más de ~1 minuto.
- **RNF-06 Plataforma:** móvil **Android** (confirmado por el cliente). Idioma: español.
- **RNF-07 Extensibilidad:** el modelo de datos debe poder incorporar después **ingresos** (por cultivo) sin reescribir lo existente.
- **RNF-08 Calidad:** las reglas de negocio (RN-01 a RN-05) y los cálculos de saldos deben tener pruebas automatizadas.
- **RNF-09 Privacidad:** los datos no salen del dispositivo salvo el respaldo que el usuario exporte voluntariamente.

## 8. Modelo conceptual (borrador, se refina en Diseño)

```
Trabajador 1──* Jornal *──1 Actividad
                 │
                 1
                 │
                 * Pago

Actividad 1──* Gasto (opcional)
Categoría 1──* Gasto
TipoTarea 1──* Actividad
Cultivo 1──* Actividad / Gasto
```

## 9. Supuestos y riesgos

| ID | Supuesto / Riesgo | Mitigación |
|---|---|---|
| R-01 | Pérdida o cambio del celular = pérdida de todo | Respaldo exportable con recordatorio mensual (hasta 30 días de datos en riesgo) |
| R-02 | Errores de redondeo con dinero | Centavos enteros + tests |
| R-03 | Diferencias entre versiones y marcas de Android | Probar en un dispositivo real similar al del cliente |
| R-04 | Pantallas lentas o complejas para uso en campo | Prototipo y prueba con el cliente antes de construir |
| R-05 | Alcance crece (ingresos u otras cuentas) antes de terminar el MVP | Mantener la lista de "fuera del MVP" y priorizar |

## 10. Preguntas abiertas

### Resueltas (2026-10-10)
- ~~**P-01**~~ Tractor: se trata como **un trabajador más** (se le debe y se le paga). Ver RF-19.
- ~~**P-02**~~ Plataforma: **Android**. Ver RNF-06.
- ~~**P-03**~~ Las tarifas **no cambian mucho**: se mantiene el catálogo de tipos de tarea con tarifa sugerida editable (RF-03, RF-04).
- ~~**P-04**~~ No necesita historial de pagos pensado para mostrar a terceros. RF-14 queda como consulta interna, sin exportación ni formato de comprobante.

- ~~**P-05**~~ Respaldo: **mensual**, con recordatorio automático. Ver RF-24 y RF-25.

### Resueltas (2026-10-30)
- ~~**P-06**~~ Separación de cuentas: entra al producto (deudas, actividades, gastos y resúmenes). Ver RF-26 a RF-29. La unidad de cuenta quedó definida en P-07.

### Resueltas (2026-11-04)
- ~~**P-07**~~ La unidad de cuenta es el **cultivo**, no el terreno: un terreno puede tener otros cultivos con el tiempo y eso le es indiferente a la app. Cada siembra se lleva por separado ("Papas", "Arveja"), se ve solo por cultivo y se **cierra** al terminar. Una misma persona puede trabajar en varios cultivos: es un solo trabajador, pero su deuda y "pagar todo" se llevan aparte en cada cultivo. Un gasto que sirve a dos cultivos queda sin cultivo (general); no se reparte. Ver RF-26 a RF-29.

### Pendientes
- Ninguna por ahora.

## 11. Historial de cambios

| Versión | Fecha | Cambio |
|---|---|---|
| 0.1 | 2026-10-10 | Primer borrador tras entrevista con el cliente |
| 0.2 | 2026-10-10 | Resueltas P-01 a P-04: tractor como trabajador, Android, tarifas estables, sin historial para terceros. Pendiente P-05 (respaldo) |
| 0.3 | 2026-10-10 | Resuelta P-05: respaldo mensual con recordatorio (RF-24, RF-25). Sin preguntas abiertas |
| 0.4 | 2026-10-10 | RF-24: el recordatorio de respaldo es solo una notificación local; se quita el aviso al abrir la app |
| 0.5 | 2026-10-30 | P-06: separación por lote (terreno). RF-26 a RF-29, RN-03 y RN-05 ampliados. Ingresos siguen fuera del MVP |
| 0.6 | 2026-11-04 | P-07: la unidad de cuenta es el **cultivo**, no el terreno. Lote/terreno pasan a cultivo en RF-05, RF-11, RF-13, RF-16, RF-20, RF-26 a RF-29, RN-03, RN-05 y el glosario. RF-26: se cierra y se reabre. Terreno queda fuera del MVP; ingresos siguen fuera |
