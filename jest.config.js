/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      // Reglas de negocio, datos y casos de uso: corren en Node, sin React Native.
      displayName: 'logica',
      preset: 'jest-expo',
      testEnvironment: 'node',
      roots: ['<rootDir>/src'],
      testMatch: ['**/{dominio,datos,casos-uso}/**/*.test.ts'],
    },
    {
      // Pantallas con React Native Testing Library sobre la base en memoria (better-sqlite3).
      displayName: 'ui',
      preset: 'jest-expo',
      roots: ['<rootDir>/src'],
      testMatch: ['**/pruebas-ui/**/*.test.tsx'],
      setupFilesAfterEnv: ['<rootDir>/src/pruebas-ui/simular-plataforma.ts'],
    },
  ],
};
