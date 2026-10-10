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

Aún no hay código. Los requisitos (v0.3) están cerrados con el cliente, y el proyecto está en la **fase 2 del SDLC (diseño)**, con borradores en `docs/diseno/` pendientes de validar con el cliente.

Stack elegido: **React Native con Expo + `expo-sqlite`, en TypeScript**. Las reglas de negocio viven en `src/dominio/` (TypeScript puro) y se prueban con Jest en Node; la capa de datos se prueba con `better-sqlite3` detrás de la interfaz `BaseDatos`. Los comandos de build, lint y pruebas se agregan aquí al crear el proyecto.

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
- Offline primero y datos solo en el dispositivo. Lo único que sale del celular es el respaldo que el usuario exporta (RNF-01, RNF-09). Respaldo y restauración van por un archivo compartible, con recordatorio a los 30 días en la app y como notificación local (RF-22 a RF-25).
- El modelo de datos debe poder incorporar **terreno/cultivo** e **ingresos** sin reescribir lo existente, pero ninguno entra en el MVP (RNF-07, §3.2).
- Las reglas RN-01 a RN-05 y los cálculos de saldos requieren pruebas automatizadas (RNF-08).
- Interfaz para uso en campo: botones grandes, pocos pasos, legible con luz solar. Registrar una actividad con 5 trabajadores debería tomar ~1 minuto o menos (RNF-05).

Fuera del MVP: ingresos, separación por terreno, multiusuario o sincronización, facturación electrónica o reportes al SRI.
