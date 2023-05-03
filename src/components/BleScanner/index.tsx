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
 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import {
  NativeModules,
  NativeEventEmitter,
  Platform,
  PermissionsAndroid,
  View,
  Text,
  TouchableOpacity
} from 'react-native';
import React, { useState, useEffect, useMemo, useContext, useRef, useCallback, memo } from 'react';
import BleManager, { Peripheral } from 'react-native-ble-manager';
import { RootTabScreenProps, ScanScreenNavigationProp } from '../../../types';
import EnablerSection from './EnablerSection';
//import { PureScannedDevice } from './ListSection/ScannedDevice';
import ScannedDevice from './ListSection/ScannedDevice';
import Separator from '../Separator';
import ScanningSkeleton from './ListSection/ListSkeleton';
import { FilterSortState } from '../../../context/FilterSortContext';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import Colors from '../../../constants/Colors';

interface Props extends RootTabScreenProps<'ScanTab'> {}

const BleScanner: React.FC<Props> = () => {
  let navigation = useNavigation<ScanScreenNavigationProp>();

  let scannedPeriphs = useRef<BleManager.Peripheral[]>([]);
  let lastScannedPeriphs = useRef<BleManager.Peripheral[]>([]);


  const [scanEnable, setScanEnable] = useState<boolean>(false);
  const [peripherals, setPeripherals] = useState<Peripheral[]>([]);
  const [doSort, setDoSort] = useState<Boolean>(false);

  const BleManagerModule = NativeModules.BleManager;
  const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

  let fsContext = useContext(FilterSortState);

  let removeCheckInterval = 0;

  useEffect(() => {

    const unsubscribe = navigation.addListener('focus', () => {
      console.log('BleScanner focus', navigation)
      console.log('BleScanner: ', BleScanner)
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    BleManager.start({ showAlert: true });

    requestAndroidPermissions().then(() => {
      bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral);
    });

    return () => {
      bleManagerEmitter.removeAllListeners('BleManagerDiscoverPeripheral');
      bleManagerEmitter.removeAllListeners('BleManagerStopScan');
    };
  }, []);

  useEffect(() => {
    //console.debug('useMemo: scanEnable ', scanEnable)
    if (!scanEnable) {
      bleManagerEmitter.removeAllListeners('BleManagerDiscoverPeripheral');
      bleManagerEmitter.removeAllListeners('BleManagerStopScan');
    } else {
      scannedPeriphs.current = [];
      setPeripherals([]);
      bleManagerEmitter.addListener('BleManagerStopScan', handleStopScan);
      bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral);
    }

    scan(scanEnable);
  }, [scanEnable]);

  let filteredPeripherals = useMemo(() => {
    //console.debug('useMemo: peripherals updated ')

    if (fsContext.filter.connectable) {
      //console.debug('[Filter] By Connectable');

      scannedPeriphs.current = scannedPeriphs.current.filter((a) => a.advertising.isConnectable);
    }

    if (fsContext.filter.app_name.enabled && fsContext.filter.app_name.value !== '') {
      //console.debug('[Filter] By App Name');

      scannedPeriphs.current = scannedPeriphs.current.filter((a) =>
        a.name
          ?.trim()
          .toLocaleLowerCase()
          .includes(fsContext.filter.app_name.value.trim().toLocaleLowerCase())
      );
    }

    if (fsContext.filter.rssi.enabled && fsContext.filter.rssi.value !== '') {
      //console.debug('[Filter] By Rssi');

      scannedPeriphs.current = scannedPeriphs.current.filter((a) => {
        return Math.abs(a.rssi) <= Math.abs(parseInt(fsContext.filter.rssi.value));
      });
    }

    scannedPeriphs.current = scannedPeriphs.current.filter(
      (value, index, self) => index === self.findIndex((t) => t.id === value.id)
    );

    return scannedPeriphs.current;
  }, [
    fsContext.filter.connectable,
    fsContext.filter.app_name.enabled,
    fsContext.filter.app_name.value,
    fsContext.filter.rssi.value,
    fsContext.filter.rssi.enabled,
    peripherals,
  ]);

  const sortPeripheral = useMemo(() => {
    console.debug('sortPeripheral')

    if (fsContext.sort.app_name) {
      //console.debug('[Sort] By App name');
      scannedPeriphs.current = scannedPeriphs.current.sort((a, b) => {
        if (a.name && b.name) {
          if (a.name < b.name) return -1;
          if (a.name > b.name) return 1;

          return 0;
        }
        return 0;
      });
    }

    if (fsContext.sort.rssi) {
      //console.debug('[Sort] By Rssi');
      scannedPeriphs.current = scannedPeriphs.current.sort((a, b) => {
        let aRssi = Math.abs(a.rssi);
        let bRssi = Math.abs(b.rssi);

        if (aRssi < bRssi) return -1;
        if (aRssi > bRssi) return 1;

        return 0;
      });
    }
  }, [doSort]);

  function filterPeripheral(peripheral: Peripheral): boolean {
    if (fsContext.filter.connectable) {
      //console.debug('filteredPeripheral By Connectable');
      if (!peripheral.advertising.isConnectable) {
        //console.debug('filteredPeripheral filtered');
        return false;
      }
    }

    if (fsContext.filter.app_name.enabled && fsContext.filter.app_name.value !== '') {
      //console.debug('filteredPeripheral By App Name');

      if (
        !peripheral.name
          ?.trim()
          .toLocaleLowerCase()
          .includes(fsContext.filter.app_name.value.trim().toLocaleLowerCase())
      ) {
        //console.debug('filteredPeripheral filtered');
        return false;
      }
    }

    if (fsContext.filter.rssi.enabled && fsContext.filter.rssi.value !== '') {
      //console.debug('filteredPeripheral By Rssi');

      if (Math.abs(peripheral.rssi) <= Math.abs(parseInt(fsContext.filter.rssi.value))) {
        //console.debug('filteredPeripheral filtered');
        return false;
      }
    }

    return true;
  }

  async function requestAndroidPermissions(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        //'Request multiple andorid bluetooth permissions'
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        ]);

        //console.debug('Granted android permissions');

        Promise.resolve();
      } catch (error) {
        //console.debug(error);
      }
    }
  }

  function handleDiscoverPeripheral(peripheral: Peripheral): void {
    if (!lastScannedPeriphs.current.map((ele: any) => ele.id).includes(peripheral.id)) {
      lastScannedPeriphs.current.push(peripheral);
    }

    if (!peripheral.name || peripheral.name === null || typeof peripheral.name === 'undefined') {
      peripheral.name = 'Name Unknown';
    }

    let found =
      scannedPeriphs.current.filter((ele) => ele.id == peripheral.id).length > 0 ? true : false;

    /* Simulate high volume of devices - note will not connect due to pripheral.id changed */
    // if (scannedPeriphs.current.length > 600) {
    //   scannedPeriphs.current = [];
    //   setPeripherals([]);
    // }
    // found = false;
    // peripheral.showAdvertising = false;
    // peripheral.id = peripheral.id + scannedPeriphs.current.length.toString();

    if (!found) {
      /* Add new device */
      // console.debug('New device ', peripheral.id);
      peripheral.showAdvertising = false;
      scannedPeriphs.current.push(peripheral);
      setPeripherals((prev) => [...prev, peripheral]);
    } else {
      let periphIdx = scannedPeriphs.current.findIndex((device) => device.id === peripheral.id);
      if (scannedPeriphs.current[periphIdx].rssi !== peripheral.rssi) {
        //console.log('rssi changed', peripheral.id);
        scannedPeriphs.current[periphIdx].rssi = peripheral.rssi;
        setPeripherals((prev) => [...prev, peripheral]);
      }
    }
  }

  function handleStopScan(): void {
    removeCheckInterval = removeCheckInterval + 1

    /* remove devices on 3rd scan (every 15s) */
    if(removeCheckInterval === 2) {
      /* filter out devices not discovered in this scan */
      for (let pIdx = 0; pIdx < scannedPeriphs.current.length; pIdx++) {
        if (
          !lastScannedPeriphs.current
            .map((ele: any) => ele.id)
            .includes(scannedPeriphs.current[pIdx].id)
        ) {
          //console.debug('device removed ', scannedPeriphs[pIdx].id)
          scannedPeriphs.current.splice(pIdx, 1);
        }
      }
      lastScannedPeriphs.current = [];

      removeCheckInterval = 0;
    }

    scan(true);
  }

  function scan(enabled: boolean): void {
    //console.debug('startScan ', enabled)

    if (enabled) {
      BleManager.scan([], 5, false);
    } else {
      BleManager.stopScan();
    }
  }

  const requestConnect = useCallback((peripheralId: string) => {
    // console.debug('requestConnect: ', peripheralId);

    setScanEnable(false);

    onConnectRequest!(peripheralId);
  }, []);

  const scanSwitchEnabler = useCallback((state: boolean) => {
    setScanEnable(state);
  }, []);

  const onConnectRequest = useCallback((p: string) => {
    navigation.navigate('DeviceTab', {
      peripheralId: p,
    });
  }, []);

  const toggleAdvertising = useCallback((peripheralId: string) => {
    scannedPeriphs.current = scannedPeriphs.current.map((item) =>
      item.id === peripheralId ? { ...item, showAdvertising: !item.showAdvertising } : item
    );
  }, []);

  return (
    <View style={[{ paddingHorizontal: 20, flex: 1 }]}>
      <EnablerSection scanEnable={scanEnable} setScanEnable={scanSwitchEnabler}></EnablerSection>
      { (!fsContext.sort.rssi && !fsContext.sort.app_name) &&
      (
        <View style={{flexDirection:'row', flex: 1, alignItems:'center' }}>
          <Separator text="Available devices:" itemsCount={filteredPeripherals.length}/>
        </View>
      )}
      { (fsContext.sort.rssi || fsContext.sort.app_name) &&
      (
        <View style={{flexDirection:'row', flex: 1, alignItems:'center' }}>
          <Separator 
            style={{width:'80%', alignContent:'flex-start'}}
            text="Available devices:" 
            itemsCount={filteredPeripherals.length}/>
            <TouchableOpacity
              style={{
                width:'20%', 
                alignContent:'flex-end',
                paddingHorizontal: 10
              }}
              onPress={() => setDoSort(!doSort)}
            >
            <Text 
              style={{
                fontSize: 18, 
                color: Colors.blue
              }}> sort </Text>
            </TouchableOpacity>          
        </View>
      )}
      <View style={{ height: '80%' }}>
        <FlashList
          data={scannedPeriphs.current}
          ListEmptyComponent={() => null}
          //keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            // <PureScannedDevice peripheral={item} requestConnect={requestConnect} />
            <ScannedDevice
              peripheral={item}
              requestConnect={requestConnect}
              toggleAdvertising={toggleAdvertising}
            />
          )}
          ListFooterComponent={
            <ScanningSkeleton periphsLenght={peripherals.length} scanEnabled={scanEnable} />
          }
          estimatedItemSize={600}
        />
      </View>
    </View>
  );
};

export default BleScanner;
