import { baseDePrueba } from '../datos/adaptador-node';
import type { BaseDatosSqlite } from '../datos/base-datos';
import { crearTipoTarea } from './tipos-tarea';
import { crearTrabajador } from './trabajadores';

/** Base nueva con un tipo de tarea "Diario" ($20/día), uno "Tractor" ($15/hora) y cinco trabajadores. */
export async function escenario() {
  const db: BaseDatosSqlite = await baseDePrueba();
  const diario = await crearTipoTarea(db, { nombre: 'Diario', unidad: 'dia', tarifaSugerida: 2000 });
  const tractor = await crearTipoTarea(db, { nombre: 'Tractor', unidad: 'hora', tarifaSugerida: 1500 });
  const nombres = ['Juan', 'María', 'Pedro', 'Rosa', 'Luis'];
  const trabajadores: number[] = [];
  for (const nombre of nombres) trabajadores.push(await crearTrabajador(db, { nombre }));
  return { db, diario, tractor, trabajadores };
}

export async function contar(db: BaseDatosSqlite, tabla: string): Promise<number> {
  const f = await db.consultarUno<{ n: number }>(`SELECT COUNT(*) AS n FROM ${tabla}`);
  return f?.n ?? 0;
}
