import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import BleManager from 'react-native-ble-manager';
import { Text, TouchableOpacity } from '../components/Themed';
import Colors from '../constants/Colors';
import { useSpotflow, useSpotflowStatus } from '../context/SpotflowContext';
import { isRetryableStatus, type RelayStatus } from './RelayController';

const statusText: Record<RelayStatus, { label: string; detail?: string }> = {
  starting: { label: 'Starting' },
  pairing: { label: 'Waiting for pairing', detail: 'Tap Pair and accept the Android pairing prompt.' },
  relaying: { label: 'Relaying' },
  buffering: { label: 'Buffering', detail: 'Waiting for the cloud connection.' },
  'ingest-key': { label: 'Invalid ingest key', detail: 'Could not read a valid ingest key from the device.' },
  auth: { label: 'Credentials rejected', detail: 'Spotflow rejected the device credentials.' },
  'auth-failed': { label: 'Credentials rejected', detail: 'Check the device credentials, then retry.' },
  failed: { label: 'Failed', detail: 'Could not start or maintain the relay.' },
};

/** Rendered directly below the connection state, as a second row of the same bar. */
export function SpotflowRelayStatus({ peripheralId }: { peripheralId: string }) {
  const { controller } = useSpotflow();
  const status = useSpotflowStatus(peripheralId);
  const focused = useIsFocused();
  const { fontScale } = useWindowDimensions();
  // Keep the attempt across reconnects and Android pairing dialogs, but not a new navigation visit.
  const attempted = useRef(false);
  const pending = useRef(false);
  const [pairing, setPairing] = useState(false);
  const [pairingFailed, setPairingFailed] = useState(false);

  const pair = useCallback(async () => {
    attempted.current = true;
    if (pending.current) return;
    pending.current = true;
    setPairing(true);
    setPairingFailed(false);
    try {
      await BleManager.createBond(peripheralId);
      // A successful call can also mean the device was already bonded, with no new bond event.
      controller.bonded(peripheralId);
    } catch {
      setPairingFailed(true);
    } finally {
      pending.current = false;
      setPairing(false);
    }
  }, [controller, peripheralId]);

  useEffect(() => {
    // DeviceTab stays mounted when returning to the scanner.
    if (!focused) {
      attempted.current = false;
      setPairingFailed(false);
      return;
    }
    if (status === 'pairing' && AppState.currentState === 'active' && !attempted.current) {
      void pair();
    }
  }, [focused, pair, status]);

  if (!status) return null;
  const { label } = statusText[status];
  const detail = status === 'pairing' && pairingFailed
    ? 'Pairing didn’t complete. Tap Pair to retry, or pair from Android Bluetooth settings.'
    : statusText[status].detail;

  return (
    <View style={styles.container} testID="spotflowRelayStatus" accessibilityLiveRegion="polite">
      <View style={styles.row}>
        <Text style={{ fontSize: 15 / fontScale }}>
          Spotflow Gateway:{' '}
          <Text style={{ fontWeight: 'bold' }}>{label}</Text>
        </Text>
        {status === 'pairing' && (
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: pairing }}
            disabled={pairing} style={styles.retry} onPress={() => { void pair(); }}>
            <Text style={[styles.retryText, { fontSize: 15 / fontScale }]}>{pairing ? 'Pairing…' : 'Pair'}</Text>
          </TouchableOpacity>
        )}
        {isRetryableStatus(status) && (
          <TouchableOpacity accessibilityRole="button" style={styles.retry} onPress={() => controller.retry(peripheralId)}>
            <Text style={[styles.retryText, { fontSize: 15 / fontScale }]}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
      {detail && <Text style={[styles.detail, { fontSize: 13 / fontScale }]}>{detail}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.lightGray,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  retry: {
    marginLeft: 'auto',
    backgroundColor: Colors.lightGray,
  },
  retryText: {
    color: Colors.blue,
    fontWeight: 'bold',
  },
  detail: {
    color: Colors.gray,
    paddingTop: 4,
  },
});
