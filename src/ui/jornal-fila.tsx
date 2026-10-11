import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Jornal } from '../datos/jornales';
import { formatearCantidad, formatearMonto } from '../dominio/dinero';
import { estadoJornal, nombreUnidad } from '../dominio/jornal';
import { EtiquetaEstado } from './listas';
import { colores } from './tema';
import { Texto } from './texto';

/** Un jornal: título, "1 día × $20,00", monto, estado y lo que falta (RF-10). `acciones` va a la derecha. */
export function JornalFila({ jornal, titulo, acciones }: { jornal: Jornal; titulo: string; acciones?: ReactNode }) {
  const estado = estadoJornal(jornal.monto, jornal.pagado);
  return (
    <View style={estilos.fila}>
      <Texto variante="grande">{titulo}</Texto>
      <View style={estilos.linea}>
        <Texto variante="suave" style={{ flex: 1 }}>
          {formatearCantidad(jornal.cantidad)} {nombreUnidad(jornal.unidad, jornal.cantidad)} × {formatearMonto(jornal.tarifa)}
        </Texto>
        <Texto variante="grande">{formatearMonto(jornal.monto)}</Texto>
      </View>
      <View style={estilos.linea}>
        <View style={{ flex: 1, gap: 4 }}>
          <EtiquetaEstado estado={estado} />
          {estado === 'parcial' ? (
            <Texto variante="pequeno">
              Pagó {formatearMonto(jornal.pagado)} · falta {formatearMonto(jornal.saldo)}
            </Texto>
          ) : null}
        </View>
        {acciones}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { paddingVertical: 12, gap: 4, borderBottomWidth: 1, borderBottomColor: colores.separador },
  linea: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
