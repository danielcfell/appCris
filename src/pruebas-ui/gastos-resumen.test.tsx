import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { crearActividadConJornales } from '../casos-uso/actividades';
import { escenario } from '../casos-uso/datos-de-prueba';
import { registrarGasto } from '../casos-uso/gastos';
import { registrarPago } from '../casos-uso/pagos';
import { listarCategorias, listarGastos, listarGastosDeActividad } from '../datos/gastos';
import { listarJornalesDeActividad } from '../datos/jornales';
import { fechaLocal } from '../dominio/fecha';
import { abrirApp, conActividad } from './app-de-prueba';

jest.mock('../datos/adaptador-expo', () => ({ abrirBaseDatos: jest.fn() }));

test('RF-16 / RF-18: gasto agregado desde una actividad queda asociado a ella', async () => {
  const datos = await conActividad();
  const { app } = await abrirApp(`/actividad/${datos.actividadId}`, datos);
  await fireEvent.press(await screen.findByLabelText('+ Agregar gasto'));
  await fireEvent.changeText(await screen.findByLabelText('Monto'), '18');
  await fireEvent.press(screen.getByText('Almuerzos'));
  await fireEvent.changeText(screen.getByLabelText('Nota (opcional)'), '5 almuerzos');
  await fireEvent.press(screen.getByLabelText('Guardar'));

  await waitFor(() => expect(app.getPathname()).toBe(`/actividad/${datos.actividadId}`));
  expect(await listarGastosDeActividad(datos.db, datos.actividadId)).toMatchObject([
    { categoria: 'Almuerzos', monto: 1800, nota: '5 almuerzos' },
  ]);
  // Costo total de la actividad = jornales + gastos (RF-21).
  expect(await screen.findByText('$58,00')).toBeTruthy();
});

test('RF-16: el gasto exige una categoría y un monto válido', async () => {
  const { db } = await abrirApp('/gasto/nuevo');
  const guardar = await screen.findByLabelText('Guardar');
  expect(guardar).toBeDisabled();
  await fireEvent.press(screen.getByText('Materiales'));
  await fireEvent.changeText(screen.getByLabelText('Monto'), '-5');
  await fireEvent.press(screen.getByLabelText('Guardar'));
  expect(await screen.findByText('"-5" no es un monto válido.')).toBeTruthy();
  expect(await listarGastos(db, '0000-01-01', '9999-12-31')).toHaveLength(0);
});

test('RF-20: el resumen del mes separa mano de obra (lo trabajado) y categorías', async () => {
  const e = await escenario();
  const hoy = fechaLocal(new Date());
  const actividadId = await crearActividadConJornales(e.db, {
    fecha: hoy,
    descripcion: 'Deshierbe',
    tipoTareaId: e.diario,
    cantidadComun: 100,
    tarifaComun: 2000,
    trabajadores: e.trabajadores.slice(0, 3).map((trabajadorId) => ({ trabajadorId })),
  });
  const [primero] = await listarJornalesDeActividad(e.db, actividadId);
  await registrarPago(e.db, { jornalId: primero.id, monto: 2000, fecha: hoy });
  const materiales = (await listarCategorias(e.db)).find((c) => c.nombre === 'Materiales')!;
  await registrarGasto(e.db, { fecha: hoy, monto: 25000, categoriaId: materiales.id, actividadId: null, nota: null });

  await abrirApp('/resumen', e);
  expect(await screen.findByLabelText('Total gastado: $310,00')).toBeTruthy();
  expect(screen.getByLabelText('Mano de obra: $60,00')).toBeTruthy();
  expect(screen.getByLabelText('Materiales: $250,00')).toBeTruthy();
  expect(screen.getByLabelText('Otros: $0,00')).toBeTruthy();
  expect(screen.getByText('$20,00')).toBeTruthy(); // pagado
  expect(screen.getByText('$40,00')).toBeTruthy(); // falta

  // El mes anterior no tiene nada.
  await fireEvent.press(screen.getByLabelText('Período anterior'));
  expect(await screen.findByLabelText('Total gastado: $0,00')).toBeTruthy();
});
