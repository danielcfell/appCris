# Documento de requisitos: App de control de jornales y gastos agrícolas

**Versión:** 0.4 (requisitos cerrados con el cliente)
**Fecha:** 2026-10-10
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
- Funcionamiento **sin internet**.
- Respaldo y restauración de los datos.

### 3.2 Fuera del MVP (decisión explícita del cliente)
- **Registro de ingresos** por venta de cosecha (posible fase posterior).
- **Separación por terreno o cultivo.** No se implementa en el MVP, pero **el diseño no debe impedirlo** (ver RNF-07).
- Multiusuario, sincronización entre dispositivos, facturación electrónica o reportes al SRI.

## 4. Glosario

| Término | Definición |
|---|---|
| Actividad | Trabajo realizado en una fecha (ej. "fumigación lote norte"). |
| Trabajador | Persona a la que se le paga por trabajar. Se registra una vez. |
| Jornal | Monto que se le debe a un trabajador por una actividad. |
| Tarea (tipo) | Clase de trabajo con una tarifa habitual (ej. diario, fumigación). |
| Pago | Entrega de dinero asociada a un jornal. Un jornal puede tener varios. |
| Gasto | Compra que no es mano de obra (materiales, almuerzos, etc.). |
| Devengado | Lo que se debe aunque aún no se haya pagado. |

## 5. Requisitos funcionales

### Trabajadores
- **RF-01** El usuario puede crear, editar y desactivar trabajadores (nombre; teléfono opcional).
- **RF-02** Un trabajador desactivado no aparece al crear actividades, pero conserva su historial.

### Tipos de tarea y tarifas
- **RF-03** El usuario puede definir tipos de tarea con una **tarifa sugerida** y una **unidad de cobro**: día, tarea (valor fijo) u hora.
- **RF-04** La tarifa sugerida se propone al crear el jornal, pero **siempre se puede modificar** para ese caso.

### Actividades y jornales
- **RF-05** El usuario registra una actividad con fecha, descripción y tipo de tarea.
- **RF-06** El usuario puede agregar varios trabajadores a una actividad aplicando **el mismo monto a todos en un solo paso**, y luego ajustar un monto individual si hace falta.
- **RF-07** El monto de un jornal se calcula como `cantidad × tarifa` (ej. 1 día × $20; 3 horas × $15).
- **RF-08** El usuario puede editar o eliminar un jornal. Si ya tiene pagos, el sistema pide confirmación y mantiene la consistencia.

### Pagos
- **RF-09** El usuario puede registrar un **pago total o parcial** sobre un jornal, con fecha y monto.
- **RF-10** El estado de un jornal se calcula automáticamente: **pendiente** (sin pagos), **parcial** (pagado menos que el monto), **pagado** (pagado igual al monto).
- **RF-11** El usuario puede pagar de una sola vez todo lo pendiente de una actividad o de un trabajador.
- **RF-12** El sistema **no permite** registrar pagos que superen el saldo pendiente del jornal.

### Consulta de deudas (función central)
- **RF-13** Pantalla "A quién debo": lista de trabajadores con saldo pendiente, ordenada por monto, y el **total adeudado**.
- **RF-14** Al abrir un trabajador se ven sus jornales pendientes y su historial de pagos.
- **RF-15** El saldo se actualiza al instante al registrar un pago.

### Gastos
- **RF-16** El usuario registra gastos con fecha, monto, categoría y nota opcional.
- **RF-17** Categorías iniciales: materiales, almuerzos, alquiler de maquinaria, otros. El usuario puede crear más.
- **RF-18** Un gasto puede asociarse opcionalmente a una actividad (ej. almuerzos de la fumigación).
- **RF-19** Un servicio por horas, como un tractor, se registra como **un trabajador más** (decisión del cliente): se crea como trabajador y se le genera un jornal con unidad "hora" (ej. 3 horas × $15). Así aparece en "A quién debo" como cualquier otro.

### Resúmenes
- **RF-20** Resumen por período (semana, mes, rango libre): total gastado en mano de obra, total por categoría y total general.
- **RF-21** Detalle de una actividad: costo total (jornales + gastos asociados), cuánto se ha pagado y cuánto falta.

### Datos
- **RF-22** El usuario puede **exportar un respaldo** de todos los datos a un archivo y compartirlo (WhatsApp, Drive, correo).
- **RF-23** El usuario puede **restaurar** desde ese archivo en el mismo u otro celular.
- **RF-24** **Respaldo mensual** (decisión del cliente): la app recuerda hacer el respaldo cuando han pasado 30 días desde el último. El recordatorio es **solo una notificación local** (funciona sin internet), sin avisos dentro de la app (decisión del cliente: el aviso en pantalla le resulta molesto), y se repite hasta que el usuario guarde un respaldo. El usuario también puede hacerlo en cualquier momento.
- **RF-25** La app muestra la fecha del último respaldo realizado.

## 6. Reglas de negocio

- **RN-01** Un jornal nace como deuda ("devengado") y solo cambia por pagos registrados.
- **RN-02** Saldo del jornal = monto − suma de sus pagos. Nunca es negativo.
- **RN-03** Total adeudado = suma de saldos de todos los jornales.
- **RN-04** Los montos del jornal se calculan con la cantidad y la tarifa vigentes al crearlo; cambiar la tarifa sugerida después **no altera** jornales ya creados.
- **RN-05** Un trabajador con historial no se elimina, solo se desactiva.

## 7. Requisitos no funcionales

- **RNF-01 Offline primero:** todas las funciones del MVP operan sin conexión. Los datos viven en el dispositivo.
- **RNF-02 Integridad monetaria:** todo importe se almacena como **entero en centavos**, nunca como decimal flotante. Moneda única: USD.
- **RNF-03 Consistencia:** las operaciones que tocan varias tablas (ej. crear actividad con 5 jornales) son atómicas: o se guardan todas o ninguna.
- **RNF-04 Durabilidad:** ningún dato se pierde al cerrar la app o quedarse sin batería. El respaldo (RF-22) mitiga la pérdida o cambio del celular.
- **RNF-05 Usabilidad:** pensada para uso en campo: botones grandes, pocos pasos, lectura con luz solar. Registrar una actividad con 5 trabajadores no debería tomar más de ~1 minuto.
- **RNF-06 Plataforma:** móvil **Android** (confirmado por el cliente). Idioma: español.
- **RNF-07 Extensibilidad:** el modelo de datos debe poder incorporar después **terreno/cultivo** y **ingresos** sin reescribir lo existente.
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
(futuro) Terreno 1──* Actividad / Gasto
```

## 9. Supuestos y riesgos

| ID | Supuesto / Riesgo | Mitigación |
|---|---|---|
| R-01 | Pérdida o cambio del celular = pérdida de todo | Respaldo exportable con recordatorio mensual (hasta 30 días de datos en riesgo) |
| R-02 | Errores de redondeo con dinero | Centavos enteros + tests |
| R-03 | Diferencias entre versiones y marcas de Android | Probar en un dispositivo real similar al del cliente |
| R-04 | Pantallas lentas o complejas para uso en campo | Prototipo y prueba con el cliente antes de construir |
| R-05 | Alcance crece (ingresos, terrenos) antes de terminar el MVP | Mantener la lista de "fuera del MVP" y priorizar |

## 10. Preguntas abiertas

### Resueltas (2026-10-10)
- ~~**P-01**~~ Tractor: se trata como **un trabajador más** (se le debe y se le paga). Ver RF-19.
- ~~**P-02**~~ Plataforma: **Android**. Ver RNF-06.
- ~~**P-03**~~ Las tarifas **no cambian mucho**: se mantiene el catálogo de tipos de tarea con tarifa sugerida editable (RF-03, RF-04).
- ~~**P-04**~~ No necesita historial de pagos pensado para mostrar a terceros. RF-14 queda como consulta interna, sin exportación ni formato de comprobante.

- ~~**P-05**~~ Respaldo: **mensual**, con recordatorio automático. Ver RF-24 y RF-25.

### Pendientes
- Ninguna por ahora.

## 11. Historial de cambios

| Versión | Fecha | Cambio |
|---|---|---|
| 0.1 | 2026-10-10 | Primer borrador tras entrevista con el cliente |
| 0.2 | 2026-10-10 | Resueltas P-01 a P-04: tractor como trabajador, Android, tarifas estables, sin historial para terceros. Pendiente P-05 (respaldo) |
| 0.3 | 2026-10-10 | Resuelta P-05: respaldo mensual con recordatorio (RF-24, RF-25). Sin preguntas abiertas |
| 0.4 | 2026-10-10 | RF-24: el recordatorio de respaldo es solo una notificación local; se quita el aviso al abrir la app |
