# Jornales

App móvil Android, **sin internet**, para un solo usuario (agricultor). Controla a quién se le debe, los pagos parciales y los gastos, separados por cultivo.

Los datos viven solo en el celular. Lo único que sale es el respaldo que el usuario exporta.

## Qué hace

- **A quién debo:** trabajadores con saldo pendiente, ordenados por monto, y el total adeudado.
- **Actividades y jornales:** registrar una actividad con varios trabajadores y el mismo monto en un solo paso.
- **Pagos:** totales o parciales; el saldo nunca queda negativo.
- **Gastos:** con categoría, cultivo y actividad opcional.
- **Cultivos:** cada siembra lleva sus cuentas aparte (deudas, actividades, gastos y resúmenes).
- **Resúmenes** por período: mano de obra vs. categorías.
- **Respaldo y restauración** por archivo, con recordatorio mensual como notificación local.

Todo el dinero se guarda en centavos enteros. La interfaz está en español y pensada para uso en campo.

## Stack

Expo SDK 57 (React Native 0.86), `expo-sqlite`, TypeScript, `expo-router`. Pruebas con Jest, `better-sqlite3` y React Native Testing Library.

## Comenzar

```
npm install
npx expo start
```

Para agregar paquetes de Expo usar `npx expo install <paquete>`.

## Pruebas

```
npm test              # todas las pruebas
npm run typecheck     # tsc --noEmit
npx jest src/dominio/jornal.test.ts -t "RN-02"   # una sola prueba
```

## Documentación

- [Requisitos](docs/requisitos.md)
- [Arquitectura, modelo de datos y pruebas](docs/diseno/arquitectura.md)
- [Pantallas y flujos](docs/diseno/pantallas.md)
- [Decisiones de arquitectura](docs/adr/)
- [Manual de uso](docs/manual/manual-de-uso.pdf)

## Estructura

```
src/app/         rutas de expo-router
src/ui/          componentes
src/casos-uso/   operaciones de negocio (una por acción del usuario)
src/dominio/     reglas puras (dinero, montos, saldos)
src/datos/       esquema, migraciones, repositorios, SQLite
src/plataforma/  módulos nativos (archivos, compartir, notificaciones)
```

## Licencia

Sin licencia definida por ahora: todos los derechos reservados.
