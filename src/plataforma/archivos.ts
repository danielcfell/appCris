import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Escribe el archivo en la caché de la app y abre la hoja de compartir de Android (WhatsApp, Drive, correo).
 * Resuelve al cerrarse la hoja; Android no informa si el usuario completó el envío (RF-22).
 */
export async function compartirArchivo(nombre: string, contenido: string): Promise<void> {
  const archivo = new File(Paths.cache, nombre);
  archivo.create({ overwrite: true });
  archivo.write(contenido);
  await Sharing.shareAsync(archivo.uri, { mimeType: 'application/json', dialogTitle: 'Guardar respaldo' });
}

/** Deja elegir un archivo y devuelve su texto, o `null` si el usuario canceló (RF-23). */
export async function elegirArchivo(): Promise<string | null> {
  // Un archivo recibido por WhatsApp puede llegar sin el tipo JSON: se acepta cualquiera y se valida el contenido.
  const resultado = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (resultado.canceled) return null;
  return new File(resultado.assets[0].uri).text();
}

/** Guarda un archivo en el almacenamiento propio de la app (no se comparte ni sale del celular). */
export function guardarArchivoLocal(nombre: string, contenido: string): void {
  const archivo = new File(Paths.document, nombre);
  archivo.create({ overwrite: true });
  archivo.write(contenido);
}
