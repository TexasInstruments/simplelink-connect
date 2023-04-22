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

import { View, Text, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import React, { memo, useEffect, useRef, useState } from 'react';
import BleManager from 'react-native-ble-manager';
import { Icon } from '@rneui/themed';
import { TouchableOpacity } from '../../../../components/Themed';
import ScannedDeviceInfo from './ScannedDeviceInfo';
import Colors from '../../../../constants/Colors';

interface Device {
  peripheral: BleManager.Peripheral;
  requestConnect: (peripheralId: string) => void;
  toggleAdvertising: (peripheralId: string) => void;
}

const ScannedDevice: React.FC<Device> = ({ peripheral, requestConnect, toggleAdvertising }) => {
  const lastPeripheralId = useRef(peripheral.id ?? '');
  const [visibleInfo, setVisibleInfo] = useState<boolean>(peripheral.showAdvertising);

  if (peripheral && peripheral.id !== lastPeripheralId.current) {
    lastPeripheralId.current = peripheral.id;
    setVisibleInfo(peripheral.showAdvertising);
  }

  let isConnectable = () => {
    if (
      !peripheral.advertising.isConnectable ||
      typeof peripheral.advertising.isConnectable == undefined
    )
      return false;

    return true;
  };

  const expand = () => {
    setVisibleInfo((prev) => !prev);
    toggleAdvertising(peripheral.id);
  };

  let { fontScale } = useWindowDimensions();

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

  return (
    <View style={[styles.container]}>
      <View style={[styles.deviceContainer]}>
        <Icon name="devices" type="fontawesome" />
        <TouchableOpacity style={[styles.perInfoWrapper]} onPress={expand}>
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
        {isConnectable() && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="signal" type="font-awesome" onPress={() => requestConnect(peripheral.id)} />
            <Text style={{ width: 35, textAlign: 'center' }}> {peripheral.rssi} </Text>
            <TouchableOpacity onPress={() => requestConnect(peripheral.id)}>
              <Icon name="chevron-right" type="evilicon" size={40} />
            </TouchableOpacity>
          </View>
        )}
        {!isConnectable() && (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 40 }}>
            <Icon name="signal" type="font-awesome" onPress={() => requestConnect(peripheral.id)} />
            <Text style={{ width: 30, textAlign: 'center' }}> {peripheral.rssi} </Text>
          </View>
        )}
      </View>
      {/* Always render devices adv info. Workaround for issure where the visdiable adertizement 
          does not follow device in the sorted list
      <ScannedDeviceInfo peripheral={peripheral} isVisible={visibleInfo}/> */}
      <ScannedDeviceInfo peripheral={peripheral} isVisible={visibleInfo} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 15,
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
