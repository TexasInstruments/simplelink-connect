/*
 * Copyright (c) 2015-2018, Texas Instruments Incorporated
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
  View,
  Text,
  StyleSheet,
} from 'react-native';
import React, { useCallback, useEffect } from 'react';
import { TouchableOpacity } from '../../../../components/Themed';
import useColorScheme from '../../../../hooks/useColorScheme';
import Colors from '../../../../constants/Colors';
import {
  DeviceScreenNavigationProp,
  DeviceScreenRouteProp,
} from '../../../../types';
import { useNavigation, useRoute } from '@react-navigation/native';
import BleManager from 'react-native-ble-manager';


interface Props {
  deviceState: string;
  discover: (peripheralId: string) => void;
  connect: (peripheralId: string) => void;
  hasOadserviceUuid: boolean;
  peripheralId: string
}

const DeviceState: React.FC<Props> = ({ deviceState, discover, connect, hasOadserviceUuid, peripheralId }) => {
  let theme = useColorScheme();

  let navigation = useNavigation<DeviceScreenNavigationProp>();
  let route = useRoute<DeviceScreenRouteProp>();

  const openFWUpdateModal = useCallback(() => {
    navigation.navigate('FwUpdateServiceModel', { peripheralId: peripheralId });
  }, []);


  const startConnectionCheckTimer = (() => {
    return setTimeout(() => {
      console.log("DeviceState-focus: check peripheral ", peripheralId);
      BleManager.isPeripheralConnected(
        peripheralId,
        []
      ).then((isConnected) => {
        if (isConnected) {
          console.log("DeviceState-focus: Peripheral is connected!");
        } else {
          console.log('navigation.canGoBack', navigation.canGoBack())
          // Check we are not already back on the scan screen
          if(navigation.canGoBack()) {
            console.log("DeviceState-focus: Peripheral is NOT connected!");
            alert('Peripheral connection lost')
            navigation.goBack()
          }
        }
      });
    }, 5000);
  })

  useEffect(() => {

    const unsubscribe = navigation.addListener('focus', () => {
      //if(peripheralInfo !== undefined)
      {
        // The screen is focused
        // Call any action
        console.log('focus:', peripheralId)
        console.log('focus: deviceState', deviceState)

        let timeout = startConnectionCheckTimer()

        console.log("focus: check connected");
        BleManager.isPeripheralConnected(
          peripheralId,
          []
        ).then((isConnected) => {
          if (isConnected) {
            console.log("focus: Peripheral is connected!");
            clearTimeout(timeout)
          } else {
            console.log("focus: Not connect, connect");
            console.log('navigation.canGoBack', navigation.canGoBack())
            connect(peripheralId);
          }
        });
      }
    });

    return unsubscribe;
  }, [navigation, peripheralId]);

  return (
    <View style={[styles.container]}>
      {/* Rediscover devices services feature requested to be removed. May add back later
      <TouchableOpacity onPress={() => discover(peripheralId)}>
        <Text>
          State: <Text style={{ color: Colors.blue, fontWeight: 'bold' }}>{deviceState}</Text>
        </Text>
      </TouchableOpacity> 
      */}
      <Text>
        State: <Text style={{ fontWeight: 'bold' }}>{deviceState}</Text>
      </Text>
      { hasOadserviceUuid &&
      (
      <TouchableOpacity
        onPress={openFWUpdateModal}
        style={{
          paddingHorizontal: 10,
          borderRadius: 15,
        }}
      >
        <Text style={[{ color: Colors.blue }]}>Update FW</Text>
      </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingVertical: 15,
  },
});

export default DeviceState;
