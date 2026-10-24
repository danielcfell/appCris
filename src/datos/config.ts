import type { Consultas } from './base-datos';

/** `ultimo_respaldo_en` e `instalado_en` son instantes ISO-8601 (RF-24, RF-25). */
export type ClaveConfig = 'ultimo_respaldo_en' | 'instalado_en';

export async function leerConfig(db: Consultas, clave: ClaveConfig): Promise<string | null> {
  const f = await db.consultarUno<{ valor: string }>('SELECT valor FROM config WHERE clave = ?', [clave]);
  return f?.valor ?? null;
}

export async function guardarConfig(db: Consultas, clave: ClaveConfig, valor: string): Promise<void> {
  await db.ejecutar(
    'INSERT INTO config (clave, valor) VALUES (?, ?) ON CONFLICT (clave) DO UPDATE SET valor = excluded.valor',
    [clave, valor],
  );
}

/** Guarda el valor solo si la clave aún no existe. */
export async function guardarConfigSiFalta(db: Consultas, clave: ClaveConfig, valor: string): Promise<void> {
  await db.ejecutar('INSERT INTO config (clave, valor) VALUES (?, ?) ON CONFLICT (clave) DO NOTHING', [clave, valor]);
}
