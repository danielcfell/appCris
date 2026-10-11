/**
 * Tema para uso en campo (RNF-05): alto contraste sobre fondo claro, texto base de 18 sp
 * y botones de al menos 56 dp. No hay tema oscuro en el MVP.
 */
export const colores = {
  fondo: '#FFFFFF',
  superficie: '#F1F4EE',
  texto: '#111111',
  textoSuave: '#3D3D3D',
  borde: '#8C8C8C',
  separador: '#D6D6D6',
  primario: '#1B5E20',
  sobrePrimario: '#FFFFFF',
  seleccion: '#DCEDDC',
  peligro: '#B3261E',
  // Estados del jornal (RF-10). Siempre van con la palabra, no solo el color.
  pendiente: '#B3261E',
  parcial: '#8A4B00',
  pagado: '#1B5E20',
} as const;

export const tamanos = {
  pequeno: 16,
  normal: 18,
  grande: 22,
  titulo: 26,
  total: 36,
} as const;

export const medidas = {
  botonAlto: 56,
  chipAlto: 48,
  filaAlta: 64,
  espacio: 16,
  radio: 10,
} as const;
