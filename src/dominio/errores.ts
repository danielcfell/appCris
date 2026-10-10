/**
 * Errores de negocio. El mensaje está en español y se puede mostrar tal cual al usuario.
 */
export class ErrorDominio extends Error {
  constructor(
    readonly codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorDominio';
  }
}

export class MontoInvalido extends ErrorDominio {
  constructor(mensaje = 'El monto no es válido.') {
    super('MONTO_INVALIDO', mensaje);
  }
}

export class CantidadInvalida extends ErrorDominio {
  constructor(mensaje = 'La cantidad no es válida.') {
    super('CANTIDAD_INVALIDA', mensaje);
  }
}

export class FechaInvalida extends ErrorDominio {
  constructor(texto: string) {
    super('FECHA_INVALIDA', `La fecha "${texto}" no es válida.`);
  }
}

export class PagoExcedeSaldo extends ErrorDominio {
  constructor(saldoTexto: string) {
    super('PAGO_EXCEDE_SALDO', `El pago no puede ser mayor a ${saldoTexto}.`);
  }
}

export class MontoMenorQuePagado extends ErrorDominio {
  constructor(pagadoTexto: string) {
    super('MONTO_MENOR_QUE_PAGADO', `El monto no puede ser menor a lo ya pagado (${pagadoTexto}).`);
  }
}

export class DatoRequerido extends ErrorDominio {
  constructor(campo: string) {
    super('DATO_REQUERIDO', `Falta ${campo}.`);
  }
}

export class NoEncontrado extends ErrorDominio {
  constructor(que: string) {
    super('NO_ENCONTRADO', `No se encontró ${que}.`);
  }
}

export class OperacionNoPermitida extends ErrorDominio {
  constructor(mensaje: string) {
    super('OPERACION_NO_PERMITIDA', mensaje);
  }
}
