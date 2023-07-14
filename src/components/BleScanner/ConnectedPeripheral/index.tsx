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

import { View, StyleSheet } from 'react-native';
import { Text } from '../../../../components/Themed';
import React, { memo } from 'react';
import { Icon } from '@rneui/themed';
import { ScanScreenNavigationProp } from '../../../../types';
import { TouchableOpacity } from '../../../../components/Themed';
import Colors from '../../../../constants/Colors';
import { Peripheral } from 'react-native-ble-manager';
import { CommonActions, useNavigation } from '@react-navigation/native';

interface Device {
  peripheral: Peripheral;
  disconnect: (peripheral: Peripheral) => void;
  requestConnect: (peripheralId: string) => void;
}

const ScannedDevice: React.FC<Device> = ({ peripheral, disconnect, requestConnect }) => {
  if (peripheral === undefined) {
    /* there is an issue where a device is removed from the
       sortedFilteredPeripherals list while the device is 
       being rendered. We expect devices to be removed from the 
       list, this is a requested feature to remove devices that
       have not advertised in that scan interval.
       
       As a workaround return an empty view */

    console.error('PureScannedDevice: peripheral undefined');
    return null;
  }

  let navigation = useNavigation<ScanScreenNavigationProp>();

  const reconnect = () => {
    console.log('Reconnect:', peripheral.id);

    navigation.dispatch(
      CommonActions.navigate({ name: 'DeviceTab', params: { peripheralId: peripheral.id } })
    );
  };

  return (
    <View style={[styles.container]}>
      <View style={[styles.deviceContainer]}>
        <Icon name="devices" type="fontawesome" />
        <TouchableOpacity style={[styles.perInfoWrapper]} onPress={reconnect}>
          <Text
            style={{ fontWeight: 'bold' }}
            allowFontScaling={true}
            adjustsFontSizeToFit={true}
            numberOfLines={1}
          >
            {peripheral?.name || 'Unknown'}
          </Text>
          <Text>ID: {peripheral.id || 'unknown'}</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => disconnect(peripheral)}>
            <Icon name="trash" type="evilicon" size={30} />
          </TouchableOpacity>
          <TouchableOpacity onPress={reconnect}>
              <Icon name="chevron-right" type="evilicon" size={40} />
            </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderColor: 'rgba(211,211,211,0.3)',
  },
  deviceContainer: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    flex: 1,
    flexDirection: 'row',
  },
  perInfoWrapper: {
    flex: 2,
    paddingHorizontal: 10,
    display: 'flex',
    flexDirection: 'column',
  },
  connectButtonWrapper: {
    flex: 1,
    justifyContent: 'space-evenly',
  },
  connectButton: {
    paddingVertical: 4,
    borderRadius: 5,
    alignItems: 'center',
    paddingHorizontal: 10,
    backgroundColor: Colors.gray,
  },
});

export default memo(ScannedDevice);
