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

const BleDevice: React.FC<BleDeviceProps> = (props: BleDeviceProps) => {
  const [state, setState] = useState<BleDevicePropsState>(initialState);
  let navigation = useNavigation<DeviceScreenNavigationProp>();
  const { updatePeripheral } = useServiceViewContext();
  let connectTimeout = useRef<any>(null);

  const discover = useCallback(
    (peripheralId: string) => {
      let emptyPeripheralInfo: PeripheralInfo = {
        id: peripheralId,
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
        filter: false
      };
      setState((prev) => ({
        ...prev,
        deviceState: 'Discovering',
        peripheralInfo: emptyPeripheralInfo,
      }));


      BleManager.retrieveServices(peripheralId)
        .then((peripheralInfo) => {
          let services: any = peripheralInfo.services;
          let parsedServices =
            Platform.OS === 'ios' ? services.map((uuid: string) => ({ uuid })) : services;

          if (peripheralInfo.name == null) {
            peripheralInfo.name = 'Unknown';
          }

          peripheralInfo = getIconByPeripheralInfo(peripheralInfo)

          setState((prev) => ({
            ...prev,
            deviceState: 'Connected',
            peripheralInfo: {
              ...peripheralInfo,
              services: parsedServices,
            },
          }));

          Promise.resolve();
        })
        .catch((error) => {
          console.log('retrieveServices: ', error);
          Promise.resolve();
        });
    },
    [props.peripheralId, state.deviceState]
  );

  const connectionPromises: Promise<void>[] = [];

  function handleConnection(peripheralId: string): void {
    // Check if there are any pending connection promises
    if (connectionPromises.length > 0) {
      console.log('Another connection is already in progress');
      return;
    }

    // Create a new promise for the connection
    const connectionPromise: Promise<void> = new Promise((resolve, reject) => {
      BleManager.connect(peripheralId)
        .then(() => {
          console.log('Connected');
          setState({
            deviceState: 'Connected',
          });
          clearTimeout(connectTimeout.current);
          discover(peripheralId);
          resolve(); // Resolve the promise on successful connection
        })
        .catch((error) => {
          console.log('connect: ', error);
          clearTimeout(connectTimeout.current);
          reject(error); // Reject the promise on connection error
        });
    });

    // Add the promise to the global array
    connectionPromises.push(connectionPromise);

    // Execute the connection promise
    connectionPromise
      .then(() => {
        // Connection resolved, remove it from the array
        const index = connectionPromises.indexOf(connectionPromise);
        if (index !== -1) {
          connectionPromises.splice(index, 1);
        }
      })
      .catch(() => {
        // Connection rejected, remove it from the array
        const index = connectionPromises.indexOf(connectionPromise);
        if (index !== -1) {
          connectionPromises.splice(index, 1);
        }
      });
  }

  const connect = (peripheralId: string) => {
    setState({
      deviceState: 'Connecting',
      peripheralInfo: undefined,
    });

    console.log('connect: ', peripheralId);
    console.log('expected: ', props.peripheralId);

    if (peripheralId === props.peripheralId) {
      console.log('connect: started timeout');
      connectTimeout.current = setTimeout(() => {
        BleManager.isPeripheralConnected(props.peripheralId, []).then((isConnected) => {
          if (isConnected) {
            console.log('BleDevice: Peripheral is connected!');
          } else {
            console.log('Peripheral connection timeout');
            alert('Peripheral connection timeout');
            clearTimeout(connectTimeout.current);
            navigation.navigate('Scanner');
          }
        });
      }, 5000);

      console.log('handleConnection');
      handleConnection(peripheralId);
    }
  };

  useEffect(() => {
    BleManager.isPeripheralConnected(props.peripheralId, []).then((isConnected) => {
      if (isConnected) {
        console.log('BleDevice: Peripheral is connected!');
      } else {
        console.log('BleDevice: Peripheral is NOT connected!');
        connect(props.peripheralId);
      }
    });

    return () => {
      console.log('Cleared');
      clearTimeout(connectTimeout.current);
    };
  }, []);

  useEffect(() => {
    console.log('BleDevice componentDidUpdate peripheral id', props.peripheralId);

    const BleManagerModule = NativeModules.BleManager;
    const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);
    bleManagerEmitter.removeAllListeners('BleManagerDisconnectPeripheral');
    bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', () => {
      setState({
        deviceState: 'Disconnected',
      });

      connect(props.peripheralId);
    });

    if (props.peripheralId !== props.peripheralId) {
      connect(props.peripheralId);
    }

    return () => {
      console.log('Removing all listeners');

      bleManagerEmitter.removeAllListeners('BleManagerDisconnectPeripheral');
      if (Platform.OS == 'android') {
        bleManagerEmitter.removeAllListeners('BleManagerPeripheralDidBond');
      }
    };
  }, [props.peripheralId]);

  useFocusEffect(
    useCallback(() => {
      // The screen is focused
      // Call any action
      console.log('focus:', props.peripheralId);
      console.log('focus: deviceState', state);

      console.log('focus: check connected');

      BleManager.isPeripheralConnected(props.peripheralId, []).then((isConnected) => {
        if (isConnected) {
          console.log('focus: Peripheral is connected!');

          discover(props.peripheralId);

          //Did not mount, set disconnect callback here
          const BleManagerModule = NativeModules.BleManager;
          const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);
          bleManagerEmitter.removeAllListeners('BleManagerDisconnectPeripheral');
          bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', () => {
            setState({
              deviceState: 'Disconnected',
            });

            connect(props.peripheralId);
          });
        } else {
          console.log('focus: Not connect, connect');
          connect(props.peripheralId);
        }
      });

      return () => {
        clearTimeout(connectTimeout.current);
      };
    }, [props.peripheralId])
  );

  useEffect(() => {
    if (state.peripheralInfo) {
      updatePeripheral(state.peripheralInfo)
    }
  }, [state])

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
