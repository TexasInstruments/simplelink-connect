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
import { Peripheral } from 'react-native-ble-manager';
import { View } from '../../Themed';
import Colors from '../../../constants/Colors';

interface Props {
  isVisible: boolean;
  peripheral: Peripheral;
}

const ScannedDeviceInfo: React.FC<Props> = ({ isVisible, peripheral }) => {
  let isConnectable = () => {
    if (
      !peripheral?.advertising?.isConnectable ||
      typeof !peripheral?.advertising?.isConnectable == undefined
    )
      return false;

    return true;
  };

  function concatLists(list1: string[] | undefined, list2: string[] | undefined): string {
    if (list1 && list2) {
      return [...new Set(list1.concat(list1))].join(', ');
    }
    if (list1) {
      return list1.join(', ');
    }
    if (list2) {
      return list2.join(', ');
    }
    return '';
  }

  function formatManufacturerData(bytes: number[]): string {
    if (!bytes || bytes.length < 2) return '';

    // react-native-ble-manager bug: uses Integer (4 bytes) instead of Short (2 bytes) for company ID
    // The library stores it as big-endian 4-byte integer: [0, 0, 0, 13] for company ID 13
    // Skip first 2 bytes and read as big-endian
    let offset = 0;
    let companyId = 0;

    if (bytes.length >= 4 && bytes[0] === 0 && bytes[1] === 0) {
      offset = 2;
      // Read as big-endian after skipping first 2 zeros
      companyId = (bytes[offset] << 8) + bytes[offset + 1];
    } else {
      // Standard BLE format: little-endian
      companyId = bytes[0] + (bytes[1] << 8);
    }

    // Remaining bytes are the actual manufacturer data
    const dataBytes = bytes.slice(offset + 2);
    const hexData = dataBytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('');

    return `0x${companyId.toString(16).padStart(4, '0').toUpperCase()}: 0x${hexData}`;
  }

  return (
    <View >
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
          {(peripheral.serviceUUIDs !== undefined || peripheral.advertising?.serviceUUIDs !== undefined) && (
            <Text style={[{ color: Colors.gray }]}>
              Service UUIDs: {concatLists(peripheral.serviceUUIDs || [], peripheral.advertising?.serviceUUIDs || [])}
            </Text>
          )}
          {peripheral.advertising?.manufacturerRawData?.bytes && peripheral.advertising.manufacturerRawData.bytes.length > 0 && (
            <Text style={[{ color: Colors.gray }]}>
              Manufacturer Data: {formatManufacturerData(peripheral.advertising.manufacturerRawData.bytes)}
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
  },
});

export default ScannedDeviceInfo;
