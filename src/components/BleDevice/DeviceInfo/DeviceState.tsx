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

import { View, StyleSheet, Platform, useWindowDimensions, NativeModules, NativeEventEmitter } from 'react-native';
import { Text } from '../../Themed';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TouchableOpacity } from '../../Themed';
import { useFocusEffect } from '@react-navigation/native';
import BleManager from 'react-native-ble-manager';
import { PeripheralInfo } from 'react-native-ble-manager';
import { useServiceViewContext } from '../../../context/ServiceViewContext';

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
  const BleManagerModule = NativeModules.BleManager;
  const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);
  const { updatePeripheral } = useServiceViewContext();

  const { fontScale } = useWindowDimensions();
  const [isBonded, setIsBonded] = useState<boolean>(false);

  useEffect(() => {
    if (Platform.OS === 'android') {
      bleManagerEmitter.addListener('BleManagerPeripheralDidBond', handleNewDeviceBonded);
    }
  }, [])

  const handleNewDeviceBonded = (e: any) => {
    console.log('New device bonded', e)
    if (e.id === peripheralId) {
      setIsBonded(true);
      if (peripheralInfo?.id) {
        updatePeripheral({ ...peripheralInfo, isBonded: true });
      }
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

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      (async () => {
        setIsBonded(false);
        let result = await checkIfPeripheripheralIsBonded();
        setIsBonded(result);
        if (peripheralInfo?.id) {
          updatePeripheral({ ...peripheralInfo, isBonded: result });
        }
      })();
    }, [deviceState])
  );

  let showIsBonded = useMemo(() => {
    if (Platform.OS !== 'android') return '';

    return isBonded ? '(Bonded)' : '(Not Bonded)';
  }, [isBonded]);

  return (
    <View style={[styles.container]}>
      {/* Rediscover devices services feature */}
      <TouchableOpacity onPress={() => connect(peripheralId)}>
        <Text style={{ fontSize: 15 / fontScale }} >
          State:{' '}
          <Text style={{ fontWeight: 'bold' }}>
            {deviceState} {showIsBonded}
          </Text>
        </Text>
      </TouchableOpacity>
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
