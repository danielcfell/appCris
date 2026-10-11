import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { registrarPago } from '../../casos-uso/pagos';
import { obtenerJornal, type JornalDetallado } from '../../datos/jornales';
import { montoEditable, parsearMonto, formatearMonto } from '../../dominio/dinero';
import { validarPago } from '../../dominio/pago';
import { formatearFechaCorta } from '../../dominio/periodo';
import {
  BotonGrande,
  CampoFecha,
  CampoMonto,
  Cargando,
  hoy,
  idDeRuta,
  leerCampo,
  MensajeError,
  medidas,
  Texto,
  useAccion,
  useConsulta,
  volver,
} from '../../ui';

/** Hoja inferior para registrar un pago total o parcial de un jornal (RF-09, RF-12). */
export default function RegistrarPagoRuta() {
  const jornalId = idDeRuta(useLocalSearchParams<{ jornalId: string }>().jornalId) ?? 0;
  const { datos, error } = useConsulta((db) => obtenerJornal(db, jornalId), [jornalId]);
  if (!datos) return <Cargando error={error ?? (datos === null ? 'No se encontró el jornal.' : null)} />;
  return <RegistrarPago jornal={datos} />;
}

function RegistrarPago({ jornal }: { jornal: JornalDetallado }) {
  const { ejecutar, error, ocupado } = useAccion();
  // Prellenado con el saldo: el caso común es pagar todo (3.3).
  const [monto, setMonto] = useState(montoEditable(jornal.saldo));
  const [fecha, setFecha] = useState(hoy());

  // Se valida mientras escribe: un pago mayor al saldo desactiva el botón (RF-12).
  const leido = leerCampo(() => {
    const valor = parsearMonto(monto);
    validarPago(jornal.saldo, valor);
    return valor;
  });

  const guardar = async () => {
    if (leido.valor === null) return;
    const valor = leido.valor;
    if (await ejecutar((db) => registrarPago(db, { jornalId: jornal.id, monto: valor, fecha }))) {
      volver(`/trabajador/${jornal.trabajadorId}`);
    }
  };

  return (
    <View style={{ padding: medidas.espacio, gap: 4 }}>
      <Texto variante="grande">Pago a {jornal.trabajador}</Texto>
      <Texto variante="suave" style={{ marginBottom: medidas.espacio }}>
        {jornal.descripcion} {formatearFechaCorta(jornal.fecha)} · falta {formatearMonto(jornal.saldo)}
      </Texto>
      <MensajeError mensaje={error} />
      <CampoMonto etiqueta="Monto" valor={monto} onCambio={setMonto} error={monto ? leido.error : null} autoFocus />
      <CampoFecha valor={fecha} onCambio={setFecha} />
      <BotonGrande titulo="Registrar pago" onPress={guardar} desactivado={leido.valor === null} ocupado={ocupado} />
    </View>
  );
}
