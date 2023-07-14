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
} from 'react-native';
import { Text, TouchableOpacity } from '../../../components/Themed';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import BleManager, { Peripheral } from 'react-native-ble-manager';
import { RootTabScreenProps, ScanScreenNavigationProp } from '../../../types';
import Separator from '../Separator';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Colors from '../../../constants/Colors';
import { ScrollView } from 'react-native-gesture-handler';

interface Props extends RootTabScreenProps<'ScanTab'> {}

const BleScanner: React.FC<Props> = () => {
  let navigation = useNavigation<ScanScreenNavigationProp>();
  
  let scannedPeriphs = useRef<BleManager.Peripheral[]>([]);
  const [peripherals, setPeripherals] = useState<Peripheral[]>([]);


  const BleManagerModule = NativeModules.BleManager;
  const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

  useEffect(() => {
    BleManager.start({ showAlert: true });

    requestAndroidPermissions().then(() => {
        bleManagerEmitter.addListener('BleManagerStopScan', handleStopScan);
        bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral);  
      });
    
    scannedPeriphs.current = [];
    scan(true);

    return () => {
      bleManagerEmitter.removeAllListeners('BleManagerDiscoverPeripheral');
      bleManagerEmitter.removeAllListeners('BleManagerStopScan');

      scan(false);
    };
  }, []);

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
        Promise.resolve();
      } catch (error) {
      }
    }
  }

  function handleDiscoverPeripheral(peripheral: Peripheral): void {
    /* TODO: Add filter here. For instance based on model a number in advertisement
    peripheral.advertising.manufacturerData[0] == 0x22;
    peripheral.advertising.manufacturerData[1] == 0x33;
     */

    let found =
      scannedPeriphs.current.filter((ele) => ele.id == peripheral.id).length > 0 ? true : false;

    /* Simulate high volume of devices - note will not connect due to pripheral.id changed */
    // if (scannedPeriphs.current.length > 600) {
    //   scannedPeriphs.current = [];
    //   setPeripherals([]);
    // }
    // found = false;
    // peripheral.id = peripheral.id + scannedPeriphs.current.length.toString();

    if (!found) {
      scannedPeriphs.current.push(peripheral);
      setPeripherals((prev) => [...prev, peripheral]);      
    }
  }

  function handleStopScan(): void {
    scan(true);
  }

  function scan(enabled: boolean): void {
    if (enabled) {
        /* TODO: Add scan serviceUUIDs here so only devices with expected Services are discovered
          BleManager.scan(['f000ffc0-0451-4000-b000-000000000000'], 5, false);
        */

        /*Simulate high volume of devices
        BleManager.scan([], 5, true);*/

        BleManager.scan([], 5, false);
    } else {
      BleManager.stopScan();
    }
  }

  const onConnectRequest = (p: string) => {
    console.log(p, 'connection id');

    scan(false);

    navigation.navigate('DeviceTab', {
      peripheralId: p,
    });
  };

  return (
    <View style={[{ paddingHorizontal: 20, flex: 1 }]}>
      <View style={{ height: '70%', flex: 1 }}>
        <Text style={{fontWeight: 'bold', padding: 20}}>Scanned devices {peripherals.length}</Text>
        <FlashList
          data={peripherals}
          ListEmptyComponent={() => null}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={(e) => onConnectRequest(item.id)}>
              <Text style={{padding: 2}}>ID: {item.id}</Text>
            </TouchableOpacity>
          )}
          estimatedItemSize={600}
        />
      </View>
    </View>
  );
};

export default BleScanner;
