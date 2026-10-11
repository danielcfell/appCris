import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { resumenDePeriodo } from '../../datos/resumenes';
import { formatearMonto, type Centavos } from '../../dominio/dinero';
import { periodoMes, periodoRango, periodoSemana, type Periodo, type TipoPeriodo } from '../../dominio/periodo';
import {
  CampoFecha,
  Cargando,
  Chips,
  colores,
  hoy,
  Pantalla,
  Seccion,
  SelectorPeriodo,
  Tarjeta,
  Texto,
  useConsulta,
} from '../../ui';

const TIPOS: { clave: TipoPeriodo; etiqueta: string }[] = [
  { clave: 'semana', etiqueta: 'Semana' },
  { clave: 'mes', etiqueta: 'Mes' },
  { clave: 'rango', etiqueta: 'Rango' },
];

/**
 * Resumen de un período: mano de obra (lo trabajado, pagado o no), total por categoría y total general (RF-20).
 */
export default function Resumen() {
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoMes(hoy()));
  const { datos, error } = useConsulta((db) => resumenDePeriodo(db, periodo.desde, periodo.hasta), [periodo.desde, periodo.hasta]);

  const cambiarTipo = (tipo: TipoPeriodo) => {
    if (tipo === 'semana') setPeriodo(periodoSemana(hoy()));
    else if (tipo === 'mes') setPeriodo(periodoMes(hoy()));
    else setPeriodo(periodoRango(periodo.desde, periodo.hasta));
  };

  const filas = datos
    ? [{ clave: 'mano-de-obra', nombre: 'Mano de obra', total: datos.manoDeObra }].concat(
        datos.porCategoria.map((c) => ({ clave: `categoria-${c.categoriaId}`, nombre: c.nombre, total: c.total })),
      )
    : [];
  const maximo = Math.max(1, ...filas.map((f) => f.total));

  return (
    <Pantalla>
      <Chips opciones={TIPOS} seleccionada={periodo.tipo} onSeleccionar={cambiarTipo} />
      {periodo.tipo === 'rango' ? (
        <View style={estilos.rango}>
          <View style={{ flex: 1 }}>
            <CampoFecha etiqueta="Desde" valor={periodo.desde} onCambio={(desde) => setPeriodo(periodoRango(desde, periodo.hasta))} />
          </View>
          <View style={{ flex: 1 }}>
            <CampoFecha etiqueta="Hasta" valor={periodo.hasta} onCambio={(hasta) => setPeriodo(periodoRango(periodo.desde, hasta))} />
          </View>
        </View>
      ) : null}
      <SelectorPeriodo periodo={periodo} onCambio={setPeriodo} />

      {!datos ? (
        <Cargando error={error} />
      ) : (
        <>
          <Tarjeta>
            <Texto variante="seccion">TOTAL GASTADO</Texto>
            <Texto variante="total" accessibilityLabel={`Total gastado: ${formatearMonto(datos.total)}`}>
              {formatearMonto(datos.total)}
            </Texto>
          </Tarjeta>
          {filas.map((f) => (
            <FilaBarra key={f.clave} nombre={f.nombre} total={f.total} maximo={maximo} />
          ))}
          <Seccion titulo="De mano de obra">
            <View style={estilos.linea}>
              <Texto>Pagado</Texto>
              <Texto>{formatearMonto(datos.manoDeObraPagada)}</Texto>
            </View>
            <View style={estilos.linea}>
              <Texto>Falta</Texto>
              <Texto>{formatearMonto(datos.manoDeObraPendiente)}</Texto>
            </View>
          </Seccion>
        </>
      )}
    </Pantalla>
  );
}

function FilaBarra({ nombre, total, maximo }: { nombre: string; total: Centavos; maximo: Centavos }) {
  return (
    <View style={estilos.filaBarra} accessible accessibilityLabel={`${nombre}: ${formatearMonto(total)}`}>
      <View style={estilos.linea}>
        <Texto>{nombre}</Texto>
        <Texto variante="grande">{formatearMonto(total)}</Texto>
      </View>
      <View style={estilos.pista}>
        <View style={[estilos.barra, { width: `${(total / maximo) * 100}%` }]} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  rango: { flexDirection: 'row', gap: 12 },
  linea: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  filaBarra: { paddingVertical: 8, gap: 6, borderBottomWidth: 1, borderBottomColor: colores.separador },
  pista: { height: 12, borderRadius: 6, backgroundColor: colores.superficie, overflow: 'hidden' },
  barra: { height: 12, borderRadius: 6, backgroundColor: colores.primario },
});
