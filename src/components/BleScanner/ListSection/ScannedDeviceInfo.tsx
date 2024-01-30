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

import { StyleSheet } from 'react-native';
import { Text } from '../../Themed';
import React from 'react';
import BleManager from 'react-native-ble-manager';
import { View } from '../../Themed';
import Colors from '../../../constants/Colors';

interface Props {
  isVisible: boolean;
  peripheral: BleManager.Peripheral;
}

const ScannedDeviceInfo: React.FC<Props> = ({ isVisible, peripheral }) => {
  let isConnectable = () => {
    if (
      !peripheral.advertising.isConnectable ||
      typeof !peripheral.advertising.isConnectable == undefined
    )
      return false;

    return true;
  };

  return (
    <View style={{ backgroundColor: 'blue' }}>
      <View style={[styles.container, {
        display: isVisible ? 'flex' : 'none',
        backgroundColor: 'white'
      }]}>
        <View style={[{
          paddingTop: 5,
          backgroundColor: 'white'
        }]}>
          {peripheral.brand !== undefined && (
            <Text style={[{ color: Colors.gray }]}>
              Brand: {peripheral.brand}
            </Text>
          )}
          <Text style={[{ color: 'grey' }]}>
            Connectable: {isConnectable() ? 'Yes' : 'No'}
          </Text>
          {peripheral.serviceUUIDs !== undefined && (
            <Text style={[{ color: Colors.gray }]}>
              Service UUIDs: {peripheral.serviceUUIDs.join(', ')}
            </Text>
          )}
          {peripheral.advertising?.manufacturerData?.bytes && (
            <Text style={[{ color: Colors.gray }]}>
              Manufacturer Data: {peripheral.advertising.manufacturerData?.bytes}
            </Text>
          )}
          <Text style={{ color: Colors.gray }}>
            Connected: {peripheral.isConnected ? 'Yes' : 'No'}
          </Text>
          {!peripheral.isConnected && (
            <Text style={{ color: Colors.gray }}>
              Advertisement Count: {peripheral.advertiesmentCount}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingLeft: 40,
    paddingTop: 10,
  },
});

export default ScannedDeviceInfo;
