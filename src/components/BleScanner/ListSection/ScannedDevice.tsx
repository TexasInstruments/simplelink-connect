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

import { View, StyleSheet, Platform } from 'react-native';
import { Text } from '../../Themed';
import React, { memo, useRef, useState } from 'react';
import { Peripheral } from 'react-native-ble-manager';
import { Icon } from '@rneui/themed';
import { TouchableOpacity } from '../../Themed';
import ScannedDeviceInfo from './ScannedDeviceInfo';
import Colors from '../../../constants/Colors';
import PeripheralIcon from '../../PeripheralIcon';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { ScanScreenNavigationProp } from '../../../../types';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome'
import { faLink } from '@fortawesome/free-solid-svg-icons/faLink'
import { faLinkSlash } from '@fortawesome/free-solid-svg-icons/faLinkSlash'


interface Device {
  peripheral: Peripheral;
  requestConnect: () => void;
  reconnect: () => void;
  toggleAdvertising: (peripheralId: string) => void;
  disconnect: () => void;
}

const ScannedDevice: React.FC<Device> = ({
  requestConnect,
  toggleAdvertising,
  peripheral,
  disconnect,
}) => {
  const lastPeripheralId = useRef(peripheral.id ?? '');
  const [visibleInfo, setVisibleInfo] = useState<boolean>(peripheral.showAdvertising);
  const [icon, setIcon] = useState<any>(peripheral.icon);

  if (peripheral && peripheral.id !== lastPeripheralId.current) {
    lastPeripheralId.current = peripheral.id;
    setVisibleInfo(peripheral.showAdvertising);
    setIcon(peripheral.icon);
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

  const reconnectLocal = () => {
    console.log('Reconnect:', peripheral.id, peripheral.isBonded, peripheral.isConnected);

    navigation.dispatch(
      CommonActions.navigate({
        name: 'DeviceTab',
        params: {
          peripheralId: peripheral.id,
          isBonded: peripheral.isBonded,
          isConnected: peripheral.isConnected,
        },
      })
    );
  };

  return (
    <View style={{ backgroundColor: 'white' }}>
      <View style={[styles.container]}>
        <View style={[styles.deviceContainer]}>
          <PeripheralIcon icon={icon} color={peripheral.filter ? Colors.gray : peripheral.advertismentInActive ? Colors.gray : 'black'} />
          <TouchableOpacity style={[styles.perInfoWrapper]} onPress={expand}>
            <Text
              style={{ fontWeight: 'bold', color: peripheral.filter ? Colors.gray : peripheral.advertismentInActive ? Colors.gray : 'black' }}
              allowFontScaling={true}
              adjustsFontSizeToFit={true}
              numberOfLines={1}
            >
              {peripheral?.name || 'Unknown'}
            </Text>
            <Text allowFontScaling adjustsFontSizeToFit numberOfLines={1} style={{ color: peripheral.filter ? Colors.gray : peripheral.advertismentInActive ? Colors.gray : 'black' }}>
              ID: {peripheral.id || 'unknown'}
            </Text>
          </TouchableOpacity>
          {!peripheral.isConnected && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="signal" type="font-awesome" onPress={requestConnect} color={peripheral.filter ? Colors.gray : peripheral.advertismentInActive ? Colors.gray : 'black'} />
              <Text style={{ width: 35, textAlign: 'center', color: peripheral.filter ? Colors.gray : peripheral.advertismentInActive ? Colors.gray : 'black' }}> {peripheral.rssi} </Text>
              <TouchableOpacity onPress={peripheral.advertismentInActive ? () => { } : peripheral.filter ? () => { } : requestConnect}>
                <Icon name="chevron-right" type="evilicon" size={40} color={peripheral.filter ? 'white' : peripheral.advertismentInActive ? 'white' : 'black'} />
              </TouchableOpacity>
            </View>
          )}
          {peripheral.isConnected && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={disconnect}>
                <FontAwesomeIcon icon={faLinkSlash} size={23} />
              </TouchableOpacity>
              <TouchableOpacity onPress={reconnectLocal}>
                <Icon name="chevron-right" type="evilicon" size={40} color={peripheral.advertismentInActive ? 'white' : 'black'} />
              </TouchableOpacity>
            </View>
          )}
        </View>
        {!peripheral.isConnected && (
          <View
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 10,
            }}
          >
            <FontAwesomeIcon
              icon={faLink}
              color={peripheral.isConnected ? Colors.blue : peripheral.filter ? Colors.gray : peripheral.advertismentInActive ? Colors.gray : 'black'}
              size={12}
              style={{ paddingHorizontal: 10 }}
            />
            {Platform.OS === 'android' && (
              <Icon
                name={'lock'}
                color={peripheral.isBonded ? Colors.blue : peripheral.filter ? Colors.gray : peripheral.advertismentInActive ? Colors.gray : 'black'}
                type="font-awesome"
                size={20}
                paddingLeft={5}
              />
            )}
            <Text style={{ maxWidth: 100, paddingHorizontal: 5, color: peripheral.filter ? Colors.gray : peripheral.advertismentInActive ? Colors.gray : 'black' }}>
              Advertising
            </Text>
            <Icon
              type='font-awesome'
              name={'square'}
              color={peripheral.filter ? Colors.gray : peripheral.advertismentInActive ? Colors.gray : (peripheral.advertismentActive % 5) == 0 ? Colors.blue : Colors.lightGray}
              size={5}
              style={{ paddingHorizontal: 1 }}
            />
            <Icon
              type='font-awesome'
              name={'square'}
              color={peripheral.filter ? Colors.gray : peripheral.advertismentInActive ? Colors.gray : (peripheral.advertismentActive % 5) == 1 ? Colors.blue : Colors.lightGray}
              size={5}
              style={{ paddingHorizontal: 1 }}
            />
            <Icon
              type='font-awesome'
              name={'square'}
              color={peripheral.filter ? Colors.gray : peripheral.advertismentInActive ? Colors.gray : (peripheral.advertismentActive % 5) == 2 ? Colors.blue : Colors.lightGray}
              size={5}
              style={{ paddingHorizontal: 1 }}
            />
            <Icon
              type='font-awesome'
              name={'square'}
              color={peripheral.filter ? Colors.gray : peripheral.advertismentInActive ? Colors.gray : (peripheral.advertismentActive % 5) == 3 ? Colors.blue : Colors.lightGray}
              size={5}
              style={{ paddingHorizontal: 1 }}
            />
          </View>
        )}
        <ScannedDeviceInfo peripheral={peripheral} isVisible={visibleInfo} />
      </View>
    </View >
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
