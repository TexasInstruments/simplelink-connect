/*
 * Copyright (c) 2023, Texas Instruments Incorporated
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * *  Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *
 * *  Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * *  Neither the name of Texas Instruments Incorporated nor the names of
 *    its contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
 * OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 * EVEN   IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { StyleSheet, ScrollView, Platform, EventSubscription, Alert } from 'react-native';
import BleManager, { PeripheralInfo } from 'react-native-ble-manager';
import DeviceInfo from './DeviceInfo';
import DeviceServices from './DeviceServices';
import DeviceServiceSkeleton from './DeviceServices/DeviceServiceSkeleton';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { DeviceScreenNavigationProp } from '../../../types';
import { getIconByPeripheralInfo } from '../../hooks/uuidToBrand';
import { useServiceViewContext } from '../../context/ServiceViewContext';
import { useSpecificScreenConfigContext } from '../../context/SpecificScreenOptionsContext';
import { ScanOptionsState } from '../../context/ScanOptionsContext';

interface BleDeviceProps {
  peripheralId: string;
  isBonded: boolean;
  isConnected: boolean;
}

interface BleDevicePropsState {
  deviceState: string;
  peripheralInfo?: PeripheralInfo;
}

const initialState: BleDevicePropsState = {
  deviceState: 'not connected',
};

const BleDevice: React.FC<BleDeviceProps> = ({ peripheralId, ...props }) => {
  const [state, setState] = useState<BleDevicePropsState>(initialState);
  const { specificScreenConfig } = useSpecificScreenConfigContext();
  const disconnectInInterval = useRef<boolean>(specificScreenConfig.disconnectInInterval);

  const navigation = useNavigation<DeviceScreenNavigationProp>();
  const { updatePeripheral, hasOadOption } = useServiceViewContext();
  const connectTimeout = useRef<NodeJS.Timeout | null>(null);

  const disconnectSubscription = useRef<EventSubscription | null>(null);
  const bondSubscription = useRef<EventSubscription | null>(null);
  const reconnectionFailed = useRef<boolean>(false);
  const hasOadServiceRef = useRef<boolean>(false);

  const connectionPromises: Record<string, Promise<void> | undefined> = {};
  const connectionTimeouts: Record<string, NodeJS.Timeout | undefined> = {};

  const scanOptions = useContext(ScanOptionsState);

  // --- Discover services ---
  const discover = useCallback(async (id: string) => {
    console.log("discovering services")

    setState(prev => ({ ...prev, deviceState: 'Discovering' }));

    try {
      const peripheralInfo = await BleManager.retrieveServices(id);
      const parsedServices =
        Platform.OS === 'ios'
          ? peripheralInfo.services?.map((uuid: string) => ({ uuid }))
          : peripheralInfo.services;

      if (!peripheralInfo.name) peripheralInfo.name = 'Unknown';
      const infoWithIcon = getIconByPeripheralInfo(peripheralInfo);

      setState(prev => ({
        ...prev,
        deviceState: 'Connected',
        peripheralInfo: { ...infoWithIcon, services: parsedServices },
      }));
    } catch (error) {
      console.log('retrieveServices error:', error);
    }
  }, []);

  // --- Handle a single connection ---
  const handleConnection = (id: string) => {
    if (connectionPromises[id]) return connectionPromises[id];

    const connectionPromise = new Promise<void>(async (resolve, reject) => {
      let resolvedOrRejected = false;

      connectionTimeouts[id] = setTimeout(() => {
        if (!resolvedOrRejected) {
          resolvedOrRejected = true;
          console.log(`Connection timeout for ${id}`);
          reject(new Error(`Connection timeout for ${id}`));
        }
      }, scanOptions.connectionTimeout * 1000);

      try {
        const connectOptions = Platform.OS === 'android' ? { phy: scanOptions.connectionPhy } : undefined;
        await BleManager.connect(id, connectOptions);

        resolvedOrRejected = true;
        clearTimeout(connectionTimeouts[id]);
        delete connectionTimeouts[id];

        console.log(`Connected to ${id}`);
        setState({ deviceState: 'Connected' });

        // Small delay to allow services to stabilize
        setTimeout(async () => {
          try {
            await discover(id);
            resolve();
          } catch (e) {
            console.log(`Discover failed for ${id}:`, e);
            resolve(); // resolve anyway, don't reject here
          }
        }, 150);
      } catch (error) {
        resolvedOrRejected = true;
        clearTimeout(connectionTimeouts[id]);
        delete connectionTimeouts[id];

        console.log(`Connection failed for ${id}:`, error);
        reject(error instanceof Error ? error : new Error('Connection error'));
      }
    });

    connectionPromises[id] = connectionPromise;

    connectionPromise.finally(() => {
      delete connectionPromises[id];
    });

    return connectionPromise;
  };


  // --- Connect wrapper ---
  const connect = (id: string) => {
    setState({ deviceState: 'Connecting', peripheralInfo: undefined });

    if (id !== peripheralId) return;

    // Only set timeout if one isn't already running
    // This prevents resetting the timer with each reconnection attempt
    if (!connectTimeout.current) {
      const timeoutId = setTimeout(async () => {
        console.log('[TIMEOUT] Fired - checking connection status');
        const isConnected = await BleManager.isPeripheralConnected(id, []);
        if (!isConnected) {
          console.log('[TIMEOUT] Device NOT connected - showing alert');
          Alert.alert(
            'Connection Failed',
            'Peripheral connection timeout.',
            [
              {
                text: 'OK',
                style: 'cancel', // appears lighter on iOS
                onPress: () => {
                  reconnectionFailed.current = true;
                  disconnectSubscription.current?.remove();
                  navigation.navigate('Scanner');
                },
              },
            ]
          )
        } else {
          console.log('[TIMEOUT] Device still connected - no alert needed');
        }
      }, scanOptions.connectionTimeout * 1000);

      connectTimeout.current = timeoutId;
      console.log('[CONNECT] Set timeout, will fire in', scanOptions.connectionTimeout, 'seconds');
    } else {
      console.log('[CONNECT] Timeout already active, not setting a new one');
    }

    handleConnection(id)
      .then(() => {
        // Connection successful - clear the timeout
        console.log('[CONNECT] Connection successful, clearing timeout');
        clearTimeout(connectTimeout.current!);
        connectTimeout.current = null;
      })
      .catch(e => {
        console.warn('Connection attempt failed (handled):', e.message || e);
        // Don't clear timeout - let it fire to show alert if reconnection keeps failing
        console.log('[CONNECT] Connection failed, keeping timeout active');
      });
  };

  // --- Effects ---
  useEffect(() => {
    disconnectInInterval.current = specificScreenConfig.disconnectInInterval;
  }, [specificScreenConfig.disconnectInInterval]);

  useEffect(() => {
    BleManager.isPeripheralConnected(peripheralId, []).then(isConnected => {
      if (!isConnected) connect(peripheralId);
    });

    return () => clearTimeout(connectTimeout.current!);
  }, [peripheralId]);

  useFocusEffect(
    useCallback(() => {
      const onDisconnect = () => {
        console.log('[DISCONNECT] Device disconnected');
        setState({ deviceState: 'Disconnected' });

        console.log("hasOadServiceRef.current", hasOadServiceRef.current, "!!!!!!!!!!!!!!")

        // Decide whether to reconnect
        const shouldReconnect = !disconnectInInterval.current && !reconnectionFailed.current && !hasOadServiceRef.current;

        if (shouldReconnect) {
          // Will reconnect - keep timeout active to track total reconnection time
          console.log('[DISCONNECT] Will reconnect, keeping timeout active');
          connect(peripheralId);
        } else {
          // Won't reconnect (MS-OAD or other reason) - clear timeout to prevent false alerts
          console.log('[DISCONNECT] Not reconnecting, clearing timeout');
          if (connectTimeout.current) {
            clearTimeout(connectTimeout.current);
            connectTimeout.current = null;
          }
        }
      };

      disconnectSubscription.current?.remove();
      disconnectSubscription.current = BleManager.onDisconnectPeripheral(onDisconnect);

      BleManager.isPeripheralConnected(peripheralId, []).then(isConnected => {
        if (isConnected) discover(peripheralId);
        else connect(peripheralId);
      });

      return () => {
        clearTimeout(connectTimeout.current!);
        // disconnectSubscription.current?.remove();
        if (Platform.OS === 'android') {
          bondSubscription.current?.remove();
        }
      };
    }, [peripheralId])
  );

  useEffect(() => {
    if (state.peripheralInfo) updatePeripheral(state.peripheralInfo);
  }, [state, updatePeripheral]);

  // Sync ref with context state
  useEffect(() => {
    hasOadServiceRef.current = hasOadOption;
  }, [hasOadOption]);

  return (
    <ScrollView style={[styles.container]} contentContainerStyle={styles.scrollViewContainer}>
      <DeviceInfo
        peripheralId={peripheralId}
        peripheralInfo={state.peripheralInfo}
        deviceState={state.deviceState}
        discover={discover}
        connect={connect}
        {...props} />
      <DeviceServices peripheralInfo={state.peripheralInfo} />
      {state.deviceState !== 'Connected' && <DeviceServiceSkeleton />}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollViewContainer: {
    paddingBottom: 20,
  },
});

export default BleDevice;
