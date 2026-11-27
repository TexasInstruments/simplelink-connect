import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BleManager from 'react-native-ble-manager';
import { createGateway } from '@spotflow/react-native-ble-gateway';
import { bleManagerLink } from '@spotflow/react-native-ble-gateway-ble-manager';
import { RelayController } from '../spotflow/RelayController';

const STORAGE_KEY = '@spotflow/enabled';

type StorageError = 'load' | 'enable' | 'disable';

interface SpotflowContextValue {
  controller: RelayController;
  supported: boolean;
  enabled: boolean;
  loading: boolean;
  storageError: StorageError | undefined;
  setEnabled(value: boolean): Promise<void>;
}

const SpotflowContext = createContext<SpotflowContextValue | undefined>(undefined);

export function SpotflowProvider({ children }: React.PropsWithChildren) {
  const supported = Platform.OS === 'android';
  const [controller] = useState(() => new RelayController({
    createGateway: () => createGateway({ ingestKeySource: 'device', otaEnabled: false }),
    isBonded: async id => (await BleManager.getBondedPeripherals()).some(p => p.id.toUpperCase() === id.toUpperCase()),
    requestMtu: (id, mtu) => BleManager.requestMTU(id, mtu),
    createLink: (id, mtu) => bleManagerLink(id, { mtu }),
  }));
  const [enabled, setPreference] = useState(false);
  const relayEnabledRef = useRef(false);
  const preferenceRevision = useRef(0);
  const writes = useRef(Promise.resolve());
  const [loading, setLoading] = useState(supported);
  const [storageError, setStorageError] = useState<StorageError>();

  const applyRelayPreference = useCallback((value: boolean) => {
    relayEnabledRef.current = value;
    controller.setRunning(value && AppState.currentState === 'active');
  }, [controller]);

  useEffect(() => {
    if (!supported) return;
    let mounted = true;
    writes.current.then(() => AsyncStorage.getItem(STORAGE_KEY)).then(value => {
      if (!mounted) return;
      const restored = value === 'true';
      setPreference(restored);
      applyRelayPreference(restored);
    }).catch(() => {
      if (mounted) setStorageError('load');
    }).finally(() => {
      if (mounted) setLoading(false);
    });

    const disconnect = BleManager.onDisconnectPeripheral(event => controller.disconnect(event.peripheral));
    const bond = BleManager.onPeripheralDidBond(event => controller.bonded(event.id));
    const appState = AppState.addEventListener('change', state => controller.setRunning(relayEnabledRef.current && state === 'active'));
    const diagnostics = setInterval(() => {
      if (relayEnabledRef.current) void controller.refreshCloudStatus();
    }, 1000);
    return () => {
      mounted = false;
      ++preferenceRevision.current;
      disconnect.remove();
      bond.remove();
      appState.remove();
      clearInterval(diagnostics);
      applyRelayPreference(false);
    };
  }, [supported, controller, applyRelayPreference]);

  const value = useMemo(() => ({
    controller, supported, enabled, loading, storageError,
    setEnabled(next: boolean) {
      if (!supported || loading) return Promise.resolve();
      const revision = ++preferenceRevision.current;
      setPreference(next);
      setStorageError(undefined);
      if (!next) applyRelayPreference(false);

      // Serialize writes so a slower, earlier tap cannot overwrite the latest choice.
      writes.current = writes.current.then(async () => {
        if (revision !== preferenceRevision.current) return;
        try {
          await AsyncStorage.setItem(STORAGE_KEY, String(next));
        } catch {
          if (revision === preferenceRevision.current) {
            // Never resume sending because saving an opt-out failed.
            setPreference(false);
            setStorageError(next ? 'enable' : 'disable');
            applyRelayPreference(false);
          }
          return;
        }
        // An opt-in is visible immediately, but relaying waits for the choice to be saved.
        if (revision === preferenceRevision.current) applyRelayPreference(next);
      });
      return writes.current;
    },
  }), [controller, supported, enabled, loading, storageError, applyRelayPreference]);

  return <SpotflowContext.Provider value={value}>{children}</SpotflowContext.Provider>;
}

export function useSpotflow() {
  const context = useContext(SpotflowContext);
  if (!context) throw new Error('SpotflowProvider is missing');
  return context;
}

export function useSpotflowStatus(id: string) {
  const { controller } = useSpotflow();
  return useSyncExternalStore(controller.subscribe, () => controller.status(id), () => undefined);
}
