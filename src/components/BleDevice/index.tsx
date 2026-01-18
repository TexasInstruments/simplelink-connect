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

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NativeModules, NativeEventEmitter, StyleSheet, ScrollView, Platform } from 'react-native';
import BleManager, { PeripheralInfo } from 'react-native-ble-manager';
import DeviceInfo from './DeviceInfo';
import DeviceServices from './DeviceServices';
import DeviceServiceSkeleton from './DeviceServices/DeviceServiceSkeleton';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { DeviceScreenNavigationProp } from '../../../types';
import { getIconByPeripheralInfo } from '../../hooks/uuidToBrand';
import { useServiceViewContext } from '../../context/ServiceViewContext';
import { useSpecificScreenConfigContext } from '../../context/SpecificScreenOptionsContext';

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
  const { updatePeripheral } = useServiceViewContext();
  const connectTimeout = useRef<NodeJS.Timeout | null>(null);

  const BleManagerModule = NativeModules.BleManager;
  const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

  const connectionPromises: Record<string, Promise<void> | undefined> = {};
  const connectionTimeouts: Record<string, NodeJS.Timeout | undefined> = {};

  // --- Discover services ---
  const discover = useCallback(async (id: string) => {
    const emptyPeripheralInfo: PeripheralInfo = {
      id,
      rssi: -40,
      advertising: {},
      showAdvertising: false,
      isBonded: false,
      isConnected: false,
      services: [],
      advertiesmentCount: 0,
      prevAdvertismentCount: 0,
      advertismentActive: 0,
      advertismentInActive: false,
      filter: false,
    };

    setState(prev => ({ ...prev, deviceState: 'Discovering', peripheralInfo: emptyPeripheralInfo }));

    try {
      const peripheralInfo = await BleManager.retrieveServices(id);
      const parsedServices =
        Platform.OS === 'ios'
          ? peripheralInfo.services.map((uuid: string) => ({ uuid }))
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
      }, 5000);

      try {
        await BleManager.connect(id);

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

    connectTimeout.current = setTimeout(async () => {
      const isConnected = await BleManager.isPeripheralConnected(id, []);
      if (!isConnected) {
        console.log('Peripheral connection timeout');
        alert('Peripheral connection timeout');
      } else {
        console.log('Peripheral already connected, clearing timeout');
      }
    }, 5000);

    handleConnection(id)
      .catch(e => console.warn('Connection attempt failed (handled):', e.message || e))
      .finally(() => clearTimeout(connectTimeout.current!));
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
        setState({ deviceState: 'Disconnected' });
        if (!disconnectInInterval.current) connect(peripheralId);
      };

      bleManagerEmitter.removeAllListeners('BleManagerDisconnectPeripheral');
      bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', onDisconnect);

      BleManager.isPeripheralConnected(peripheralId, []).then(isConnected => {
        if (isConnected) discover(peripheralId);
        else connect(peripheralId);
      });

      return () => {
        clearTimeout(connectTimeout.current!);
        bleManagerEmitter.removeAllListeners('BleManagerDisconnectPeripheral');
        if (Platform.OS === 'android') {
          bleManagerEmitter.removeAllListeners('BleManagerPeripheralDidBond');
        }
      };
    }, [peripheralId])
  );

  useEffect(() => {
    if (state.peripheralInfo) updatePeripheral(state.peripheralInfo);
  }, [state, updatePeripheral]);

  return (
    <ScrollView style={[styles.container]} contentContainerStyle={styles.scrollViewContainer}>
      <DeviceInfo
        peripheralInfo={state.peripheralInfo}
        deviceState={state.deviceState}
        discover={discover}
        connect={connect}
        {...props}
      />
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
