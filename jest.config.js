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
  ],
};
