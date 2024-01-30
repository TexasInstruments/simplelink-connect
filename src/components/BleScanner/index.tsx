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
  ScrollView,
  AsyncStorage,
} from 'react-native';
import React, { useState, useEffect, useMemo, useContext, useRef, useCallback } from 'react';
import BleManager, { Peripheral } from 'react-native-ble-manager';
import { RootTabScreenProps, ScanScreenNavigationProp } from '../../../types';
import EnablerSection from './EnablerSection';
import ScannedDevice from './ListSection/ScannedDevice';
import Separator from '../Separator';
import ScanningSkeleton from './ListSection/ListSkeleton';
import { FilterSortState } from '../../context/FilterSortContext';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Colors from '../../constants/Colors';
import { getIconByPeripheralInfo } from '../../hooks/uuidToBrand';
import FontAwesome from "react-native-vector-icons/FontAwesome";
import RNRestart from 'react-native-restart';

interface Props extends RootTabScreenProps<'ScanTab'> { }

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

  let peripheralViewUpdateInterval = useRef<NodeJS.Timeout | string | number | undefined | null>(
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
          setScanEnable(true);
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
      bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', handleDisconnectedPeripheral);

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
    console.log('handleDisconnectedPeripheral')

    handleConnectedAndBondedPeripherals();

    /* find devices not discovered in this scan */
    for (let pIdx = 0; pIdx < scannedPeriphs.current.length; pIdx++) {
      if (
        !scannedPeriphs.current
          .map((ele: any) => ele.id.toLocaleUpperCase())
          .includes(peripheralId)
      ) {
        scannedPeriphs.current.splice(pIdx, 1);
      }
    }
    setDoSort(!doSort)
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
        // Android 12 and above
        console.log(Platform.Version)
        if (Platform.Version >= 31) {
          await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          ]);
        }
        // Android 11 and lower 
        else {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          );

          // First time asking for permission - need to reload the app
          const hasAskedPermission = await AsyncStorage.getItem('hasAskedPermission');
          if (hasAskedPermission !== 'true') {
            await AsyncStorage.setItem('hasAskedPermission', 'true');
            RNRestart.Restart();
          }
        }

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
        peripheral = getIconByPeripheralInfo(peripheral)

        peripheral.advertiesmentCount = 0;
        peripheral.prevAdvertismentCount = 0;
        peripheral.advertismentActive = 0;
        peripheral.advertismentInActive = false;

        scannedPeriphs.current.push(peripheral);

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

            return getIconByPeripheralInfo(item);
          })
        );
      } else {
        setConnectedPeripherals(
          result.map((item) => {
            item.isBonded = false;
            item.isConnected = true;
            return getIconByPeripheralInfo(item);
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
      ...scannedPeriphs.current.filter(
        (item) =>
          !connectedPeripherals.some((filterObj) => filterObj.id === item.id)
      ),
    ];
  }, [connectedPeripherals, peripherals, scannedPeriphs.current]);

  let memoConnectedDevices = useMemo(() => {
    //console.log(JSON.stringify(connectedPeripherals, null, 2))
    let list = connectedPeripherals.map((peripheral) => {
      return peripheral
    })
    return [...list]
  }, [connectedPeripherals])


  return (
    <View style={[{ flex: 1 }]}>
      <EnablerSection scanEnable={scanEnable} setScanEnable={scanSwitchEnabler} />
      {/* Connected Devices */}
      {memoConnectedDevices.length > 0 && (
        <View style={{ maxHeight: '40%' }}>
          {memoConnectedDevices.length < 10 && (
            <View >
              <Separator style={{ backgroundColor: Colors.lightGray, padding: 10 }} text="Connected devices:" textStyles={{ fontWeight: "bold" }} itemsCount={memoConnectedDevices.length} />
              <ScrollView >
                <View style={{ flex: 1 }}>
                  <FlashList
                    data={memoConnectedDevices}
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
                    estimatedItemSize={200}
                  />
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* Available Devices */}
      {
        !fsContext.sort.rssi && !fsContext.sort.app_name && (
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
        )
      }
      {
        (fsContext.sort.rssi || fsContext.sort.app_name) && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: Colors.lightGray,
              padding: 10,
            }}
          >
            <Separator
              style={{ width: '90%', alignContent: 'flex-start' }}
              text="Available devices:"
              textStyles={{ fontWeight: 'bold' }}
              itemsCount={filteredPeripherals.length}
            />
            <TouchableOpacity
              style={{
                width: '20%',
              }}
              onPress={() => setDoSort(!doSort)}
            >
              <FontAwesome name="sort-amount-asc" size={18} color={Colors.blue} />
            </TouchableOpacity>
          </View>
        )
      }
      <View style={{ flex: 1, height: '70%' }}>
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
    </View >
  );
};

export default BleScanner;
