// Firma el APK de producción con la clave propia de la app, no con la de depuración: cada versión futura
// debe firmarse con la misma clave o Android no deja actualizar sin desinstalar (y se pierden los datos).
// La ruta y las contraseñas se leen de ~/.gradle/gradle.properties, fuera del repositorio.
// Ver docs/pruebas/firma-apk.md.
const { withAppBuildGradle } = require('expo/config-plugins');

const FIRMA_RELEASE = `
        release {
            if (project.hasProperty('JORNALES_STORE_FILE')) {
                storeFile file(JORNALES_STORE_FILE)
                storePassword JORNALES_STORE_PASSWORD
                keyAlias JORNALES_KEY_ALIAS
                keyPassword JORNALES_KEY_PASSWORD
            }
        }`;

module.exports = function firmaAndroid(config) {
  return withAppBuildGradle(config, (config) => {
    let gradle = config.modResults.contents;
    if (!gradle.includes('JORNALES_STORE_FILE')) {
      // Agrega la firma "release" después de la de depuración dentro de signingConfigs.
      gradle = gradle.replace(/(signingConfigs \{\r?\n\s+debug \{[\s\S]*?\r?\n {8}\})/, `$1${FIRMA_RELEASE}`);
      // El tipo de compilación release deja de usar la clave de depuración.
      gradle = gradle.replace(
        /(release \{\r?\n(?:[ \t]*\/\/.*\r?\n)*[ \t]*)signingConfig signingConfigs\.debug/,
        '$1signingConfig signingConfigs.release',
      );
    }
    if (!gradle.includes('JORNALES_STORE_FILE') || !gradle.includes('signingConfig signingConfigs.release')) {
      throw new Error('firma-android: cambió la plantilla de build.gradle y no se pudo configurar la firma.');
    }
    config.modResults.contents = gradle;
    return config;
  });
};
