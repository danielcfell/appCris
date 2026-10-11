import { FechaInvalida } from './errores';
import {
  describirFecha,
  diasEntre,
  etiquetaPeriodo,
  formatearFecha,
  formatearFechaCorta,
  formatearFechaLarga,
  moverPeriodo,
  periodoMes,
  periodoRango,
  periodoSemana,
  sumarDias,
} from './periodo';

describe('formato de fechas', () => {
  test('corta, completa y larga', () => {
    expect(formatearFechaCorta('2026-10-08')).toBe('08/10');
    expect(formatearFecha('2026-10-08')).toBe('08/10/2026');
    expect(formatearFechaLarga('2026-10-08')).toBe('8 de octubre de 2026');
  });

  test('describe hoy y ayer', () => {
    expect(describirFecha('2026-10-10', '2026-10-10')).toBe('Hoy, 10/10/2026');
    expect(describirFecha('2026-10-09', '2026-10-10')).toBe('Ayer, 09/10/2026');
    expect(describirFecha('2026-10-01', '2026-10-10')).toBe('01/10/2026');
  });

  test('rechaza fechas inválidas', () => {
    expect(() => formatearFecha('2026-02-30')).toThrow(FechaInvalida);
  });
});

describe('aritmética de fechas', () => {
  test('suma días cruzando mes y año', () => {
    expect(sumarDias('2026-10-31', 1)).toBe('2026-11-01');
    expect(sumarDias('2026-01-01', -1)).toBe('2025-12-31');
    expect(sumarDias('2024-02-28', 1)).toBe('2024-02-29');
  });

  test('días entre dos fechas', () => {
    expect(diasEntre('2026-10-10', '2026-10-10')).toBe(0);
    expect(diasEntre('2026-09-03', '2026-10-10')).toBe(37);
  });
});

describe('períodos (RF-20)', () => {
  test('mes completo, incluido febrero bisiesto', () => {
    expect(periodoMes('2026-10-10')).toEqual({ tipo: 'mes', desde: '2026-10-01', hasta: '2026-10-31' });
    expect(periodoMes('2024-02-10')).toEqual({ tipo: 'mes', desde: '2024-02-01', hasta: '2024-02-29' });
  });

  test('semana de lunes a domingo', () => {
    // 2026-10-10 es sábado
    expect(periodoSemana('2026-10-10')).toEqual({ tipo: 'semana', desde: '2026-10-05', hasta: '2026-10-11' });
    expect(periodoSemana('2026-10-11')).toEqual({ tipo: 'semana', desde: '2026-10-05', hasta: '2026-10-11' });
    expect(periodoSemana('2026-10-12').desde).toBe('2026-10-12');
  });

  test('rango con fechas al revés se ordena', () => {
    expect(periodoRango('2026-10-15', '2026-10-01')).toEqual({ tipo: 'rango', desde: '2026-10-01', hasta: '2026-10-15' });
  });

  test('mover al anterior y al siguiente', () => {
    expect(moverPeriodo(periodoMes('2026-01-15'), -1)).toEqual(periodoMes('2025-12-01'));
    expect(moverPeriodo(periodoMes('2026-01-31'), 1)).toEqual(periodoMes('2026-02-01'));
    expect(moverPeriodo(periodoSemana('2026-10-10'), 1).desde).toBe('2026-10-12');
    expect(moverPeriodo(periodoRango('2026-10-01', '2026-10-10'), 1)).toEqual(
      periodoRango('2026-10-11', '2026-10-20'),
    );
  });

  test('etiquetas', () => {
    expect(etiquetaPeriodo(periodoMes('2026-10-10'))).toBe('Octubre 2026');
    expect(etiquetaPeriodo(periodoSemana('2026-10-10'))).toBe('5 al 11 de octubre de 2026');
    expect(etiquetaPeriodo(periodoSemana('2026-10-01'))).toBe('28 de septiembre al 4 de octubre de 2026');
    expect(etiquetaPeriodo(periodoSemana('2026-12-31'))).toBe('28 de diciembre de 2026 al 3 de enero de 2027');
    expect(etiquetaPeriodo(periodoRango('2026-10-01', '2026-10-15'))).toBe('01/10/2026 al 15/10/2026');
  });
});
