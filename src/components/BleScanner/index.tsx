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
  TouchableOpacity,
  InteractionManager,
} from 'react-native';
import { Text } from '../../../components/Themed';
import React, { useState, useEffect, useMemo, useContext, useRef, useCallback } from 'react';
import BleManager, { Peripheral } from 'react-native-ble-manager';
import { RootTabScreenProps, ScanScreenNavigationProp } from '../../../types';
import EnablerSection from './EnablerSection';
import ScannedDevice from './ListSection/ScannedDevice';
import Separator from '../Separator';
import ScanningSkeleton from './ListSection/ListSkeleton';
import { FilterSortState } from '../../../context/FilterSortContext';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Colors from '../../../constants/Colors';
import { Buffer } from 'buffer';
import { getBrand } from '../../../hooks/uuidToBrand';

interface Props extends RootTabScreenProps<'ScanTab'> { }

export interface Peripheral {
  id: string;
  rssi: number;
  name?: string;
  advertising: null;
}

const BleScanner: React.FC<Props> = () => {
  let navigation = useNavigation<ScanScreenNavigationProp>();

  let scannedPeriphs = useRef<Peripheral[]>([]);
  let lastScannedPeriphs = useRef<Peripheral[]>([]);

  const [scanEnable, setScanEnable] = useState<boolean>(false);
  const [peripherals, setPeripherals] = useState<Peripheral[]>([]);
  const [doSort, setDoSort] = useState<Boolean>(false);

  let initialFocus = useRef<boolean>(true);

  let [connectedPeripherals, setConnectedPeripherals] = useState<Peripheral[]>([]);

  const BleManagerModule = NativeModules.BleManager;
  const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

  let peripheralViewUpdateInterval = useRef<NodeJS.Timeout | string | number | undefined>(
    undefined
  );

  let fsContext = useContext(FilterSortState);

  let removeCheckInterval = 0;

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        if (initialFocus.current) {
          console.log('focused');
          initialFocus.current = false;
        } else {
          // setScanEnable(true);
        }
      });
      requestAndroidPermissions().then(() => {
        handleConnectedAndBondedPeripherals();
      });
      return () => {
        console.log('unfocused');
        setScanEnable(false);
        task.cancel();
      };
    }, [])
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      console.log('BleScanner focus');
      console.log('BleScanner: ', BleScanner);
    });

    return unsubscribe;
  }, [navigation]);


  useEffect(() => {
    requestAndroidPermissions().then(() => {
      console.log('starting ble manager');
      BleManager.start({ showAlert: true });

      //@ts-ignore
      bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', handleDisconnectedPeripheral);
    });

    return () => {
      console.log('BleScanner: removeAllListeners');
      bleManagerEmitter.removeAllListeners('BleManagerDiscoverPeripheral');
      bleManagerEmitter.removeAllListeners('BleManagerStopScan');
      bleManagerEmitter.removeAllListeners('BleManagerDisconnectPeripheral');
    };
  }, []);

  useEffect(() => {
    console.log('useEffect [scanEnable]');
    if (!scanEnable) {
      console.log('BleScanner: removeAllListeners');
      bleManagerEmitter.removeAllListeners('BleManagerDiscoverPeripheral');
      bleManagerEmitter.removeAllListeners('BleManagerStopScan');

      clearInterval(peripheralViewUpdateInterval.current);
    } else {
      console.log('useEffect clear periphs');
      scannedPeriphs.current = [];
      setPeripherals([]);
      console.log('BleScanner: addListener');
      bleManagerEmitter.addListener('BleManagerStopScan', handleStopScan);
      bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral);

      const updatePeripheralView = () => {
        setPeripherals((prev) => [...prev]);

        for (let pIdx = 0; pIdx < scannedPeriphs.current.length; pIdx++) {
          if (scannedPeriphs.current[pIdx].advertiesmentCount > scannedPeriphs.current[pIdx].prevAdvertismentCount) {
            scannedPeriphs.current[pIdx].advertismentActive = scannedPeriphs.current[pIdx].advertismentActive + 1;
            scannedPeriphs.current[pIdx].prevAdvertismentCount = scannedPeriphs.current[pIdx].advertiesmentCount;
            scannedPeriphs.current[pIdx].advertismentInActive = false;
          }
        }
      };

      peripheralViewUpdateInterval.current = setInterval(updatePeripheralView, 500); // Update the data every 500ms
    }
    handleConnectedAndBondedPeripherals();
    scan(scanEnable);
  }, [scanEnable]);

  const handleDisconnectedPeripheral = (
    peripheralId: string,
    androidStatus: number,
    iOSDomain: string,
    iOSCode: number
  ) => {
    handleConnectedAndBondedPeripherals();
  };

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

      const rssiThreshold = Math.abs(parseInt(fsContext.filter.rssi.value));

      scannedPeriphs.current.forEach((p) => {
        const isFiltered = Math.abs(p.rssi) > rssiThreshold;
        p.filter = isFiltered;
      });
      if (fsContext.filter.removeInactiveOutDevices) {
        scannedPeriphs.current = scannedPeriphs.current.filter((p) => !p.filter)
      }
    }

    if (fsContext.filter.removeInactiveOutDevices) {
      scannedPeriphs.current = scannedPeriphs.current.filter((p) => !p.advertismentInActive)
    }

    // return scannedPeriphs.current;
    return scannedPeriphs.current.sort((a, b) =>
      a.isConnected === b.isConnected ? 0 : a.isConnected ? -1 : 1
    );
  }, [
    fsContext.filter.connectable,
    fsContext.filter.app_name.enabled,
    fsContext.filter.app_name.value,
    fsContext.filter.rssi.value,
    fsContext.filter.rssi.enabled,
    fsContext.filter.removeInactiveOutDevices,
    peripherals,
  ]);

  const sortPeripheral = useMemo(() => {
    console.debug('sortPeripheral');

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

    if (peripheralViewUpdateInterval.current != null) {
      setPeripherals((prev) => [...prev]);
    }

  }, [doSort]);

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

        console.log('got permissions')
        Promise.resolve();
      } catch (error) {
        console.error('Android permissions error: ', error);
      }
    }
  }

  function handleDiscoverPeripheral(peripheral: Peripheral) {
    return new Promise((resolve, reject) => {
      if (!lastScannedPeriphs.current.map((ele: any) => ele.id).includes(peripheral.id)) {
        lastScannedPeriphs.current.push(peripheral);
      }

      if ([...connectedPeripherals].map((ele: any) => ele.id).includes(peripheral.id)) {
        //console.log('scanned device exists in connectedPeripherals list', peripheral.id)
        resolve(peripheral);
        return;
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
        peripheral.showAdvertising = false;
        peripheral.isConnected = false;
        peripheral.isBonded = false;

        /* Add new device */
        let serviceDataUUIDs = peripheral.advertising.serviceData;
        let serviceUUIDs: string[] | undefined = peripheral.advertising.serviceUUIDs;
        let manufacturerData = peripheral.advertising.manufacturerData;

        peripheral.serviceUUIDs = serviceUUIDs;

        let icon: { name: string; type: any } | null = null;

        if (serviceUUIDs && icon == null) {
          if (serviceUUIDs.length > 0) {
            let brand = getBrand(serviceUUIDs);
            if (brand) {
              icon = {
                name: brand.iconName!,
                type: 'brands',
              };
              peripheral.brand = brand.iconName!;
            }
          }
        }

        if (serviceDataUUIDs && icon == null) {
          let uuids = Object.keys(serviceDataUUIDs);
          if (uuids.length > 0) {
            let brand = getBrand(uuids);
            if (brand) {
              icon = {
                name: brand.iconName!,
                type: 'brands',
              };
              peripheral.brand = brand.iconName!;
            }
          }
        }

        if (manufacturerData && manufacturerData.bytes && icon == null) {
          let bytes = Buffer.from(manufacturerData.bytes);
          let uuid = bytes.readUInt16LE().toString(16).padStart(4, '0').toUpperCase();

          let brandByBytes = getBrand(uuid);

          if (brandByBytes) {
            icon = {
              name: brandByBytes.iconName!,
              type: 'brands',
            };
            peripheral.brand = brandByBytes.iconName!;
          }
        }

        if (!icon) {
          icon = {
            name: 'devices',
            type: 'material',
          };
        }

        peripheral.icon = icon;

        peripheral.advertiesmentCount = 0;
        peripheral.prevAdvertismentCount = 0;
        peripheral.advertismentActive = 0;
        peripheral.advertismentInActive = false;

        scannedPeriphs.current.push(peripheral);
        // console.log(peripheral);
      } else {
        let periphIdx = scannedPeriphs.current.findIndex((device) => device.id === peripheral.id);
        if (scannedPeriphs.current[periphIdx].rssi !== peripheral.rssi) {
          // console.log('rssi changed', peripheral.rssi);
          scannedPeriphs.current[periphIdx].rssi = peripheral.rssi;
          // console.log(peripheral.advertising.manufacturerData);
        }
        if (scannedPeriphs.current[periphIdx].name !== peripheral.name) {
          //console.log('name changed', peripheral.id);
          scannedPeriphs.current[periphIdx].name = peripheral.name;
        }
        scannedPeriphs.current[periphIdx].advertiesmentCount = scannedPeriphs.current[periphIdx].advertiesmentCount + 1;
      }
      resolve(peripheral);
    });
  }

  function handleStopScan(): void {
    removeCheckInterval = removeCheckInterval + 1;

    /* remove devices on 3rd scan (every 15s) */
    if (removeCheckInterval === 2) {
      /* find devices not discovered in this scan */
      for (let pIdx = 0; pIdx < scannedPeriphs.current.length; pIdx++) {
        if (
          !lastScannedPeriphs.current
            .map((ele: any) => ele.id)
            .includes(scannedPeriphs.current[pIdx].id)
        ) {
          scannedPeriphs.current[pIdx].advertismentInActive = true;
          // Uncomment this line to remove inactive devices
          //scannedPeriphs.current.splice(pIdx, 1);
        }
      }
      lastScannedPeriphs.current = [];

      removeCheckInterval = 0;
    }

    console.debug('handleStopScan start scan');
    scan(true);
  }

  function scan(enabled: boolean): void {
    console.debug('startScan ', enabled);

    if (enabled) {
      BleManager.scan([], 5, true);
    } else {
      BleManager.stopScan();
    }
  }

  const requestConnect = (peripheral: Peripheral) => {
    // console.debug('requestConnect: ', peripheralId);
    setScanEnable(false);
    clearInterval(peripheralViewUpdateInterval.current);
    peripheralViewUpdateInterval.current = null;

    /* remove device from scannedPeriphs if it is there */
    // scannedPeriphs.current = connectedPeripherals.current.filter(
    //   (periph) => periph.id !== peripheralId
    // );

    onConnectRequest!(peripheral);
  };

  const scanSwitchEnabler = useCallback((state: boolean) => {
    setScanEnable(state);
  }, []);

  const onConnectRequest = (p: Peripheral) => {
    navigation.navigate('DeviceTab', {
      peripheralId: p.id,
      isBonded: p.isBonded,
      isConnected: p.isConnected,
    });
  };

  const toggleAdvertising = useCallback((peripheralId: string) => {
    scannedPeriphs.current = scannedPeriphs.current.map((item) =>
      item.id === peripheralId ? { ...item, showAdvertising: !item.showAdvertising } : item
    );
  }, []);

  const reconnect = useCallback((peripheral: Peripheral) => {
    BleManager.disconnect(peripheral.id)
      .then(() => {
        console.log('Beginning reconnecting');
        requestConnect(peripheral);
      })
      .catch((error) => {
        alert(`Error: \n ${error}\n Device removed`);
      })
      .finally(() => { });
  }, []);

  const handleConnectedAndBondedPeripherals = async () => {
    try {
      let result = await BleManager.getConnectedPeripherals([]);
      if (Platform.OS == 'android') {
        let tempBondedPeripherals = await getBondedPeripherals();
        setConnectedPeripherals(
          result.map((item) => {
            item.isConnected = true;
            item.isBonded = tempBondedPeripherals.find((bon) => bon.id == item.id) ? true : false;

            return item;
          })
        );
      } else {
        setConnectedPeripherals(
          result.map((item) => {
            item.isBonded = false;
            item.isConnected = true;
            return item;
          })
        );
      }
    } catch (error) {
      console.error('handleConnectedAndBondedPeripherals error: ', error);
    }
  };

  let getBondedPeripherals = async (): Promise<Peripheral[]> => {
    try {
      return (await BleManager.getBondedPeripherals()).map((item) => {
        item.isBonded = true;
        return item;
      });
    } catch (error) {
      return [];
    }
  };

  const disconnectPeripheral = (peripheralId: string) => {
    BleManager.disconnect(peripheralId)
      .then(() => {
        console.log('Peripheral disconnected!');
        handleConnectedAndBondedPeripherals();
      })
      .catch((error) => {
        console.error('Error while disconnecting periheral: ', error);
      });
  };

  let memoedPeripherals = useMemo(() => {
    return [
      ...connectedPeripherals,
      ...scannedPeriphs.current.filter(
        (item) =>
          !connectedPeripherals.some((filterObj) => filterObj.id === item.id && item.isConnected)
      ),
    ];
  }, [connectedPeripherals, peripherals, scannedPeriphs.current]);

  return (
    <View style={[{ flex: 1 }]}>
      <EnablerSection scanEnable={scanEnable} setScanEnable={scanSwitchEnabler} />
      {!fsContext.sort.rssi && !fsContext.sort.app_name && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: Colors.lightGray,
            padding: 10,
          }}
        >
          <Separator
            text="Available devices:"
            style={{ backgroundColor: Colors.lightGray }}
            textStyles={{ fontWeight: 'bold' }}
            itemsCount={filteredPeripherals.length}
          />
        </View>
      )}
      {(fsContext.sort.rssi || fsContext.sort.app_name) && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: Colors.lightGray,
            padding: 10,
          }}
        >
          <Separator
            style={{ width: '80%', alignContent: 'flex-start' }}
            text="Available devices:"
            textStyles={{ fontWeight: 'bold' }}
            itemsCount={filteredPeripherals.length}
          />
          <TouchableOpacity
            style={{
              width: '20%',
              alignContent: 'flex-end',
              paddingHorizontal: 10,
            }}
            onPress={() => setDoSort(!doSort)}
          >
            <Text
              style={{
                fontSize: 18,
                color: Colors.blue,
              }}
            >
              {' '}
              sort{' '}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={{ height: '70%', flex: 1 }}>
        <FlashList
          data={memoedPeripherals}
          ListEmptyComponent={() => null}
          renderItem={({ item }) => (
            <ScannedDevice
              peripheral={item}
              requestConnect={() => {
                requestConnect(item);
              }}
              reconnect={() => {
                reconnect(item);
              }}
              disconnect={() => {
                disconnectPeripheral(item.id);
              }}
              toggleAdvertising={toggleAdvertising}
            />
          )}
          ListFooterComponent={
            <ScanningSkeleton periphsLenght={peripherals.length} scanEnabled={scanEnable} />
          }
          estimatedItemSize={200}
        />
      </View>
    </View>
  );
};

export default BleScanner;
