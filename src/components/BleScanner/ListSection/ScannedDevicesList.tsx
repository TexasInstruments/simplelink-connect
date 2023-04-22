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

import { View } from 'react-native';
import React, { useContext, useMemo } from 'react';
import BleManager from 'react-native-ble-manager';
import ScannedDevice from './ScannedDevice';
import { FilterSortState } from '../../../../context/FilterSortContext';

interface Props {
  peripherals: BleManager.Peripheral[] | [];
  requestConnect: (peripheralId: string) => void;
}

const ScannedDevicesList: React.FC<Props> = ({ peripherals, requestConnect }) => {
  let fsContext = useContext(FilterSortState);

  if(fsContext.filter.rssi.value === '')
  {
    fsContext.filter.rssi.value = '-80'
  }

  let sortedFilteredPeripherals = useMemo(() => {
    let per = peripherals;

    if (fsContext.filter.connectable) {
      console.info('[Filter] By Connectable');

      per = per.filter((a) => a.advertising.isConnectable);
    }

    if (fsContext.filter.app_name.enabled && fsContext.filter.app_name.value !== '') {
      console.info('[Filter] By App Name');

      per = per.filter((a) =>
        a.name
          ?.trim()
          .toLocaleLowerCase()
          .includes(fsContext.filter.app_name.value.trim().toLocaleLowerCase())
      );
    }

    if (fsContext.filter.rssi.enabled && fsContext.filter.rssi.value !== '') {
      console.info('[Filter] By Rssi');

      per = per.filter((a) => {
        return Math.abs(a.rssi) <= Math.abs(parseInt(fsContext.filter.rssi.value));
      });
    }
    if (fsContext.sort.app_name) {
      console.info('[Sort] By App name');
      per = per.sort((a, b) => {
        if (a.name && b.name) {
          if (a.name < b.name) return -1;
          if (a.name > b.name) return 1;

          return 0;
        }
        return 0;
      });
    }

    if (fsContext.sort.rssi) {
      console.info('[Sort] By Rssi');
      per = per.sort((a, b) => {
        let aRssi = Math.abs(a.rssi);
        let bRssi = Math.abs(b.rssi);

        if (aRssi < bRssi) return -1;
        if (aRssi > bRssi) return 1;

        return 0;
      });
    }

    return per;
  }, [
    fsContext.filter.connectable,
    fsContext.filter.app_name.enabled,
    fsContext.filter.app_name.value,
    fsContext.filter.rssi.value,
    fsContext.filter.rssi.enabled,
    fsContext.sort.app_name,
    fsContext.sort.rssi,
    peripherals,
  ]);

  return (
    <View>
      {sortedFilteredPeripherals.map((item, index) => {
        return (
          <ScannedDevice
            peripheral={item}
            key={'scanned-device-' + index}
            requestConnect={requestConnect}
          />
        );
      })}
    </View>
  );
};

export default ScannedDevicesList;
