import { fechaLocal, validarFecha } from './fecha';
import { FechaInvalida } from './errores';

describe('fechas AAAA-MM-DD', () => {
  test.each(['2026-10-10', '2024-02-29', '2026-12-31'])('acepta %p', (texto) => {
    expect(validarFecha(texto)).toBe(texto);
  });

  test.each(['2026-02-29', '2026-13-01', '2026-10-32', '10/10/2026', '2026-1-1', ''])(
    'rechaza %p',
    (texto) => {
      expect(() => validarFecha(texto)).toThrow(FechaInvalida);
    },
  );

  test('fechaLocal usa la fecha local, no UTC', () => {
    expect(fechaLocal(new Date(2026, 9, 10, 23, 59))).toBe('2026-10-10');
    expect(fechaLocal(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05');
  });
});
