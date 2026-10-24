# Firma y generación del APK

**Fecha:** 2026-10-24
**Estado:** Fase 3 del SDLC, incremento 4

## Por qué importa la clave

Android solo instala una versión nueva encima de la anterior si las dos están firmadas con **la misma clave**. Si la clave se pierde, la siguiente versión obliga a desinstalar la app, y al desinstalar se borran todos los datos del agricultor (el respaldo de RF-22 es lo único que los salvaría).

## Dónde está

Fuera del repositorio, en la PC de desarrollo:

| Archivo | Contenido |
|---|---|
| `%USERPROFILE%\.appcris\jornales-release.jks` | La clave (PKCS12, alias `jornales`, RSA 2048, válida 10 000 días) |
| `%USERPROFILE%\.gradle\gradle.properties` | Ruta y contraseñas: `JORNALES_STORE_FILE`, `JORNALES_STORE_PASSWORD`, `JORNALES_KEY_ALIAS`, `JORNALES_KEY_PASSWORD` |

Huella SHA-256 del certificado: `7A:62:4C:1A:AF:3A:99:C0:EB:AB:FE:0F:58:DD:8B:7A:11:5D:E0:DD:76:9E:D4:56:C7:44:C2:D9:D6:C8:36:63`

**Guardar una copia de los dos archivos** en un lugar seguro y distinto de esta PC (por ejemplo, un gestor de contraseñas o una unidad cifrada). Nunca subirlos a git.

## Cómo se aplica

`android/` se genera (Continuous Native Generation), así que la firma la configura el plugin `plugins/firma-android.js`, registrado en `app.json`. El plugin agrega `signingConfigs.release` con esas propiedades y hace que el tipo `release` lo use en vez de la clave de depuración. Si las propiedades no existen, la compilación de release falla en vez de firmar con la clave de depuración.

## Generar el APK

```powershell
$env:JAVA_HOME = "$env:LOCALAPPDATA\Programs\jdk-17"
npx expo prebuild --platform android --no-install
cd android
.\gradlew.bat assembleRelease --max-workers=4 "-PreactNativeArchitectures=arm64-v8a,armeabi-v7a,x86_64"
```

Las arquitecturas cubren celulares de 64 y 32 bits y el emulador; omitir las demás acorta la compilación. `--max-workers=4` evita que la compilación de C++ agote la memoria con el emulador abierto.

Resultado: `android\app\build\outputs\apk\release\app-release.apk`. Para comprobar la firma:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\build-tools\<versión>\apksigner.bat" verify --print-certs android\app\build\outputs\apk\release\app-release.apk
```

La huella SHA-256 debe coincidir con la de arriba.

## Antes de cada versión nueva

Subir `versionCode` (entero) y `version` en `app.json`: Android rechaza instalar una versión con un `versionCode` igual o menor al instalado.
