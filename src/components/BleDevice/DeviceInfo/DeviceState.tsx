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

import { View, StyleSheet, Platform, Alert, Linking, useWindowDimensions, NativeModules, NativeEventEmitter } from 'react-native';
import { Text } from '../../Themed';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TouchableOpacity } from '../../Themed';
import Colors from '../../../constants/Colors';
import { DeviceScreenNavigationProp } from '../../../../types';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Icon } from '@rneui/themed';
import BleManager from 'react-native-ble-manager';
import { PeripheralInfo } from 'react-native-ble-manager';

interface Props {
  deviceState: string;
  discover: (peripheralId: string) => void;
  connect: (peripheralId: string) => void;
  hasOadserviceUuid: boolean;
  peripheralInfo: PeripheralInfo | undefined;
  peripheralId: string;
  isConnected: boolean;
  isBonded: boolean;
}

const DeviceState: React.FC<Props> = ({
  deviceState,
  hasOadserviceUuid,
  peripheralInfo,
  peripheralId,
  connect,
  ...props
}) => {
  let navigation = useNavigation<DeviceScreenNavigationProp>();

  const BleManagerModule = NativeModules.BleManager;
  const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

  const { fontScale } = useWindowDimensions();
  const [isBonded, setIsBonded] = useState<boolean>(false);

  useEffect(() => {
    if (Platform.OS === 'android') {
      bleManagerEmitter.addListener('BleManagerPeripheralDidBond', handleNewDeviceBonded);
    }
  }, [])

  const showAlert = () =>
    Alert.alert(
      'OAD Service',
      'For OAD process please connect and pair to the device using the iOS\'s Bluetooth interface.',
      [
        {
          text: 'Continue',
          onPress: () => navigation.navigate('Characteristics', {
            peripheralInfo: peripheralInfo!,
            serviceUuid: 'f000ffc0-0451-4000-b000-000000000000'.toLocaleUpperCase(),
            icon: {
              type: 'font-awesome-5',
              iconName: 'download',
            },
            serviceName: 'TI OAD',
          }),
          style: 'cancel',
        },
        {
          text: 'Go to Bluetooth',
          onPress: () => Linking.openURL('App-Prefs:Bluetooth'),
          style: 'destructive',
        },

      ],
    );

  const openFWUpdateModal = () => {
    if (Platform.OS === 'ios') {
      showAlert();
    }
    else {
      navigation.navigate('Characteristics', {
        peripheralInfo: peripheralInfo!,
        serviceUuid: 'f000ffc0-0451-4000-b000-000000000000',
        icon: {
          type: 'font-awesome-5',
          iconName: 'download',
        },
        serviceName: 'TI OAD',
      })
    }
  }

  const handleNewDeviceBonded = (e: any) => {
    console.log('New device bonded', e)
    if (e.id === peripheralId) {
      setIsBonded(true);
    }

  }

  const checkIfPeripheripheralIsBonded = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;

    try {
      let bondedPeripherals = await BleManager.getBondedPeripherals();
      let found = bondedPeripherals.find((per) => per.id == peripheralId);
      return found ? true : false;
    } catch (error) {
      return false;
    }
  };

  const handleBond = async () => {
    if (Platform.OS != 'android') return undefined;

    let _isBonded = await checkIfPeripheripheralIsBonded();

    try {
      if (_isBonded) {
        console.debug('Attempting to remove bond! ', peripheralId);
        await BleManager.removeBond(peripheralId);
        console.debug('Bond removed successfuly!');
        setIsBonded(false);
      } else {
        console.debug('Creating bond ', peripheralId);
        await BleManager.createBond(peripheralId);
        setIsBonded(true);
        console.debug('Bond created or restored!');
      }
    } catch (error) {
      console.error('Bond error ', error);
      alert(error);
      setIsBonded(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      (async () => {
        setIsBonded(false);
        let result = await checkIfPeripheripheralIsBonded();
        setIsBonded(result);
      })();
    }, [peripheralId])
  );

  let showIsBonded = useMemo(() => {
    if (Platform.OS !== 'android') return '';

    return isBonded ? '(Bonded)' : '(Not Bonded)';
  }, [isBonded]);

  return (
    <View style={[styles.container]}>
      {Platform.OS === 'android' && (
        <TouchableOpacity style={{ paddingRight: 10 }} onPress={handleBond}>
          <Icon name={'lock'} color={isBonded ? 'black' : 'gray'} type="font-awesome" />
        </TouchableOpacity>
      )}
      {/* Rediscover devices services feature */}
      <TouchableOpacity onPress={() => connect(peripheralId)}>
        <Text style={{ fontSize: 15 / fontScale }} >
          State:{' '}
          <Text style={{ fontWeight: 'bold' }}>
            {deviceState} {showIsBonded}
          </Text>
        </Text>
      </TouchableOpacity>
      {hasOadserviceUuid && (
        <TouchableOpacity
          onPress={openFWUpdateModal}
          style={{
            paddingHorizontal: 10,
            borderRadius: 15,
            marginLeft: 'auto',
          }}
        >
          <Text style={[{ color: Colors.blue, fontSize: 15 / fontScale }]}>Update FW</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
});

export default DeviceState;
